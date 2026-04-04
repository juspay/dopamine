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

export async function runLinkResolverAgent(neurolink: NeuroLink): Promise<void> {
  const links = await loadState<Record<string, { links: LinkEntry[] }>>(
    CONFIG.STATE.LINKS_V2, {}
  );

  // --- First pass: fix obvious partial URLs without API (mirrors resolve_links.py:try_fix_partial_url) ---
  let fixedLocally = 0;
  const needsApi: Array<{ fname: string; idx: number; link: LinkEntry }> = [];

  for (const [fname, entry] of Object.entries(links)) {
    for (const [idx, link] of (entry.links ?? []).entries()) {
      if (!needsResolution(link.url)) continue;
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

  console.log(`Fixed locally: ${fixedLocally}, Unique names for API: ${uniqueNames.size}`);

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

    // First attempt: with websearchGrounding (built-in tool, active when disableTools not set)
    let resolved: string | null = null;
    const r1 = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: { text: prompt },
        provider: "vertex",
        model:    CONFIG.MODEL,
        // No schema, no disableTools -- websearchGrounding is available
        maxTokens: 256,
        timeout: "30s",
      });
      const match = response.content.match(/https?:\/\/[^\s<>"')]+/);
      return match?.[0]?.replace(/\.$/, "") ?? null;
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (r1.success && r1.value) {
      resolved = r1.value;
    } else {
      // Fallback: plain generation without tools (mirrors resolve_with_gemini_no_search)
      const r2 = await exponentialBackoff(async () => {
        const response = await neurolink.generate({
          input: { text: prompt },
          provider: "vertex",
          model:    CONFIG.MODEL,
          disableTools: true,
          maxTokens: 256,
          timeout: "30s",
        });
        const match = response.content.match(/https?:\/\/[^\s<>"')]+/);
        return match?.[0]?.replace(/\.$/, "") ?? null;
      }, 2, CONFIG.RETRY_BASE_DELAY_MS);
      if (r2.success && r2.value) resolved = r2.value;
    }

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
