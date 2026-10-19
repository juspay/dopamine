// src/sources/attempts.ts
//
// Per-item ledger for non-Instagram sources: which items failed, came back empty,
// or are quarantined. Every record function is pure and returns a new ledger.
import { CONFIG } from "../pipeline/config.js";
import { loadState, writeJsonAtomic } from "../pipeline/state.js";

export type AttemptState = "failed" | "empty" | "quarantined";

/** What an item's attempts were counting: failures, or acquisitions that came back empty. */
export type AttemptKind = "failed" | "empty";

export interface AttemptRecord {
  state: AttemptState;
  /** What `attempts` counts. A quarantined item keeps the kind it was quarantined for. */
  kind: AttemptKind;
  attempts: number;
  last_error: string | null;
  last_attempt: string;
  /** When the item may be tried again; null means right away. */
  next_eligible: string | null;
}

export type AttemptLedger = Record<string, AttemptRecord>;

export const MAX_FAILURES = 5;
export const QUARANTINE_DAYS = 30;
export const EMPTY_RECHECK_DAYS = 7;
export const EMPTY_MAX_RECHECKS = 4;

const DAY_MS = 86_400_000;
const ERROR_MAX_CHARS = 200;

const plusDays = (now: Date, days: number): string => new Date(now.getTime() + days * DAY_MS).toISOString();

function firstLine(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.split("\n")[0].slice(0, ERROR_MAX_CHARS);
}

/**
 * Attempts of the same kind in a row. Switching kind starts a new count, and so does a
 * quarantine that has run its course: release is a fresh start, not one last try.
 */
function priorAttempts(ledger: AttemptLedger, id: string, kind: AttemptKind, now: Date): number {
  const prev = ledger[id];
  if (!prev) return 0;
  if (prev.state === "quarantined" && prev.next_eligible !== null && now.getTime() >= Date.parse(prev.next_eligible)) {
    return 0;
  }
  const prevKind: AttemptKind = prev.kind ?? (prev.state === "empty" ? "empty" : "failed");
  return prevKind === kind ? prev.attempts : 0;
}

function quarantined(kind: AttemptKind, attempts: number, error: string | null, now: Date): AttemptRecord {
  return {
    state: "quarantined",
    kind,
    attempts,
    last_error: error,
    last_attempt: now.toISOString(),
    next_eligible: plusDays(now, QUARANTINE_DAYS),
  };
}

export function recordFailure(ledger: AttemptLedger, id: string, err: unknown, now: Date): AttemptLedger {
  const attempts = priorAttempts(ledger, id, "failed", now) + 1;
  const error = firstLine(err);
  const record: AttemptRecord =
    attempts >= MAX_FAILURES
      ? quarantined("failed", attempts, error, now)
      : {
          state: "failed",
          kind: "failed",
          attempts,
          last_error: error,
          last_attempt: now.toISOString(),
          next_eligible: null,
        };
  return { ...ledger, [id]: record };
}

export function recordEmpty(ledger: AttemptLedger, id: string, now: Date): AttemptLedger {
  const attempts = priorAttempts(ledger, id, "empty", now) + 1;
  const record: AttemptRecord =
    attempts > EMPTY_MAX_RECHECKS
      ? quarantined("empty", attempts, null, now)
      : {
          state: "empty",
          kind: "empty",
          attempts,
          last_error: null,
          last_attempt: now.toISOString(),
          next_eligible: plusDays(now, EMPTY_RECHECK_DAYS),
        };
  return { ...ledger, [id]: record };
}

export function recordSuccess(ledger: AttemptLedger, id: string): AttemptLedger {
  const { [id]: _removed, ...rest } = ledger;
  return rest;
}

export function isEligible(ledger: AttemptLedger, id: string, now: Date): boolean {
  const record = ledger[id];
  if (!record || record.next_eligible === null) return true;
  return now.getTime() >= Date.parse(record.next_eligible);
}

export async function loadLedger(path: string = CONFIG.STATE.SOURCE_ATTEMPTS): Promise<AttemptLedger> {
  const raw = await loadState<unknown>(path, {});
  return raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as AttemptLedger) : {};
}

export async function saveLedger(ledger: AttemptLedger, path: string = CONFIG.STATE.SOURCE_ATTEMPTS): Promise<void> {
  await writeJsonAtomic(path, ledger);
}
