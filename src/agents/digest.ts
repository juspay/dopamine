// Side-effect import so .env loads before config.js evaluates (ESM hoisting —
// same rationale as runner.ts).
import "dotenv/config";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { NeuroLink } from "@juspay/neurolink";
import { CONFIG } from "../pipeline/config.js";
import { type Digest, DigestSchema } from "../schemas/digest.js";
import { hasSearchSchema, openSearchDb } from "../search/db.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { exponentialBackoff } from "../utils/rate-limit.js";

const HEADLINE_MAX = 80;
const LINE_MAX = 110;
const PUSH_TIMEOUT_MS = 10_000;

export interface DigestCandidate {
  id: string;
  title: string;
  category: string;
  takenAt: string;
  sourceUrl: string;
  verification: string;
  implementability: number;
  usefulness: string;
  takeaways: string[];
  toolNames: string[];
}

export interface DigestState {
  digestedIds: string[];
  lastDigestAt: string;
}

const VERIF_WEIGHT: Record<string, number> = { verified_useful: 3, partially_verified: 2, unknown: 1 };
const USE_WEIGHT: Record<string, number> = { highly_useful: 3, useful: 2, somewhat_useful: 1 };

export function rankScore(c: DigestCandidate): number {
  const verif = VERIF_WEIGHT[c.verification] ?? 0;
  const use = USE_WEIGHT[c.usefulness] ?? 0;
  return verif * 2 + (c.implementability / 10) * 2 + use;
}

interface CandidateRow {
  id: string;
  title: string;
  category: string;
  taken_at: string;
  source_url: string;
  verification: string;
  implementability: number;
  usefulness: string;
  takeaways_json: string;
}

/** A candidate is digestible only when there is something to say about it. */
export function hasDigestContent(c: DigestCandidate): boolean {
  return c.takeaways.length > 0 || c.toolNames.length > 0;
}

export interface DigestSelection {
  items: DigestCandidate[];
  /**
   * New ids with no extracted knowledge (e.g. categories outside the
   * knowledge-extraction targets). Marked digested without being sent so they
   * never clog the queue with content-less digest lines.
   */
  skippedIds: string[];
}

export function selectCandidates(db: DatabaseSync, digestedIds: Set<string>, topN: number): DigestSelection {
  const rows = db
    .prepare(
      "SELECT id, title, category, taken_at, source_url, verification, implementability, usefulness, takeaways_json FROM videos",
    )
    .all() as unknown as CandidateRow[];
  const toolStmt = db.prepare("SELECT name FROM tools WHERE video_id = ? LIMIT 3");

  const fresh = rows
    .filter((r) => !digestedIds.has(r.id))
    .map(
      (r): DigestCandidate => ({
        id: r.id,
        title: r.title,
        category: r.category,
        takenAt: r.taken_at,
        sourceUrl: r.source_url,
        verification: r.verification,
        implementability: r.implementability,
        usefulness: r.usefulness,
        takeaways: JSON.parse(r.takeaways_json) as string[],
        toolNames: (toolStmt.all(r.id) as unknown as { name: string }[]).map((t) => t.name),
      }),
    );

  const items = fresh
    .filter(hasDigestContent)
    .sort((a, b) => rankScore(b) - rankScore(a) || b.takenAt.localeCompare(a.takenAt))
    .slice(0, topN);
  const skippedIds = fresh.filter((c) => !hasDigestContent(c)).map((c) => c.id);
  return { items, skippedIds };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function fallbackDigest(items: DigestCandidate[]): Digest {
  return {
    headline: `${items.length} new learning${items.length === 1 ? "" : "s"} from your saved reels`,
    lines: items.map((i) => truncate(i.takeaways[0] ? `${i.title} — ${i.takeaways[0]}` : i.title, LINE_MAX)),
  };
}

export type GenerateFn = (prompt: string) => Promise<Digest>;

const DIGEST_PROMPT = (items: DigestCandidate[]): string =>
  [
    "You write a daily push-notification digest of learnings extracted from saved short videos.",
    `Compose a headline (max ${HEADLINE_MAX} chars) capturing the day's theme, and EXACTLY ${items.length} lines (max ${LINE_MAX} chars each), one per item, in the given order.`,
    "Each line: the tool/technique + why it matters, punchy and concrete. No URLs, no numbering, no markdown.",
    "",
    ...items.map(
      (item, i) =>
        `Item ${i + 1}: [${item.category}] ${item.title}\n  Takeaways: ${item.takeaways.slice(0, 3).join(" | ")}\n  Tools: ${item.toolNames.join(", ") || "-"}`,
    ),
  ].join("\n");

/**
 * Models routinely pack multiple lines into one newline-joined string, or add
 * numbering despite instructions — normalise both before judging line count.
 */
export function normalizeLines(lines: string[]): string[] {
  return lines
    .flatMap((l) => l.split("\n"))
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, ""))
    .filter((l) => l !== "");
}

/**
 * Compose via LLM; any failure (call, parse, wrong line count) falls back to
 * the mechanical digest. Lines are hard-truncated to display length; URLs are
 * attached later BY INDEX — never taken from the model.
 */
export async function composeDigest(generate: GenerateFn, items: DigestCandidate[]): Promise<Digest> {
  try {
    const digest = await generate(DIGEST_PROMPT(items));
    const lines = normalizeLines(digest.lines);
    if (lines.length !== items.length) {
      console.warn(`  Digest LLM returned ${lines.length} lines for ${items.length} items — using fallback.`);
      return fallbackDigest(items);
    }
    return {
      headline: truncate(digest.headline, HEADLINE_MAX),
      lines: lines.map((l) => truncate(l, LINE_MAX)),
    };
  } catch (err) {
    console.warn(`  Digest LLM composition failed — using fallback: ${String(err).slice(0, 150)}`);
    return fallbackDigest(items);
  }
}

export interface ShooterPayload {
  title: string;
  subtitle: string;
  message: string;
  data: {
    category: string;
    project: string;
    timestamp: string;
    requestId: string;
    source: string;
  };
  [key: string]: unknown;
}

export function buildPushPayload(
  digest: Digest,
  items: DigestCandidate[],
  now: string,
  requestId: string,
): ShooterPayload {
  const message = digest.lines.map((line, i) => `${i + 1}. ${line}\n${items[i]?.sourceUrl ?? ""}`.trimEnd()).join("\n");
  return {
    title: `Dopamine — ${items.length} new learning${items.length === 1 ? "" : "s"}`,
    subtitle: digest.headline,
    message,
    data: {
      category: "digest",
      project: "dopamine",
      timestamp: now,
      requestId,
      source: "dopamine-digest",
    },
  };
}

/**
 * DIGEST_PUSH_KEY env, else API_KEY= parsed from ~/.shooter/.env, else "".
 * Quoted values may contain spaces/#; unquoted values stop at whitespace or #
 * so trailing inline comments never leak into the bearer token.
 */
export function resolvePushKey(
  env: Record<string, string | undefined>,
  readFile: (p: string) => string = (p) => fs.readFileSync(p, "utf8"),
): string {
  if (env.DIGEST_PUSH_KEY) return env.DIGEST_PUSH_KEY;
  try {
    const content = readFile(path.join(os.homedir(), ".shooter", ".env"));
    const match = content.match(/^API_KEY=(?:"([^"]*)"|'([^']*)'|([^\s#]+))/m);
    return match ? (match[1] ?? match[2] ?? match[3] ?? "") : "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// State handling — deliberately NOT the generic loadState/saveState:
//  - "file absent" (bootstrap) must be distinguishable from "file corrupt"
//    (refuse to run — a silent re-bootstrap would mark pending items digested
//    without ever sending them)
//  - writes are atomic (tmp + rename) so a mid-write kill can't truncate the
//    state into the corrupt case
// ---------------------------------------------------------------------------

export type LoadedDigestState = { kind: "absent" } | { kind: "ok"; state: DigestState } | { kind: "corrupt" };

export function parseDigestState(raw: string): DigestState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as DigestState).digestedIds) &&
      (parsed as DigestState).digestedIds.every((id) => typeof id === "string") &&
      typeof (parsed as DigestState).lastDigestAt === "string"
    ) {
      return parsed as DigestState;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadDigestState(statePath: string): Promise<LoadedDigestState> {
  let raw: string;
  try {
    raw = await fs.promises.readFile(statePath, "utf8");
  } catch {
    return { kind: "absent" };
  }
  const state = parseDigestState(raw);
  return state === null ? { kind: "corrupt" } : { kind: "ok", state };
}

export async function saveDigestState(statePath: string, state: DigestState): Promise<void> {
  await fs.promises.mkdir(path.dirname(statePath), { recursive: true });
  const tmp = `${statePath}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.promises.rename(tmp, statePath);
}

const LOCK_STALE_MS = 10 * 60 * 1000;

/** mkdir-based lock so a manual `npm run digest` can't double-push alongside the scheduled run. */
export function acquireDigestLock(lockPath: string): boolean {
  try {
    fs.mkdirSync(lockPath);
    return true;
  } catch {
    try {
      if (Date.now() - fs.statSync(lockPath).mtimeMs > LOCK_STALE_MS) {
        fs.rmdirSync(lockPath);
        fs.mkdirSync(lockPath);
        return true;
      }
    } catch {
      // raced with another process — treat as locked
    }
    return false;
  }
}

export function releaseDigestLock(lockPath: string): void {
  try {
    fs.rmdirSync(lockPath);
  } catch {
    // already gone — nothing to release
  }
}

export async function deliverPush(
  payload: ShooterPayload,
  opts: { url: string; key: string; fetchFn?: typeof fetch },
): Promise<void> {
  const fetchFn = opts.fetchFn ?? fetch;
  const res = await fetchFn(opts.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.key}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`push endpoint responded ${res.status}`);
  }
}

export interface DigestOverrides {
  dbPath?: string;
  statePath?: string;
  lockPath?: string;
  pushUrl?: string;
  pushKey?: string;
  topN?: number;
  generate?: GenerateFn;
  fetchFn?: typeof fetch;
  now?: () => string;
}

function neurolinkGenerate(neurolink: NeuroLink): GenerateFn {
  return async (prompt: string) => {
    const result = await exponentialBackoff(
      async () => {
        const response = await neurolink.generate({
          input: { text: prompt },
          provider: "vertex",
          model: CONFIG.DIGEST_MODEL,
          schema: DigestSchema,
          output: { format: "json" },
          disableTools: true,
          maxTokens: 1024,
          timeout: "120s",
        });
        return DigestSchema.parse(safeJsonParse(response.content));
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_BASE_DELAY_MS,
    );
    if (!result.success) throw new Error(result.error);
    return result.value;
  };
}

async function markDigested(statePath: string, existing: DigestState, ids: string[], at: string): Promise<void> {
  await saveDigestState(statePath, {
    digestedIds: [...existing.digestedIds, ...ids],
    lastDigestAt: at,
  });
}

async function composeAndPush(
  neurolink: NeuroLink | null,
  items: DigestCandidate[],
  key: string,
  now: () => string,
  overrides: DigestOverrides,
): Promise<Digest | null> {
  const generate = overrides.generate ?? (neurolink ? neurolinkGenerate(neurolink) : null);
  const digest = generate ? await composeDigest(generate, items) : fallbackDigest(items);
  const payload = buildPushPayload(digest, items, now(), Math.random().toString(36).slice(2, 15));
  try {
    await deliverPush(payload, { url: overrides.pushUrl ?? CONFIG.DIGEST_PUSH_URL, key, fetchFn: overrides.fetchFn });
    return digest;
  } catch (err) {
    console.warn(`  Push delivery failed — items roll into the next digest: ${String(err).slice(0, 150)}`);
    return null;
  }
}

/**
 * Corrupt state: NEVER silently re-bootstrap — that would mark the pending
 * backlog digested without sending it; a human decides. Absent state:
 * bootstrap by seeding the full current corpus, so the digest only ever
 * covers videos that arrive after the feature lands. Both cases return null
 * (nothing further to do this run).
 */
async function resolveDigestState(db: DatabaseSync, statePath: string, now: () => string): Promise<DigestState | null> {
  const loaded = await loadDigestState(statePath);
  if (loaded.kind === "corrupt") {
    console.error(`  digest state at ${statePath} is corrupt — refusing to run. Inspect or delete it to re-bootstrap.`);
    return null;
  }
  if (loaded.kind === "absent") {
    const allIds = (db.prepare("SELECT id FROM videos").all() as unknown as { id: string }[]).map((r) => r.id);
    await saveDigestState(statePath, { digestedIds: allIds, lastDigestAt: now() });
    console.log(`  Bootstrap: seeded ${allIds.length} existing video(s) as digested; nothing to send.`);
    return null;
  }
  return loaded.state;
}

function openSearchDbForDigest(dbPath: string): DatabaseSync | null {
  try {
    const db = openSearchDb(dbPath, { readonly: true });
    // Same guard the MCP server uses: an empty/mid-write file opens fine
    // readonly but has no schema — treat it as "no index yet", not a crash.
    if (!hasSearchSchema(db)) {
      db.close();
      return null;
    }
    return db;
  } catch {
    return null;
  }
}

/** Nothing sendable this run — persist content-less skips so they never resurface. */
async function markSkippedOnly(statePath: string, existing: DigestState, skippedIds: string[]): Promise<void> {
  if (skippedIds.length > 0) {
    await markDigested(statePath, existing, skippedIds, existing.lastDigestAt);
  }
  console.log("  No new learnings since last digest — no push.");
}

export async function runDigestAgent(neurolink: NeuroLink | null, overrides: DigestOverrides = {}): Promise<void> {
  console.log("\n=== Digest ===");
  const statePath = overrides.statePath ?? CONFIG.STATE.DIGEST_STATE;
  const now = overrides.now ?? (() => new Date().toISOString());

  const lockPath = overrides.lockPath ?? `${statePath}.lock`;
  if (!acquireDigestLock(lockPath)) {
    console.warn("  Another digest run holds the lock — skipping (items roll forward).");
    return;
  }

  const db = openSearchDbForDigest(overrides.dbPath ?? CONFIG.STATE.SEARCH_DB);
  if (db === null) {
    releaseDigestLock(lockPath);
    console.warn("  No search index yet (run search:index first) — skipping digest.");
    return;
  }

  try {
    const existing = await resolveDigestState(db, statePath, now);
    if (existing === null) return;

    const digested = new Set(existing.digestedIds);
    const { items, skippedIds } = selectCandidates(db, digested, overrides.topN ?? CONFIG.DIGEST_TOP_N);
    if (skippedIds.length > 0) {
      console.log(`  Skipping ${skippedIds.length} new video(s) with no extracted knowledge.`);
    }
    if (items.length === 0) {
      await markSkippedOnly(statePath, existing, skippedIds);
      return;
    }

    const key = overrides.pushKey ?? resolvePushKey(process.env);
    if (key === "") {
      console.warn("  No push key (DIGEST_PUSH_KEY or ~/.shooter/.env) — skipping digest, items roll forward.");
      return;
    }

    const digest = await composeAndPush(neurolink, items, key, now, overrides);
    if (digest === null) return;

    // Sent items are marked ONLY after a successful delivery (roll-forward);
    // content-less skipped ids are marked alongside so they never resurface.
    await markDigested(statePath, existing, [...items.map((i) => i.id), ...skippedIds], now());
    console.log(`  Digest pushed: ${items.length} learning(s) — "${digest.headline}"`);
  } finally {
    db.close();
    releaseDigestLock(lockPath);
  }
}

if (process.argv[1]?.endsWith("digest.js")) {
  const neurolink = new NeuroLink();
  runDigestAgent(neurolink)
    .catch((err) => {
      console.error("Digest failed:", err);
      process.exitCode = 1;
    })
    .finally(() => neurolink.shutdown());
}
