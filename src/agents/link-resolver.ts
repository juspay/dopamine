import { type NeuroLink } from "@juspay/neurolink";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { assertNotTruncated } from "../utils/generation.js";
import { makeRefreshGate } from "../pipeline/refresh.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { validateAndNormalizeUrl } from "./link-extractor.js";
import { agreesWithKnownLink, knownLinkFor } from "./link-aliases.js";
import { checkUrl } from "../utils/url-check.js";

/** Link entry as stored in links_v2.json. */
interface LinkEntry {
  name: string;
  url: string | null;
  type: string;
  description: string;
  timestamp: string;
}

/** Why a lookup produced no URL: the model declined, answered with an invalid URL, or with a dead one. */
type LookupOutcome = "none" | "invalid" | "dead";

/** One failed lookup, remembered so the same name is not asked about again every run. */
export interface LinkAttempt {
  attempted_at: string;
  outcome: LookupOutcome;
}

export type LinkAttempts = Record<string, LinkAttempt>;

/** The hint is part of the key: the same name with a new hint URL is a new question. */
export function attemptKey(name: string, hint: string | null): string {
  return `${name.trim().toLowerCase()}|${(hint ?? "").trim().toLowerCase()}`;
}

/** The partial URL the extractor saw, if any; "" and "null" mean it saw none. */
function hintOf(url: string | null): string | null {
  const trimmed = (url ?? "").trim();
  return trimmed === "" || trimmed === "null" ? null : trimmed;
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

/**
 * Names that cannot have a URL however the model is asked: loopback addresses
 * and IPs, and a few generic words that are not a product or a page. Used only
 * for links that came with no URL hint at all.
 *
 * Deliberately narrow. Every broader rule that was tried collided with a name
 * the model has really resolved: a leading "/" hit "/v1/systemone schema", a
 * trailing "link" hit "skillry video link (hover)", and a loopback prefix hit
 * "localhost nullmotion". The failure cache handles everything else after one
 * attempt, so this only saves that first call.
 */
const UNRESOLVABLE_ADDRESS =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d{1,5})?(\/\S*)?$|^(\d{1,3}\.){3}\d{1,3}(:\d{1,5})?(\/\S*)?$/i;
const UNRESOLVABLE_GENERIC =
  /^(website|blog|calendar|dashboards?|analytics dashboard|technical report|live demo|cryptocurrency|machine learning|embeddings|rag|llm api|free llm api|ftp|http|mp4|ai|social media analytics|local development server)$/i;

export function isUnresolvableName(name: string): boolean {
  const n = name.trim();
  return UNRESOLVABLE_ADDRESS.test(n) || UNRESOLVABLE_GENERIC.test(n);
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
  const links = await loadState<Record<string, { links: LinkEntry[] }>>(CONFIG.STATE.LINKS_V2, {});

  // --- First pass: fix obvious cases without API ---
  let fixedLocally = 0,
    removedGarbage = 0,
    skippedUnresolvable = 0,
    knownCount = 0,
    replacedCount = 0;
  const needsApi: Array<{ fname: string; idx: number; link: LinkEntry }> = [];

  for (const [fname, entry] of Object.entries(links)) {
    // Filter out garbage entries (bad Gemini extractions) — process remaining in-place
    const cleaned = (entry.links ?? []).filter((link) => {
      if (isGarbageName(link.name)) {
        removedGarbage++;
        console.log(`Removed garbage: ${link.name}`);
        return false;
      }
      return true;
    });
    links[fname].links = cleaned;

    for (const [idx, link] of links[fname].links.entries()) {
      // A checked-in page for products the model never resolves. It fills a missing URL and replaces a
      // stored one that does not agree with it (see link-aliases.ts); a partial hint from the extractor
      // is left to the lookup below instead.
      const known = knownLinkFor(link.name);
      const hasPartialHint = needsResolution(link.url) && hintOf(link.url) !== null;
      if (known && !hasPartialHint && !agreesWithKnownLink(link.name, link.url ?? "")) {
        if (!needsResolution(link.url)) replacedCount++;
        links[fname].links[idx].url = known;
        knownCount++;
        console.log(`Known link: ${link.name} -> ${known}`);
        continue;
      }

      if (!needsResolution(link.url)) continue;

      // Try Instagram handle resolution (no API needed)
      const ig = tryResolveInstagramHandle(link.name, link.description);
      if (ig) {
        links[fname].links[idx].url = ig;
        fixedLocally++;
        console.log(`Instagram handle: ${link.name} -> ${ig}`);
        continue;
      }

      // Try fixing partial URL, then validate the result
      const fixed = tryFixPartialUrl(link.url);
      const fixedAndValid = fixed !== null ? validateAndNormalizeUrl(fixed) : null;
      if (fixedAndValid) {
        links[fname].links[idx].url = fixedAndValid;
        fixedLocally++;
        console.log(`Fixed locally: ${link.name} -> ${fixedAndValid}`);
      } else if (hintOf(link.url) === null && isUnresolvableName(link.name)) {
        // Kept in links_v2.json with no URL; it just never costs a model call.
        skippedUnresolvable++;
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

  console.log(
    `Removed garbage: ${removedGarbage}, Fixed locally: ${fixedLocally}, Unique names for API: ${uniqueNames.size}` +
      (skippedUnresolvable > 0 ? `, Skipped as unresolvable: ${skippedUnresolvable}` : "") +
      (knownCount > 0 ? `, Known links applied: ${knownCount} (${replacedCount} replaced a stored URL)` : ""),
  );

  // --- Failure cache: do not re-ask about a name the model already could not resolve ---
  const attempts = await loadState<LinkAttempts>(CONFIG.STATE.LINK_ATTEMPTS, {});
  const candidateKeys = new Set([...uniqueNames.values()].map((l) => attemptKey(l.name, hintOf(l.url))));
  const gate = makeRefreshGate({ ttlDays: CONFIG.LINK_RETRY_TTL_DAYS, maxPerRun: CONFIG.LINK_RETRY_MAX_PER_RUN });
  let skippedRecent = 0,
    deferred = 0,
    retriedStale = 0;
  for (const [nameKey, link] of [...uniqueNames.entries()]) {
    const decision = gate.decide(attempts[attemptKey(link.name, hintOf(link.url))], "attempted_at");
    if (decision.reprocess) {
      if (decision.reason === "stale") retriedStale++;
      continue;
    }
    uniqueNames.delete(nameKey);
    if (decision.reason === "budget") deferred++;
    else skippedRecent++;
  }
  // Forget failures for names that are no longer unresolved (resolved elsewhere, or the video is gone).
  for (const key of Object.keys(attempts)) if (!candidateKeys.has(key)) delete attempts[key];
  console.log(
    `Failure cache: ${skippedRecent} failed within ${CONFIG.LINK_RETRY_TTL_DAYS}d (skipped), ` +
      `${retriedStale} expired (asking again), ${deferred} expired but over the per-run budget (deferred), ` +
      `${uniqueNames.size} to ask now`,
  );

  // Build a reverse index: nameKey -> all (fname, idx) entries needing it
  const nameToEntries = new Map<string, Array<{ fname: string; idx: number }>>();
  for (const { fname, idx, link } of needsApi) {
    const key = link.name.trim().toLowerCase();
    if (!nameToEntries.has(key)) nameToEntries.set(key, []);
    nameToEntries.get(key)!.push({ fname, idx });
  }

  let resolvedCount = 0,
    failedCount = 0,
    saveEvery = 10,
    saveCounter = 0;

  for (const [i, [nameKey, link]] of [...uniqueNames.entries()].entries()) {
    // Taken before the URL is written back below: `link` is the same object stored in links_v2,
    // so a resolved URL would otherwise turn into the "hint" and miss the record being cleared.
    const attemptId = attemptKey(link.name, hintOf(link.url));
    const context = [
      link.description ? `Description: ${link.description}` : "",
      link.url ? `Possible hint: ${link.url}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    const prompt =
      `What is the official website URL for "${link.name}"? ${context}. ` +
      `Return ONLY the full URL starting with https://, nothing else. ` +
      `If it's a GitHub project return the GitHub URL. ` +
      `If you do not know the exact URL, return the word NONE — do NOT guess or fabricate a URL. One URL only.`;

    console.log(`\n[${i + 1}/${uniqueNames.size}] Resolving: ${link.name}`);

    // Selected by CONFIG.LINK_MODEL rather than CONFIG.MODEL. Historically this was
    // load-bearing: CONFIG.MODEL was an image-preview model that routed these
    // prompts through executeImageGeneration and returned empty parts whenever
    // Vertex's safety filter tripped on a benign description (e.g. "Personal
    // account inferred from filename" → "No content parts"). CONFIG.MODEL is a
    // text-capable model again, so the split is now just insulation against it
    // being pointed back at an image model.
    let resolved: string | null = null;
    // Why there is no URL, when the model answered; stays null if the lookup itself errored.
    let outcome: LookupOutcome | null = null;
    const r1 = await exponentialBackoff(
      async () => {
        const response = await neurolink.generate({
          input: { text: prompt },
          provider: "vertex",
          model: CONFIG.LINK_MODEL,
          disableTools: true,
          // Thinking tokens share this cap: 256 truncated the URL mid-string on gemini-3.8-flash.
          maxTokens: 2048,
          timeout: "30s",
        });
        assertNotTruncated(response, "link-resolver");
        const content = response.content.trim();
        // Model may return "NONE" when it cannot find a URL — treat as failure
        if (/^NONE$/i.test(content)) return null;
        const match = content.match(/https?:\/\/[^\s<>"')]+/);
        return match?.[0]?.replace(/\.$/, "") ?? null;
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_BASE_DELAY_MS,
    );

    if (r1.success && !r1.value) outcome = "none";

    if (r1.success && r1.value) {
      // Validate the resolved URL — the model must not have invented paths
      const validated = validateAndNormalizeUrl(r1.value);
      if (validated === null) {
        outcome = "invalid";
        console.log(`  -> Resolved URL failed validation (hallucinated?): ${r1.value}`);
      } else {
        // Optionally check liveness: only drop definitively-dead (404/410) links.
        // Protected (403/429), errors (DNS outage), and timeouts are kept — we must
        // not permanently drop a live URL because of a bot-block or transient failure.
        const checkResult = await checkUrl(validated, { timeoutMs: 8_000, retries: 0 });
        if (checkResult.status === "dead") {
          outcome = "dead";
          console.log(`  -> Resolved URL is dead (${checkResult.httpCode}): ${validated}`);
          // Leave url as null rather than storing a 404 link
        } else {
          resolved = validated;
          console.log(`  Resolved [${checkResult.status}]: ${validated}`);
        }
      }
    }

    if (resolved) {
      // Apply immediately to all entries sharing this name
      const entries = nameToEntries.get(nameKey) ?? [];
      for (const { fname, idx } of entries) {
        links[fname].links[idx].url = resolved;
      }
      resolvedCount++;
      delete attempts[attemptId];
    } else {
      failedCount++;
      console.log(`  FAILED to resolve`);
      // A lookup that errored (network, quota) says nothing about the name, so it is asked again next run.
      if (outcome !== null) {
        attempts[attemptId] = { attempted_at: new Date().toISOString(), outcome };
      } else {
        console.log(`  (lookup errored; not cached, will be asked again next run)`);
      }
    }

    // Save incrementally so progress survives restarts (resume mode)
    saveCounter++;
    if (saveCounter >= saveEvery) {
      await saveState(CONFIG.STATE.LINKS_V2, links);
      await saveState(CONFIG.STATE.LINK_ATTEMPTS, attempts);
      saveCounter = 0;
    }

    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  // Final save
  await saveState(CONFIG.STATE.LINKS_V2, links);
  await saveState(CONFIG.STATE.LINK_ATTEMPTS, attempts);
  console.log(`\nLink resolution complete. Resolved: ${resolvedCount}, Failed: ${failedCount}`);
}
