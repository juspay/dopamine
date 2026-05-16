import { type NeuroLink } from "@juspay/neurolink";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";

/** Link entry as stored in links_v2.json. */
interface LinkEntry {
  name: string;
  url: string | null;
  type: string;
  description: string;
  timestamp: string;
}

/**
 * Check if a URL needs resolution.
 * Returns true if url is null, empty, clearly partial, or looks incomplete.
 */
function needsResolution(url: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "null") return true;
  // Already a valid-looking URL
  if (/^https?:\/\/.+\..+/.test(trimmed)) return false;
  // Partial or incomplete
  return true;
}

/**
 * Try to fix obvious partial URLs without making an API call.
 * Mirrors resolve_links.py:try_fix_partial_url
 */
function tryFixPartialUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "null") return null;

  // Already has protocol
  if (/^https?:\/\//.test(trimmed)) return null;

  // Looks like a domain (has a dot, no spaces)
  if (/^[\w.-]+\.\w{2,}(\/\S*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return null;
}

/**
 * Garbage names that can never have a real URL — extraction artifacts from Gemini.
 * Return true if the name should be skipped entirely (not sent to API).
 */
function isGarbageName(name: string): boolean {
  const n = name.trim();
  // HTML tags
  if (/^<[a-z]+>$/i.test(n)) return true;
  // Long base64/hash strings (image filenames etc.)
  if (n.length > 60 && /^[A-Za-z0-9+/=_-]+(\.(jpg|png|gif|jpeg|webp))?$/i.test(n)) return true;
  // Instagram "Profile Image" extracted as a link
  if (/profile\s+image$/i.test(n)) return true;
  // Bare hashtags / generic terms with no URL meaning
  if (/^(githubprojects|KM\s+\d+|AQPY22)/.test(n)) return true;
  return false;
}

/** Instagram username pattern: letters, digits, underscores, dots — no spaces. */
const INSTAGRAM_HANDLE = /^@?([a-zA-Z0-9._]{1,30})$/;

/**
 * If the name is an Instagram handle (based on name pattern + description context),
 * return the Instagram profile URL directly without an API call.
 */
function tryResolveInstagramHandle(name: string, description: string): string | null {
  const n = name.trim();
  const desc = (description ?? "").toLowerCase();

  // Explicit @handle format
  const atMatch = n.match(/^@([a-zA-Z0-9._]+)$/);
  if (atMatch) return `https://www.instagram.com/${atMatch[1]}/`;

  // Handle-shaped name (no spaces, fits pattern) + description mentions Instagram/social
  const isSocialDesc = /instagram|social media|creator|handle|profile|account|username|personal brand/.test(desc);
  if (isSocialDesc && INSTAGRAM_HANDLE.test(n)) {
    return `https://www.instagram.com/${n}/`;
  }

  // ALL_CAPS or mixed-case handles like "_ASH_.KING" — normalize to lowercase and check
  const lower = n.toLowerCase();
  if (isSocialDesc && INSTAGRAM_HANDLE.test(lower)) {
    return `https://www.instagram.com/${lower}/`;
  }

  return null;
}

export async function runLinkResolverAgent(neurolink: NeuroLink): Promise<void> {
  const links = await loadState<Record<string, { links: LinkEntry[] }>>(
    CONFIG.STATE.LINKS_V2, {}
  );

  // --- First pass: fix obvious cases without API ---
  let fixedLocally = 0, removedGarbage = 0;
  const needsApi: Array<{ fname: string; idx: number; link: LinkEntry }> = [];

  for (const [fname, entry] of Object.entries(links)) {
    // Filter out garbage entries (bad Gemini extractions) — process remaining in-place
    const cleaned = (entry.links ?? []).filter(link => {
      if (isGarbageName(link.name)) {
        removedGarbage++;
        console.log(`Removed garbage: ${link.name}`);
        return false;
      }
      return true;
    });
    links[fname].links = cleaned;

    for (const [idx, link] of links[fname].links.entries()) {
      if (!needsResolution(link.url)) continue;

      // Try Instagram handle resolution (no API needed)
      const ig = tryResolveInstagramHandle(link.name, link.description);
      if (ig) {
        links[fname].links[idx].url = ig;
        fixedLocally++;
        console.log(`Instagram handle: ${link.name} -> ${ig}`);
        continue;
      }

      // Try fixing partial URL
      const fixed = tryFixPartialUrl(link.url);
      if (fixed) {
        links[fname].links[idx].url = fixed;
        fixedLocally++;
        console.log(`Fixed locally: ${link.name} -> ${fixed}`);
      } else {
        needsApi.push({ fname, idx, link });
      }
    }
  }

  // Deduplicate by normalized name
  const uniqueNames = new Map<string, LinkEntry>();
  for (const { link } of needsApi) {
    const key = link.name.trim().toLowerCase();
    if (!uniqueNames.has(key)) uniqueNames.set(key, link);
  }

  console.log(`Removed garbage: ${removedGarbage}, Fixed locally: ${fixedLocally}, Unique names for API: ${uniqueNames.size}`);

  // Build a reverse index: nameKey -> all (fname, idx) entries needing it
  const nameToEntries = new Map<string, Array<{ fname: string; idx: number }>>();
  for (const { fname, idx, link } of needsApi) {
    const key = link.name.trim().toLowerCase();
    if (!nameToEntries.has(key)) nameToEntries.set(key, []);
    nameToEntries.get(key)!.push({ fname, idx });
  }

  let resolvedCount = 0, failedCount = 0, saveEvery = 10, saveCounter = 0;

  for (const [i, [nameKey, link]] of [...uniqueNames.entries()].entries()) {
    const context = [
      link.description ? `Description: ${link.description}` : "",
      link.url ? `Possible hint: ${link.url}` : "",
    ].filter(Boolean).join(". ");

    const prompt =
      `What is the official website URL for "${link.name}"? ${context}. ` +
      `Return ONLY the full URL starting with https://, nothing else. ` +
      `If it's a GitHub project return the GitHub URL. ` +
      `If you cannot find an exact URL return your best guess. One URL only.`;

    console.log(`\n[${i + 1}/${uniqueNames.size}] Resolving: ${link.name}`);

    // Use the text-only gemini-2.5-flash here, not CONFIG.MODEL (image-preview).
    // The image-preview model routes link-resolver prompts through executeImageGeneration
    // which returns empty parts when Vertex's safety filter trips on benign descriptions
    // (e.g. "Personal account inferred from filename" triggered "No content parts").
    // 2.5-flash is text-only and bulletproof for this use case.
    let resolved: string | null = null;
    const r1 = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: { text: prompt },
        provider: "vertex",
        model:    "gemini-2.5-flash",
        disableTools: true,
        maxTokens: 256,
        timeout: "30s",
      });
      const match = response.content.match(/https?:\/\/[^\s<>"')]+/);
      return match?.[0]?.replace(/\.$/, "") ?? null;
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (r1.success && r1.value) resolved = r1.value;

    if (resolved) {
      // Apply immediately to all entries sharing this name
      const entries = nameToEntries.get(nameKey) ?? [];
      for (const { fname, idx } of entries) {
        links[fname].links[idx].url = resolved;
      }
      resolvedCount++;
      console.log(`  Resolved: ${resolved}`);
    } else {
      failedCount++;
      console.log(`  FAILED to resolve`);
    }

    // Save incrementally so progress survives restarts (resume mode)
    saveCounter++;
    if (saveCounter >= saveEvery) {
      await saveState(CONFIG.STATE.LINKS_V2, links);
      saveCounter = 0;
    }

    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  // Final save
  await saveState(CONFIG.STATE.LINKS_V2, links);
  console.log(`\nLink resolution complete. Resolved: ${resolvedCount}, Failed: ${failedCount}`);
}
