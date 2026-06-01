/**
 * Shared URL liveness checker.
 *
 * Single source of truth — replaces ad-hoc fetch logic duplicated across
 * researcher.ts, verifier.ts, implementer.ts, and enrichment.ts.
 *
 * Key design decisions:
 *  - DNS/network failures → "error", NEVER "dead" (prevents a DNS outage from
 *    permanently marking all links dead in the knowledge-base, the root cause
 *    of the 2026-05-31 data corruption).
 *  - 401/403/405/429/451 → "protected" (bot-blocked but site is alive; treat
 *    as live for display purposes — fixes false-dead VS Code marketplace,
 *    npmjs, Unreal Engine URLs).
 *  - Uses a realistic browser User-Agent so CDNs don't 403/block the checker.
 *  - GET with Range: bytes=0-0 to avoid downloading full payloads; falls back
 *    to plain HEAD if the server rejects Range.
 *  - Uses Node 20+ global fetch — no new dependencies.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type UrlStatus =
  | "live"         // 2xx
  | "redirect"     // 3xx not auto-followed (rare; we follow up to MAX_REDIRECTS)
  | "protected"    // 401/403/405/429/451 — endpoint exists but blocks bots; treat as LIVE for display
  | "dead"         // 404/410 — definitively gone
  | "server_error" // 5xx — site up but erroring
  | "error"        // DNS/network failure — NOT 'dead'; may be transient
  | "timeout"      // aborted by our timeout
  | "no_url";      // empty/invalid input

export interface UrlCheckResult {
  url: string;
  status: UrlStatus;
  httpCode: number | null;
  finalUrl: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 1;
const DEFAULT_CONCURRENCY = 8;
const MAX_REDIRECTS = 5;
const RETRY_BASE_DELAY_MS = 500;

/**
 * Realistic browser UA — many CDNs and marketplaces 403 non-browser UAs.
 * (e.g. VS Code marketplace, npmjs, ohmo.ai all block bare bot strings)
 */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Status codes that mean the URL exists but blocks automated access. */
const PROTECTED_CODES = new Set([401, 403, 405, 429, 451]);

/** Status codes that mean the resource is definitively gone. */
const DEAD_CODES = new Set([404, 410]);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true when the thrown error is a DNS / network-level failure. */
function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("ENOTFOUND") ||
    msg.includes("EAI_AGAIN") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ECONNRESET") ||
    msg.includes("CERT_") ||
    msg.includes("SSL_") ||
    msg.includes("certificate") ||
    // Node fetch wraps some network errors with "fetch failed"
    (msg.includes("fetch failed") &&
      (msg.includes("ENOTFOUND") || msg.includes("EAI_") || msg.includes("ECONN")))
  );
}

/** Returns true when the error was triggered by AbortController. */
function isAbortError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.name === "AbortError" ||
      err.message.includes("abort") ||
      err.message.includes("Abort")
    );
  }
  return false;
}

/** Derive a UrlStatus from an HTTP status code. */
function statusFromCode(code: number, _wasRedirected: boolean): UrlStatus {
  // 2xx is always "live" regardless of whether we followed redirects to get here.
  // wasRedirected only matters when the final code itself is 3xx (hop limit hit).
  if (code >= 200 && code < 300) return "live";
  if (code >= 300 && code < 400) return "redirect";
  if (PROTECTED_CODES.has(code)) return "protected";
  if (DEAD_CODES.has(code)) return "dead";
  if (code >= 400 && code < 500) return "dead"; // other 4xx — gone or forbidden enough to be dead
  if (code >= 500) return "server_error";
  return "error"; // 0 or unknown (e.g. redirect loop exhausted)
}

interface FetchAttemptResult {
  httpCode: number;
  finalUrl: string;
  wasRedirected: boolean;
}

/**
 * Follow redirects manually so we can enforce a hop limit and track the final
 * URL. Uses GET with `Range: bytes=0-0` to minimise data transfer.
 */
async function fetchFollowingRedirects(
  url: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<FetchAttemptResult> {
  let currentUrl = url;
  let wasRedirected = false;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        "User-Agent": BROWSER_UA,
        // Range header avoids downloading the whole body for liveness checks.
        // Servers that honour it return 206; others return 200 — both are fine.
        "Range": "bytes=0-0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    const { status } = response;

    // 3xx → follow Location
    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        // No Location header — treat as the final answer
        return { httpCode: status, finalUrl: currentUrl, wasRedirected };
      }
      currentUrl = new URL(location, currentUrl).href;
      wasRedirected = true;
      continue;
    }

    // Terminal response
    return { httpCode: status, finalUrl: currentUrl, wasRedirected };
  }

  // Redirect loop / too many hops
  return { httpCode: 0, finalUrl: currentUrl, wasRedirected: true };
}

/**
 * Single fetch attempt for one URL. Returns a structured result; never throws.
 */
async function attemptCheck(
  url: string,
  timeoutMs: number,
): Promise<UrlCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fetchFollowingRedirects(url, timeoutMs, controller.signal);
    clearTimeout(timer);

    const status = statusFromCode(result.httpCode, result.wasRedirected);
    return {
      url,
      status,
      httpCode: result.httpCode,
      finalUrl: result.finalUrl,
    };
  } catch (err) {
    clearTimeout(timer);

    if (isAbortError(err)) {
      return { url, status: "timeout", httpCode: null, finalUrl: null };
    }

    if (isNetworkError(err)) {
      // CRITICAL: DNS/network failures must NOT be classified as "dead".
      // A transient DNS outage must not permanently poison the knowledge base.
      return { url, status: "error", httpCode: null, finalUrl: null };
    }

    // Anything else (e.g. invalid URL syntax that fetch rejects, TLS mismatch
    // not caught by isNetworkError) — treat as network-level error.
    return { url, status: "error", httpCode: null, finalUrl: null };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CheckUrlOptions {
  timeoutMs?: number;
  retries?: number;
}

export interface CheckUrlsOptions extends CheckUrlOptions {
  concurrency?: number;
}

/**
 * Check whether a single URL is live.
 *
 * Retries on "timeout" or "error" (transient failures) up to `opts.retries`
 * additional times (default 1), with ~500 ms * attempt linear backoff.
 * Does NOT retry on definitive answers (dead, protected, live, etc.).
 */
export async function checkUrl(
  url: string,
  opts: CheckUrlOptions = {},
): Promise<UrlCheckResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? DEFAULT_RETRIES;

  if (!url || typeof url !== "string" || url.trim() === "") {
    return { url, status: "no_url", httpCode: null, finalUrl: null };
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { url, status: "no_url", httpCode: null, finalUrl: null };
  }

  let lastResult: UrlCheckResult | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Linear backoff: wait RETRY_BASE_DELAY_MS * attempt before retrying
      await new Promise<void>((resolve) =>
        setTimeout(resolve, RETRY_BASE_DELAY_MS * attempt),
      );
    }

    const result = await attemptCheck(trimmed, timeoutMs);
    lastResult = result;

    // Only retry on transient failures
    if (result.status !== "timeout" && result.status !== "error") {
      return result;
    }
  }

  // Return the last (transient) result after exhausting retries
  return lastResult!;
}

/**
 * Check multiple URLs concurrently with bounded parallelism.
 *
 * Returns a Map<url, UrlCheckResult> preserving all input URLs (including
 * duplicates deduplicated to a single check).
 */
export async function checkUrls(
  urls: string[],
  opts: CheckUrlsOptions = {},
): Promise<Map<string, UrlCheckResult>> {
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const results = new Map<string, UrlCheckResult>();

  // Deduplicate so the same URL is only fetched once
  const unique = [...new Set(urls)];

  // Process in bounded batches
  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((url) => checkUrl(url, opts)),
    );
    for (const result of batchResults) {
      results.set(result.url, result);
    }
  }

  return results;
}
