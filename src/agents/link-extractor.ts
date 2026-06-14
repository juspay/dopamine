import { type NeuroLink, NeuroLink as NeuroLinkClass } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { LinksSchema, type Links } from "../schemas/links.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { getThumbnailPath, extractVideoFrames } from "../utils/video.js";
import type { AcquiredAssets } from "../types/index.js";
import type { LaneItem } from "../pipeline/lanes.js";

/** Knowledge base entry shape -- only fields we need. */
interface KnowledgeEntry {
  filename: string;
  error?: string;
}

/** Link entry stored in links_v2.json per video. */
interface LinkEntry {
  name: string;
  url: string | null;
  type: "shown_on_screen" | "mentioned_verbally" | "inferred_from_context";
  description: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// URL validation helpers
// ---------------------------------------------------------------------------

/**
 * Known-good TLDs list is impractical to maintain; instead we reject obvious
 * non-TLDs: all-digit strings (IP octets, port numbers) and single characters.
 * Legitimate TLDs are 2+ alpha chars.
 */
function isValidTld(tld: string): boolean {
  return /^[a-zA-Z]{2,}$/.test(tld);
}

/**
 * Validate an arxiv URL. Accepts:
 *   https://arxiv.org/abs/<numeric-id>   e.g. 2401.12345 or 2401.123456
 *   https://arxiv.org/pdf/<numeric-id>
 *
 * Rejects IDs like "Mano-Technical-Report" — those are hallucinated.
 */
function isValidArxivUrl(url: URL): boolean {
  const pathParts = url.pathname.split("/").filter(Boolean);
  // expect ["abs"|"pdf", "<id>"] or ["abs"|"pdf", "<id>", "<extra>"]
  if (pathParts.length < 2) return true; // bare arxiv.org — fine
  const section = pathParts[0];
  if (section !== "abs" && section !== "pdf") return true; // other arxiv paths — allow
  const id = pathParts[1];
  // Valid arxiv ID: YYMM.NNNNN(vN) where YYMM and NNNNN are digits
  return /^\d{4}\.\d{4,5}(v\d+)?$/.test(id);
}

/**
 * Validate a GitHub URL. GitHub paths take one of these forms:
 *   /owner            — profile
 *   /owner/repo       — repository
 *   /owner/repo/...   — sub-path inside a repo
 *
 * We reject paths where either owner or repo contains characters GitHub
 * disallows (e.g. spaces, brackets, underscores at start, etc.).
 * GitHub usernames: [a-z0-9](?:[a-z0-9-]*[a-z0-9])? (case-insensitive, max 39)
 * GitHub repo names: [a-z0-9_.-]+ (case-insensitive)
 */
function isValidGithubUrl(url: URL): boolean {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return true; // bare github.com — fine
  const owner = parts[0];
  // GitHub username: alphanumeric + hyphens, no leading/trailing hyphen, max 39 chars
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(owner)) return false;
  if (parts.length === 1) return true; // profile page
  const repo = parts[1];
  // GitHub repo name: alphanumeric, hyphens, underscores, dots; max 100 chars
  if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(repo)) return false;
  return true;
}

/**
 * Validate and normalise a URL string extracted by the LLM.
 *
 * Returns the cleaned URL string if valid, or null if the URL is structurally
 * invalid, malformed, or matches a known hallucination pattern.
 *
 * Rules applied:
 *  1. Must parse as a URL with http(s) scheme.
 *  2. Host must have a valid TLD (2+ alpha chars, not all-digits).
 *  3. Host must not be a bare IP address (we trust domain names, not raw IPs
 *     from LLM output — too many false positives from code snippets).
 *  4. Domain-specific path validation (arxiv, github).
 *  5. No whitespace inside the URL.
 */
export function validateAndNormalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Must start with http(s)://
  if (!/^https?:\/\//i.test(trimmed)) return null;

  // Must not contain unencoded spaces (LLM sometimes adds explanatory text)
  if (/\s/.test(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  // Reject bare IP addresses — LLMs hallucinate localhost / 192.168.x.x from code
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return null;

  // Require a dot in the hostname (rejects "localhost", single-word hostnames)
  if (!host.includes(".")) return null;

  // Validate TLD
  const tld = host.split(".").pop() ?? "";
  if (!isValidTld(tld)) return null;

  // Domain-specific path validation
  if (host === "arxiv.org" || host.endsWith(".arxiv.org")) {
    if (!isValidArxivUrl(parsed)) return null;
  }
  if (host === "github.com") {
    if (!isValidGithubUrl(parsed)) return null;
  }

  // Return a cleaned version: remove trailing dot from pathname if any
  return parsed.href.replace(/\.$/, "");
}

const LINK_EXTRACT_PROMPT = `
Watch this video carefully and extract EVERY link, URL, website, tool, product, or resource that is:
1. Shown on screen (URLs in browser bars, slides, code editors, terminal output)
2. Mentioned verbally (speaker says "go to example.com" or "check out Tool X")
3. Inferable from context (a known tool/product is being demonstrated)

CRITICAL URL RULES — follow these exactly:
- For "shown_on_screen": set url only to URLs you can literally READ on screen. Copy the URL character by character from what is visible. Do NOT guess or reconstruct.
- For "mentioned_verbally": set url only if the speaker explicitly states a full URL or domain (e.g. "go to example.com"). Do NOT invent a URL from the product name.
- For "inferred_from_context": always set url to null UNLESS the product's homepage URL is universally well-known (e.g. github.com, python.org). Do NOT guess paths or repositories.
- NEVER fabricate arxiv paper IDs, GitHub repository paths, or any URL path segment that is not visible on screen or explicitly stated.
- If you are uncertain about any part of the URL, set url to null.

For each link provide:
- name: The tool/product/resource name
- url: The full https:// URL literally seen/stated, or null if uncertain
- type: "shown_on_screen", "mentioned_verbally", or "inferred_from_context"
- description: What it is and why it's mentioned
- timestamp: Approximate timestamp in the video

Be exhaustive in finding resources. Be conservative with URLs — a null url is far better than a wrong one.
Return ONLY valid JSON matching the schema provided. No markdown fences.`;

export interface LinkRequest {
  input: { text: string; images?: Buffer[]; files?: string[] };
}

/** frames → images; else transcript → text-only; else thumbnail/video → files; else text-only. */
export function buildLinkRequest(
  promptText: string,
  assets: AcquiredAssets,
  frames: Buffer[] | null,
): LinkRequest {
  if (frames !== null && frames.length > 0) return { input: { text: promptText, images: frames } };
  if (assets.transcriptText !== null) return { input: { text: promptText + "\n\nTranscript:\n" + assets.transcriptText } };
  const filePath = assets.thumbnailPath ?? assets.videoPath;
  if (filePath === null) return { input: { text: promptText } };
  return { input: { text: promptText, files: [path.resolve(filePath)] } };
}

export async function runLinkExtractAgent(neurolink: NeuroLink, laneItems?: LaneItem[]): Promise<void> {
  // Load knowledge base to know which videos to process
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(
    CONFIG.STATE.KNOWLEDGE_BASE, {}
  );

  // Load existing links (may include error field from failed extractions)
  type LinksWithError = Links & { error?: string };
  const linksState = await loadState<Record<string, LinksWithError>>(
    CONFIG.STATE.LINKS_V2, {}
  );

  // Lane assets (covers transcript-only YouTube items not present in VIDEOS_DIR).
  const assetsById = new Map<string, AcquiredAssets>((laneItems ?? []).map((l) => [l.item.id, l.assets]));

  // Process all videos in the knowledge base (that don't have errors)
  const kbVideos = Object.entries(knowledgeBase).filter(
    ([, entry]) => !entry.error
  );

  console.log(`Link extraction: ${kbVideos.length} videos from knowledge base`);

  let extracted = 0, skipped = 0, errors = 0;

  for (const [i, [filename]] of kbVideos.entries()) {
    const logPrefix = `[${i + 1}/${kbVideos.length}]`;

    // Resume mode -- skip if already extracted successfully (no error field)
    const existing = linksState[filename];
    if (existing && !existing.error) {
      skipped++;
      console.log(`${logPrefix} SKIP (already extracted): ${filename}`);
      continue;
    }
    if (existing?.error) {
      console.log(`${logPrefix} RETRY (previous error): ${filename}`);
    }

    // Resolve assets: prefer the lane (covers transcript-only YouTube), else legacy IG file.
    let assets: AcquiredAssets;
    let frames: Buffer[] | null = null;
    const laneAssets = assetsById.get(filename);
    if (laneAssets) {
      assets = laneAssets;
      if (assets.videoPath) {
        const f = await extractVideoFrames(assets.videoPath, 10);
        frames = f.length > 0 ? f : null;
      }
    } else {
      const videoPath = path.join(CONFIG.VIDEOS_DIR, filename);
      try {
        await fs.access(videoPath);
      } catch {
        console.warn(`${logPrefix} SKIP (file not found): ${videoPath}`);
        continue;
      }
      const { size } = await fs.stat(videoPath);
      if (size <= CONFIG.VIDEO_SIZE_THRESHOLD_BYTES) {
        const f = await extractVideoFrames(videoPath, 10);
        frames = f.length > 0 ? f : null;
      }
      const thumbnailPath = frames === null ? (await getThumbnailPath(filename) ?? videoPath) : null;
      assets = { videoPath, thumbnailPath, transcriptText: null };
    }

    console.log(`${logPrefix} Extracting links: ${filename}`);

    const req = buildLinkRequest(LINK_EXTRACT_PROMPT, assets, frames);
    const result = await exponentialBackoff(async () => {
      // Fresh NeuroLink instance per video — shared instances accumulate keyframes
      // across calls, overflowing Vertex's 16-image limit.
      const nl = new NeuroLinkClass();
      const response = await nl.generate({
        input: req.input,
        provider: "vertex",
        model:    CONFIG.MODEL,
        schema:   LinksSchema,
        output:   { format: "json" },
        disableTools: true,  // REQUIRED: Gemini rejects tools + JSON schema together
        maxTokens: 4096,
        timeout: "120s",
      });
      return LinksSchema.parse(safeJsonParse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      // Post-extraction URL validation: reject structurally invalid / hallucinated URLs.
      // A null url is far safer than a wrong one — the resolver fills nulls in later
      // using text-only prompts that don't hallucinate path segments.
      let invalidatedCount = 0;
      const validated: Links = {
        links: result.value.links.map((link) => {
          const cleaned = validateAndNormalizeUrl(link.url);
          if (link.url !== null && cleaned === null) {
            invalidatedCount++;
            console.log(`  -> INVALID URL nullified [${link.name}]: ${link.url}`);
          }
          return { ...link, url: cleaned };
        }),
      };
      if (invalidatedCount > 0) {
        console.log(`  -> ${invalidatedCount} URL(s) invalidated (hallucinated/malformed)`);
      }
      linksState[filename] = validated;
      extracted++;
      console.log(`  -> ${validated.links.length} links found`);
    } else {
      linksState[filename] = { links: [], error: result.error };
      errors++;
      console.error(`  -> ERROR: ${result.error?.slice(0, 100)}`);
    }

    // Write after every item -- resume mode guarantee
    await saveState(CONFIG.STATE.LINKS_V2, linksState);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nLink extraction done. Extracted: ${extracted}, Skipped: ${skipped}, Errors: ${errors}`);
}
