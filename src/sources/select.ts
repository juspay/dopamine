// src/sources/select.ts
//
// Which of a source's items this run should work on: not done, not waiting in the
// retry ledger, no older than SOURCE_SINCE, and no more than the per-run cap.
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";
import type { SourceItem } from "../types/index.js";
import { type AttemptLedger, isEligible } from "./attempts.js";

/** Ids that already have a knowledge-base entry without an error. */
export async function loadDoneIds(path: string = CONFIG.STATE.KNOWLEDGE_BASE): Promise<Set<string>> {
  const raw = await loadState<unknown>(path, {});
  const done = new Set<string>();
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return done;
  for (const [id, entry] of Object.entries(raw)) {
    if (entry !== null && typeof entry === "object" && !(entry as { error?: unknown }).error) done.add(id);
  }
  return done;
}

export interface SelectOptions {
  done: ReadonlySet<string>;
  ledger: AttemptLedger;
  now: Date;
  max: number;
  since?: Date;
}

/**
 * Keeps the feed's own order (newest saved first), so a backlog drains from the
 * newest end. An item with no readable `published_at` is never dropped by `since`.
 */
export function selectPending(
  items: readonly SourceItem[],
  o: SelectOptions,
): { selected: SourceItem[]; remaining: number } {
  const seen = new Set<string>();
  const pending: SourceItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (o.done.has(item.id) || !isEligible(o.ledger, item.id, o.now)) continue;
    if (o.since && item.published_at !== null) {
      const published = Date.parse(item.published_at);
      if (!Number.isNaN(published) && published < o.since.getTime()) continue;
    }
    pending.push(item);
  }
  const selected = pending.slice(0, Math.max(0, o.max));
  return { selected, remaining: pending.length - selected.length };
}
