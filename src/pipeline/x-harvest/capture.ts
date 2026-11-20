// src/pipeline/x-harvest/capture.ts
//
// The X bookmark capture, without the browser: what to do with each page of responses, when
// to stop, and what to record. The browser is behind PageDriver, and this file only ever asks
// it to open the bookmarks page, scroll and read.
//
// The rule throughout: when X refuses in any way, stop and say so. Never scroll a page that
// did not answer, never retry a refusal, never report a refusal as an empty success.
import { type XPost, parseBookmarksResponse } from "../../sources/x/parse.js";

export interface PageDriver {
  open(url: string): Promise<void>;
  scroll(): Promise<void>;
  state(): Promise<{ path: string; text: string }>;
  /** Bookmarks responses the page has received since the last call, including ones still arriving. */
  drain(): Promise<Array<{ status: number; body: unknown }>>;
  /** True once any X API response came back 429. */
  rateLimited(): boolean;
  wait(ms: number): Promise<void>;
}

/** "refused": X answered the bookmarks request with an error (a non-200, or an error body). */
export type StopReason = "done" | "login-wall" | "challenge" | "rate-limited" | "refused";

export const BOOKMARKS_URL = "https://x.com/i/bookmarks";

const LOGIN_PATH = /^\/(login|i\/flow\/login|i\/flow\/signup)/;
const CHALLENGE_PATH = /^\/account\/access/;
const CHALLENGE_TEXT =
  /unusual activity|verify (it'?s|you are) (you|human)|are you a robot|account (is |has been )?(locked|suspended)|confirm your identity/i;

/**
 * Why the capture must stop right now, or null when the page looks normal. The page's words
 * are only read while no bookmarks have arrived (`readText`): once they have, the text on the
 * page is the user's own bookmarks, and a post that mentions a "locked account" is not a lock.
 */
export function detectStop(
  s: { path: string; text: string },
  readText: boolean,
): Exclude<StopReason, "done" | "rate-limited" | "refused"> | null {
  if (LOGIN_PATH.test(s.path)) return "login-wall";
  if (CHALLENGE_PATH.test(s.path)) return "challenge";
  if (readText && CHALLENGE_TEXT.test(s.text)) return "challenge";
  return null;
}

/** X's answer was not a bookmarks timeline this code knows, or listed posts none of which could be read. */
export class FormatChangedError extends Error {
  constructor(detail: number | string) {
    super(
      typeof detail === "number"
        ? `X returned ${detail} bookmark entries and none could be read. Its response format has probably changed.`
        : detail,
    );
    this.name = "FormatChangedError";
  }
}

/** The page never fetched its bookmarks at all (logged out without a redirect, an error page, or a renamed request). */
export class NoBookmarksResponseError extends Error {
  constructor() {
    super(
      "The bookmarks page never fetched its bookmarks, so nothing was scrolled. Open the profile by hand: X may be showing a sign-in prompt or an error page.",
    );
    this.name = "NoBookmarksResponseError";
  }
}

/** Chrome or its DevTools port did not come up. Nothing was sent to X, so this alone is safe to retry. */
export class BrowserStartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrowserStartError";
  }
}

/**
 * 0 captured; 3 X refused (cool-off); 4 X's page did not behave as expected (no cool-off, but
 * no retry either); 5 the browser never started (retryable); 1 anything else (not retried).
 */
export function exitCodeFor(outcome: StopReason | Error): number {
  if (outcome === "done") return 0;
  if (typeof outcome === "string") return 3;
  if (outcome instanceof FormatChangedError || outcome instanceof NoBookmarksResponseError) return 4;
  if (outcome instanceof BrowserStartError) return 5;
  return 1;
}

/**
 * Chrome's arguments for the capture. A visible window is the default: headless Chrome names
 * itself "HeadlessChrome" in its user agent, which a normal sign-in never does.
 */
export function browserArgs(base: string[], headless: boolean): string[] {
  return headless ? base : base.filter((a) => !a.startsWith("--headless"));
}

const DEFAULT_SCROLLS = 40;
const MAX_SCROLLS = 100;

export function clampScrolls(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SCROLLS;
  return Math.max(0, Math.min(MAX_SCROLLS, Math.trunc(n)));
}

export interface CaptureOptions {
  scrolls: number;
  /** Tweet ids already captured; a run of them means the rest is old. */
  known: ReadonlySet<string>;
  /**
   * How many already-known posts in a row end the capture early. null turns that off, which
   * it must be until some run has reached the end of the feed: otherwise bookmarks below the
   * first run's scroll limit would never be fetched.
   */
  knownRunStop: number | null;
  pauseMs: () => number;
  initialMs: number;
}

export interface CaptureResult {
  posts: XPost[];
  stop: StopReason;
  entries: number;
  unparsed: number;
  responses: number;
  /** True when the feed's last page was seen; false when the scroll limit or a stop came first. */
  reachedEnd: boolean;
}

function stopForStatus(status: number): StopReason {
  if (status === 429) return "rate-limited";
  if (status === 401 || status === 403) return "login-wall";
  return "refused";
}

export async function capture(driver: PageDriver, o: CaptureOptions): Promise<CaptureResult> {
  const posts = new Map<string, XPost>();
  let entries = 0;
  let unparsed = 0;
  let responses = 0;
  let knownRun = 0;
  let feedEnded = false;

  const result = (stop: StopReason): CaptureResult => ({
    posts: [...posts.values()],
    stop,
    entries,
    unparsed,
    responses,
    reachedEnd: stop === "done" && feedEnded,
  });

  /** Reads what arrived. Returns a stop reason when X refused the bookmarks request itself. */
  const take = async (): Promise<StopReason | null> => {
    for (const { status, body } of await driver.drain()) {
      if (status !== 200) return stopForStatus(status);
      const page = parseBookmarksResponse(body);
      if (page.refused) return "refused";
      if (!page.recognised) {
        throw new FormatChangedError(
          "X answered the bookmarks request with a shape this code does not know. Its response format has probably changed.",
        );
      }
      responses++;
      entries += page.entries;
      unparsed += page.unparsed;
      // A recognised timeline with no post entries is how the feed ends (it still carries cursors).
      if (page.entries === 0) feedEnded = true;
      for (const post of page.posts) {
        knownRun = o.known.has(post.id) ? knownRun + 1 : 0;
        if (!posts.has(post.id)) posts.set(post.id, post);
      }
    }
    return null;
  };
  // Read the answers first: only then is it known whether the words on the page are X's
  // (no bookmarks arrived, so they may be a challenge) or the user's own bookmarks.
  const step = async (): Promise<StopReason | null> => {
    if (driver.rateLimited()) return "rate-limited";
    const refused = await take();
    if (refused) return refused;
    if (driver.rateLimited()) return "rate-limited";
    return detectStop(await driver.state(), responses === 0);
  };

  await driver.open(BOOKMARKS_URL);
  await driver.wait(o.initialMs);
  let stop = await step();
  if (stop) return result(stop);
  if (responses === 0) {
    // Slow load: give it one more wait, without touching the page.
    await driver.wait(o.initialMs);
    stop = await step();
    if (stop) return result(stop);
    if (responses === 0) throw new NoBookmarksResponseError();
  }

  const enoughKnown = () => o.knownRunStop !== null && knownRun >= o.knownRunStop;
  for (let i = 0; i < o.scrolls && !feedEnded && !enoughKnown(); i++) {
    await driver.scroll();
    await driver.wait(o.pauseMs());
    stop = await step();
    if (stop) return result(stop);
  }

  if (unparsed > 0 && posts.size === 0) throw new FormatChangedError(unparsed);
  return result("done");
}

/** Union of what was captured before and now, newest capture first; the new copy of a post wins. */
export function mergeIncoming(existing: XPost[], captured: XPost[]): { posts: XPost[]; added: number } {
  const old = Array.isArray(existing) ? existing.filter((p) => p && typeof p.id === "string") : [];
  const oldIds = new Set(old.map((p) => p.id));
  const capturedIds = new Set(captured.map((p) => p.id));
  return {
    posts: [...captured, ...old.filter((p) => !capturedIds.has(p.id))],
    added: captured.filter((p) => !oldIds.has(p.id)).length,
  };
}

/** A day, less an hour: with a daily 06:00 job a full 24h would skip the next day's run by seconds. */
export const COOLOFF_HOURS = 23;

export interface HarvestStatus {
  last_run: string;
  last_success: string | null;
  last_stop: StopReason;
  captured: number;
  added: number;
  /** True once any run has seen the end of the feed; only then may a run stop early on known posts. */
  reached_end: boolean;
  /** Set after X refuses in any way: no capture before this time. */
  cooloff_until: string | null;
}

export function statusAfter(
  r: { stop: StopReason; captured: number; added: number; reachedEnd?: boolean },
  now: Date,
  previous?: HarvestStatus | null,
): HarvestStatus {
  const clean = r.stop === "done";
  return {
    last_run: now.toISOString(),
    last_success: clean ? now.toISOString() : (previous?.last_success ?? null),
    last_stop: r.stop,
    captured: r.captured,
    added: r.added,
    reached_end: Boolean(previous?.reached_end) || Boolean(r.reachedEnd),
    cooloff_until: clean ? null : new Date(now.getTime() + COOLOFF_HOURS * 3_600_000).toISOString(),
  };
}

/** The time a cool-off still holds until, or null when a capture may run. */
export function coolingOffUntil(status: { cooloff_until?: unknown } | null | undefined, now: Date): string | null {
  const until = typeof status?.cooloff_until === "string" ? status.cooloff_until : null;
  if (!until) return null;
  const ms = Date.parse(until);
  return !Number.isNaN(ms) && ms > now.getTime() ? until : null;
}
