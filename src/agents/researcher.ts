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

/** Research result for a single actionable item. */
export interface ResearchItemResult {
  item_name: string;
  item_type: string;
  url_status: "live" | "dead" | "redirect" | "no_url" | "timeout" | "error";
  url_checked: string;
  github_info: string;       // stars, last commit, or "not_a_github_repo"
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
const URL_TIMEOUT_MS = parseInt(process.env.URL_TIMEOUT_MS ?? "10000", 10);

/** Maximum number of redirects to follow before treating as an error. */
const MAX_REDIRECTS = parseInt(process.env.MAX_REDIRECTS ?? "10", 10);

/**
 * Follow redirects manually so we can enforce a redirect limit and track each hop.
 * `fetch` with `redirect: "follow"` does not expose intermediate URLs on all runtimes,
 * so we follow manually with `redirect: "manual"`.
 */
async function fetchWithRedirects(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; finalUrl: string; redirected: boolean }> {
  let currentUrl = url;
  let redirected = false;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method,
        signal: controller.signal,
        redirect: "manual",             // handle redirects ourselves
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DopamineBot/1.0)" },
      });
      clearTimeout(timer);

      // 3xx → follow the Location header
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return { ok: false, status: response.status, finalUrl: currentUrl, redirected };
        }
        // Resolve relative redirects
        currentUrl = new URL(location, currentUrl).href;
        redirected = true;
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        finalUrl: currentUrl,
        redirected,
      };
    } catch (err) {
      clearTimeout(timer);
      throw err; // let caller handle abort / network errors
    }
  }

  // Exceeded max redirects
  return { ok: false, status: 0, finalUrl: currentUrl, redirected: true };
}

/**
 * Check if a URL is live by doing a HEAD/GET request with configurable timeout
 * and explicit redirect following.
 */
async function checkUrl(url: string): Promise<{ status: string; finalUrl: string }> {
  if (!url || url === "" || !url.startsWith("http")) {
    return { status: "no_url", finalUrl: "" };
  }
  try {
    const result = await fetchWithRedirects(url, "HEAD", URL_TIMEOUT_MS);
    if (result.ok) {
      const status = result.redirected ? "redirect" : "live";
      if (result.redirected) {
        console.log(`    URL redirected: ${url} -> ${result.finalUrl}`);
      }
      return { status, finalUrl: result.finalUrl };
    }
    return { status: "dead", finalUrl: result.finalUrl };
  } catch (err) {
    const msg = String(err);
    if (msg.includes("abort") || msg.includes("timeout") || msg.includes("AbortError")) {
      console.warn(`    URL timeout (${URL_TIMEOUT_MS}ms): ${url}`);
      return { status: "timeout", finalUrl: url };
    }
    // Try GET as fallback (some servers reject HEAD)
    try {
      const result = await fetchWithRedirects(url, "GET", URL_TIMEOUT_MS);
      if (result.ok) {
        const status = result.redirected ? "redirect" : "live";
        if (result.redirected) {
          console.log(`    URL redirected: ${url} -> ${result.finalUrl}`);
        }
        return { status, finalUrl: result.finalUrl };
      }
      return { status: "dead", finalUrl: result.finalUrl };
    } catch {
      return { status: "error", finalUrl: url };
    }
  }
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
  items: Array<{ name: string; type: string; url: string; description: string; verification_steps: string[] }>,
): Promise<ResearchItemResult[]> {
  const results: ResearchItemResult[] = [];
  const now = new Date().toISOString();

  // 1. Check all URLs in parallel
  const urlChecks = await Promise.all(
    items.map(item => checkUrl(item.url))
  );

  // 2. Do web research via NeuroLink (no schema — free text with websearch grounding)
  let webResearchText = "";
  const researchResult = await exponentialBackoff(async () => {
    const response = await neurolink.generate({
      input: {
        text: buildResearchPrompt(items),
      },
      provider: "vertex",
      model:    CONFIG.MODEL,
      // No schema — free text output with web search grounding
      // No disableTools — we WANT websearch grounding
      maxTokens: 8192,
      timeout: "120s",
    });
    return response.content;
  }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

  if (researchResult.success) {
    webResearchText = researchResult.value;
  } else {
    webResearchText = `Research failed: ${researchResult.error}`;
  }

  // 3. Parse research text per item (split by numbered sections)
  const sections = splitResearchByItem(webResearchText, items.length);

  // 4. Build result for each item
  for (const [i, item] of items.entries()) {
    const urlCheck = urlChecks[i];
    const section = sections[i] || "No research data available.";

    // Extract GitHub info if URL is a GitHub repo
    let githubInfo = "not_a_github_repo";
    if (item.url && item.url.includes("github.com")) {
      githubInfo = extractGitHubInfo(section);
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
      url_status: urlCheck.status as ResearchItemResult["url_status"],
      url_checked: urlCheck.finalUrl,
      github_info: githubInfo,
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
