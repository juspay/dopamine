/**
 * ResearchAgent — Step 13
 *
 * For each actionable item from the AnalyzerAgent, launches parallel research:
 * - Checks if URLs are live (fetch with timeout)
 * - Checks if GitHub repos exist and are active
 * - Searches web for reviews/alternatives
 * - Verifies claims made in the video
 *
 * Uses NeuroLink with websearchGrounding (no schema, free text).
 * Processes items in parallel batches of 5.
 * State: videos/research.json
 */

import { type NeuroLink } from "@juspay/neurolink";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import type { AnalysisEntry } from "./analyzer.js";
import { checkUrls } from "../utils/url-check.js";

/** Research result for a single actionable item. */
export interface ResearchItemResult {
  item_name: string;
  item_type: string;
  /**
   * Live-check result from the shared url-check util.
   *
   * - "live"         2xx response
   * - "redirect"     followed one or more 3xx hops, final response was 2xx
   * - "protected"    401/403/405/429/451 — bot-blocked but endpoint exists; treat as live for display
   * - "dead"         404/410 — definitively gone
   * - "server_error" 5xx — site up but erroring; treat as transient
   * - "error"        DNS/network failure (ENOTFOUND etc.) — NOT dead; may be transient
   * - "timeout"      request timed out
   * - "no_url"       empty / non-http input
   */
  url_status: "live" | "dead" | "redirect" | "protected" | "server_error" | "no_url" | "timeout" | "error";
  url_checked: string;
  github_info: string;       // stars, last commit, or "not_a_github_repo"
  registry_info: string;     // factual data from npm/PyPI/GitHub APIs
  web_research: string;      // free text from Gemini web search
  claim_verification: string; // verified / unverified / partially_verified
  alternatives: string;      // alternative tools/approaches found
  last_checked: string;
}

/** Research state for a single video. */
export interface ResearchEntry {
  filename: string;
  items: ResearchItemResult[];
  researched_at: string;
  error?: string;
}

const BATCH_SIZE = 5;

/** Configurable URL check timeout — override via URL_TIMEOUT_MS env var. */
const URL_TIMEOUT_MS = parseInt(process.env.URL_TIMEOUT_MS ?? "12000", 10);

/**
 * Detect hallucinated responses from the AI model.
 * Returns true if the text contains patterns that indicate the model hallucinated
 * a "currently researching" process description instead of real data.
 */
function isHallucinated(text: string): boolean {
  const hallucinationPatterns = [
    // Model "thinking out loud" instead of answering
    "I'm currently focused on",
    "I'm gathering information",
    "I'm adapting my approach",
    "I'm utilizing external search",
    "I'm currently",
    "I am now dissecting",
    "I am now formulating",
    "I am now refining",
    "I am now focusing",
    "I am now",
    "Examining the Query",
    "Examining User Intent",
    "Refining Search Parameters",
    "Assessing Current Information",
    "I'm focused on grasping",
    "I'm breaking down",
    "I'm focusing on",
    "I'm focused on",
    "grasping the user's",
    "I'll prioritize",
    "tool malfunction",
    "I'm digging into",
    "I'm digging",
    "I am pinpointed",
    "I am starting with",
    "I'm looking at how",
    "I'm looking at",
    "I'm starting with",
    "Delving into Specifics",
    "Delving into",
    "Initial search",
    "Initial searches",
    "I am unable to browse",
    "I am unable to perform",
    "I am unable to verify",
    "I cannot browse",
    "due to a technical limitation",
    "internal configuration issue with",
    "credentials are not configured",
    // NeuroLink/Vertex error messages that should never appear in research output
    "Check Google Cloud credentials",
    "Verify project ID and location",
    "Ensure Vertex AI API is enabled",
    "Vertex AI Provider Error",
    "Image generation completed but model returned text",
    // Image-preview model leaking its image-generation behavior
    "Generated image using",
    "Generated image with",
  ];
  return hallucinationPatterns.some(pattern => text.includes(pattern));
}

/**
 * Query public package registries (npm, PyPI, GitHub) for factual metadata.
 * No AI involved — these are direct REST API calls.
 */
async function checkPackageRegistry(
  url: string,
  name: string,
  installCommand: string,
): Promise<string> {
  const timeout = 10_000;

  // Helper to fetch JSON with a timeout
  async function fetchJson(apiUrl: string, headers: Record<string, string> = {}): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "DopamineBot/1.0", ...headers },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // GitHub repo check
  if (url && url.includes("github.com")) {
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
      if (match) {
        const [, owner, repo] = match;
        const cleanRepo = repo.replace(/\.git$/, "");
        const data = await fetchJson(`https://api.github.com/repos/${owner}/${cleanRepo}`) as Record<string, unknown>;
        const stars = data.stargazers_count ?? 0;
        const forks = data.forks_count ?? 0;
        const issues = data.open_issues_count ?? 0;
        const updatedAt = (data.updated_at as string | undefined)?.slice(0, 10) ?? "unknown";
        const archived = data.archived ? " [ARCHIVED]" : "";
        const desc = data.description ? ` — ${String(data.description).slice(0, 100)}` : "";
        return `GitHub: ${stars}⭐ ${forks} forks, ${issues} open issues, last updated ${updatedAt}${archived}${desc}`;
      }
    } catch {
      // Fall through
    }
    return "";
  }

  // npm package check
  const isNpm = (url && url.includes("npmjs.com")) ||
    (installCommand && (installCommand.includes("npm install") || installCommand.includes("npm i ")));
  if (isNpm) {
    try {
      // Extract package name from URL or install command
      let packageName = name;
      if (url && url.includes("npmjs.com")) {
        const match = url.match(/npmjs\.com\/package\/([^/?#]+)/);
        if (match) packageName = match[1];
      } else if (installCommand) {
        const match = installCommand.match(/npm\s+i(?:nstall)?\s+([^\s]+)/);
        if (match) packageName = match[1];
      }
      const data = await fetchJson(`https://registry.npmjs.org/${packageName}`) as Record<string, unknown>;
      const latest = (data["dist-tags"] as Record<string, string> | undefined)?.latest ?? "unknown";
      const desc = (data.description as string | undefined) ?? "";
      const homepage = (data.homepage as string | undefined) ?? "";
      // Weekly downloads endpoint
      let downloads = "";
      try {
        const dlData = await fetchJson(`https://api.npmjs.org/downloads/point/last-week/${packageName}`) as Record<string, unknown>;
        if (dlData.downloads) downloads = `, ${dlData.downloads}/week`;
      } catch { /* optional */ }
      return `npm: ${packageName} v${latest}${downloads}${desc ? " — " + desc.slice(0, 100) : ""}${homepage ? " (" + homepage + ")" : ""}`;
    } catch {
      // Fall through
    }
    return "";
  }

  // PyPI package check
  const isPypi = (url && url.includes("pypi.org")) ||
    (installCommand && installCommand.includes("pip install"));
  if (isPypi) {
    try {
      let packageName = name;
      if (url && url.includes("pypi.org")) {
        const match = url.match(/pypi\.org\/project\/([^/?#]+)/);
        if (match) packageName = match[1];
      } else if (installCommand) {
        const match = installCommand.match(/pip\s+install\s+([^\s]+)/);
        if (match) packageName = match[1];
      }
      const data = await fetchJson(`https://pypi.org/pypi/${packageName}/json`) as Record<string, unknown>;
      const info = data.info as Record<string, unknown> | undefined;
      const version = info?.version ?? "unknown";
      const summary = info?.summary ? " — " + String(info.summary).slice(0, 100) : "";
      return `PyPI: ${packageName} v${version}${summary}`;
    } catch {
      // Fall through
    }
    return "";
  }

  return "";
}


/**
 * Build a research prompt for a batch of items.
 */
function buildResearchPrompt(items: Array<{ name: string; type: string; url: string; description: string }>): string {
  const itemDescriptions = items.map((item, i) =>
    `${i + 1}. "${item.name}" (type: ${item.type})
   URL: ${item.url || "N/A"}
   Description: ${item.description}`
  ).join("\n\n");

  return `Research the following tools/techniques and provide findings for each one.

For each item, I need:
1. Is this tool/technique still actively maintained and recommended?
2. What are the community opinions (positive and negative)?
3. Are there better alternatives available now?
4. Do the claims about this tool appear accurate?

Items to research:

${itemDescriptions}

Provide a detailed response for each item, clearly labeled by number. Include specific evidence like GitHub stars, recent commits, community reviews, etc.`;
}

/**
 * Process a batch of items: check URLs + web research.
 */
async function processBatch(
  neurolink: NeuroLink,
  filename: string,
  items: Array<{ name: string; type: string; url: string; description: string; verification_steps: string[]; install_command?: string }>,
): Promise<ResearchItemResult[]> {
  const results: ResearchItemResult[] = [];
  const now = new Date().toISOString();

  // 1. Check all URLs via the shared util (correct UA, 403→protected not dead,
  //    DNS errors→"error" not "dead").  checkUrls deduplicates internally.
  const urlMap = await checkUrls(
    items.map(item => item.url),
    { timeoutMs: URL_TIMEOUT_MS, retries: 1 },
  );
  const urlChecks = items.map(item => {
    const r = urlMap.get(item.url);
    return {
      status: (r?.status ?? "no_url") satisfies ResearchItemResult["url_status"],
      finalUrl: r?.finalUrl ?? item.url,
    };
  });

  // 2. Query package registries in parallel (factual, no AI)
  const registryInfos = await Promise.all(
    items.map(item => checkPackageRegistry(item.url, item.name, item.install_command ?? "").catch(() => ""))
  );

  // 3. Do web research via NeuroLink with Google Search grounding.
  // output:{format:"text"} forces routing through the standard text path (instead of
  // executeImageGeneration) on dual-mode image-preview models. enabledToolNames lets
  // the model actually call websearchGrounding to fetch live data.
  let webResearchText = "";
  const researchResult = await exponentialBackoff(async () => {
    const response = await neurolink.generate({
      input: {
        text: buildResearchPrompt(items),
      },
      provider: "vertex",
      model:    CONFIG.MODEL,
      output:   { format: "text" },
      enabledToolNames: ["websearchGrounding"],
      maxTokens: 8192,
      timeout: "180s",
    });
    return response.content;
  }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

  if (researchResult.success) {
    webResearchText = researchResult.value;
    // Detect hallucinated responses and discard them
    if (isHallucinated(webResearchText)) {
      console.warn(`    WARNING: Hallucinated web research detected for ${filename} — discarding`);
      webResearchText = "";
    }
  } else {
    // Don't save error messages into the research field — they pollute downstream
    // verification. Leave empty so the entry is treated as having no research data.
    console.warn(`    Research failed for ${filename}: ${researchResult.error}`);
    webResearchText = "";
  }

  // 4. Parse research text per item (split by numbered sections)
  const sections = splitResearchByItem(webResearchText, items.length);

  // 5. Build result for each item
  for (const [i, item] of items.entries()) {
    const urlCheck = urlChecks[i];
    const registryInfo = registryInfos[i] ?? "";
    const section = sections[i] || "No research data available.";

    // Use real GitHub API data from registryInfo if available; fall back to text parsing
    let githubInfo = "not_a_github_repo";
    if (item.url && item.url.includes("github.com")) {
      if (registryInfo) {
        githubInfo = registryInfo;
      } else {
        githubInfo = extractGitHubInfo(section);
      }
    }

    // Extract claim verification
    let claimVerification = "unverified";
    const sectionLower = section.toLowerCase();
    if (sectionLower.includes("verified") || sectionLower.includes("accurate") || sectionLower.includes("confirmed")) {
      claimVerification = "verified";
    } else if (sectionLower.includes("partially") || sectionLower.includes("some")) {
      claimVerification = "partially_verified";
    } else if (sectionLower.includes("outdated") || sectionLower.includes("deprecated") || sectionLower.includes("false")) {
      claimVerification = "unverified";
    }

    // Extract alternatives
    let alternatives = "";
    const altMatch = section.match(/(?:alternative|instead|replacement|better)[s]?[:\s]+([^\n.]+)/i);
    if (altMatch) {
      alternatives = altMatch[1].trim();
    }

    results.push({
      item_name: item.name,
      item_type: item.type,
      url_status: urlCheck.status,
      url_checked: urlCheck.finalUrl,
      github_info: githubInfo,
      registry_info: registryInfo,
      web_research: section.slice(0, 2000), // Cap at 2000 chars
      claim_verification: claimVerification,
      alternatives,
      last_checked: now,
    });
  }

  return results;
}

/**
 * Split the research text into sections per item.
 */
function splitResearchByItem(text: string, count: number): string[] {
  const sections: string[] = [];

  for (let i = 1; i <= count; i++) {
    // Try to find section boundaries like "1." or "**1." or "Item 1:" etc.
    const startPatterns = [
      new RegExp(`(?:^|\\n)\\s*\\*{0,2}${i}[\\.\\)]\\s`, "m"),
      new RegExp(`(?:^|\\n)\\s*Item\\s+${i}[:\\s]`, "mi"),
    ];
    const endPatterns = [
      new RegExp(`(?:^|\\n)\\s*\\*{0,2}${i + 1}[\\.\\)]\\s`, "m"),
      new RegExp(`(?:^|\\n)\\s*Item\\s+${i + 1}[:\\s]`, "mi"),
    ];

    let startIdx = 0;
    for (const pattern of startPatterns) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        startIdx = match.index;
        break;
      }
    }

    let endIdx = text.length;
    if (i < count) {
      for (const pattern of endPatterns) {
        const match = text.match(pattern);
        if (match && match.index !== undefined) {
          endIdx = match.index;
          break;
        }
      }
    }

    sections.push(text.slice(startIdx, endIdx).trim());
  }

  // Fallback: if we got no useful splits, just divide evenly
  if (sections.every(s => s === text.trim()) && count > 1) {
    const chunkSize = Math.ceil(text.length / count);
    return Array.from({ length: count }, (_, i) =>
      text.slice(i * chunkSize, (i + 1) * chunkSize).trim()
    );
  }

  return sections;
}

/**
 * Extract GitHub info from research text.
 */
function extractGitHubInfo(text: string): string {
  const parts: string[] = [];

  const starsMatch = text.match(/(\d[\d,.]*k?)\s*stars/i);
  if (starsMatch) parts.push(`${starsMatch[1]} stars`);

  const commitMatch = text.match(/(?:last|latest|recent)\s*commit[:\s]*([^\n,]+)/i);
  if (commitMatch) parts.push(`last commit: ${commitMatch[1].trim()}`);

  const archivedMatch = text.match(/archived|read-only|deprecated/i);
  if (archivedMatch) parts.push("ARCHIVED/DEPRECATED");

  return parts.length > 0 ? parts.join(", ") : "github_repo_mentioned";
}

export async function runResearchAgent(neurolink: NeuroLink): Promise<void> {
  console.log("\n=== ResearchAgent (Step 13) ===");

  // Load analysis state
  const analysisState = await loadState<Record<string, AnalysisEntry>>(
    CONFIG.STATE.ANALYSIS, {}
  );

  // Load existing research state (resume mode)
  const researchState = await loadState<Record<string, ResearchEntry>>(
    CONFIG.STATE.RESEARCH, {}
  );

  const entries = Object.entries(analysisState).filter(
    ([, entry]) => !entry.error && entry.actionable_items.length > 0
  );

  console.log(`Research: ${entries.length} videos with actionable items`);

  let researched = 0, skipped = 0, errors = 0;

  for (const [i, [filename, analysis]] of entries.entries()) {
    const logPrefix = `[${i + 1}/${entries.length}]`;

    // Resume mode — skip if already researched without error
    if (filename in researchState && !researchState[filename].error) {
      skipped++;
      console.log(`${logPrefix} SKIP (already researched): ${filename}`);
      continue;
    }

    console.log(`${logPrefix} Researching: ${filename}`);
    console.log(`  Items: ${analysis.actionable_items.length}`);

    try {
      const allItems = analysis.actionable_items.map(item => ({
        name: item.name,
        type: item.type,
        url: item.url,
        description: item.description,
        verification_steps: item.verification_steps,
        install_command: item.install_command ?? "",
      }));

      const allResults: ResearchItemResult[] = [];

      // Process in batches of BATCH_SIZE
      for (let batchStart = 0; batchStart < allItems.length; batchStart += BATCH_SIZE) {
        const batch = allItems.slice(batchStart, batchStart + BATCH_SIZE);
        console.log(`  Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: researching ${batch.length} items...`);

        const batchResults = await processBatch(neurolink, filename, batch);
        allResults.push(...batchResults);

        // Rate limit between batches
        if (batchStart + BATCH_SIZE < allItems.length) {
          await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
        }
      }

      researchState[filename] = {
        filename,
        items: allResults,
        researched_at: new Date().toISOString(),
      };
      researched++;

      const liveUrls = allResults.filter(r => r.url_status === "live" || r.url_status === "redirect").length;
      const deadUrls = allResults.filter(r => r.url_status === "dead").length;
      console.log(`  -> ${allResults.length} items researched, ${liveUrls} URLs live, ${deadUrls} dead`);
    } catch (err) {
      researchState[filename] = {
        filename,
        items: [],
        researched_at: new Date().toISOString(),
        error: String(err),
      };
      errors++;
      console.error(`  -> ERROR: ${String(err).slice(0, 200)}`);
    }

    // Write after every video — resume mode guarantee
    await saveState(CONFIG.STATE.RESEARCH, researchState);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nResearch done. Researched: ${researched}, Skipped: ${skipped}, Errors: ${errors}`);
}
