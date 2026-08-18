// src/pipeline/refresh.ts
//
// Decides whether an already-processed item should be processed again.
//
// The research and verification agents both ran pure resume-mode: any entry
// without an `error` was skipped forever. That made their results write-once —
// 84% of URL liveness checks and 75% of verification verdicts were still the
// ones computed in 2026-05, so /tools rendered months-old live/dead status and
// a `not_verified` verdict could never be revisited.
//
// A plain TTL would fix staleness but hand the first run afterwards a bill for
// the entire backlog at once. The per-run cap bounds that: the backlog drains a
// slice at a time while steady-state cost stays flat.

/** How aggressively a run re-checks work it has already done. */
export interface RefreshPolicy {
  /** Entries older than this are eligible to be redone. */
  ttlDays: number;
  /** Most stale entries one run will redo. 0 disables refreshing. */
  maxPerRun: number;
  /** Injectable clock; defaults to now. */
  now?: Date;
}

export type RefreshReason = "absent" | "error" | "stale" | "fresh" | "budget";

export interface RefreshDecision {
  reprocess: boolean;
  reason: RefreshReason;
}

export interface RefreshGate {
  /** Decide one item. `timestampField` names the entry's own "when did we last
   *  do this" field — `researched_at`, `verified_at`, and so on. */
  decide(entry: unknown, timestampField: string): RefreshDecision;
  /** Stale entries redone so far this run. */
  refreshedCount(): number;
}

const DAY_MS = 86_400_000;

function readTimestamp(entry: object, field: string): number {
  const raw = (entry as Record<string, unknown>)[field];
  return typeof raw === "string" ? Date.parse(raw) : Number.NaN;
}

function hasError(entry: object): boolean {
  return Boolean((entry as Record<string, unknown>).error);
}

export function makeRefreshGate(policy: RefreshPolicy): RefreshGate {
  const now = (policy.now ?? new Date()).getTime();
  const ttlMs = policy.ttlDays * DAY_MS;
  let refreshed = 0;

  return {
    decide(entry: unknown, timestampField: string): RefreshDecision {
      if (entry === null || entry === undefined || typeof entry !== "object") {
        return { reprocess: true, reason: "absent" };
      }
      // Errors were always retried; keep that, and keep it off the refresh
      // budget so a run full of failures still makes progress on staleness.
      if (hasError(entry)) return { reprocess: true, reason: "error" };

      const at = readTimestamp(entry, timestampField);
      // No usable timestamp means the entry's age is unknowable. Redo it once:
      // that writes a timestamp, and it ages normally from then on.
      const stale = Number.isNaN(at) || now - at > ttlMs;
      if (!stale) return { reprocess: false, reason: "fresh" };

      if (refreshed >= policy.maxPerRun) return { reprocess: false, reason: "budget" };
      refreshed++;
      return { reprocess: true, reason: "stale" };
    },
    refreshedCount: () => refreshed,
  };
}
