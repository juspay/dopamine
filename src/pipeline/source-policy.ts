// src/pipeline/source-policy.ts
//
// What the pipeline does with the items a collector returns, beyond Instagram:
// store them, pick this run's slice, and record how acquiring each one went.
// Instagram items pass through every function here exactly as they came in.
import { type AttemptLedger, recordEmpty, recordFailure, recordSuccess } from "../sources/attempts.js";
import { type HealthFile, type SourceOutcome, failingSources, recordSourceRun } from "../sources/health.js";
import { type SelectOptions, selectPending } from "../sources/select.js";
import { type SourceCollector, SourceUnavailableError } from "../sources/types.js";
import type { SourceItem, SourceKind } from "../types/index.js";
import type { AcquireHooks } from "./lanes.js";

export interface PolicyDeps {
  now: Date;
  max: number;
  since?: Date;
  store: (batch: SourceItem[]) => Promise<unknown>;
  done: ReadonlySet<string>;
  ledger: AttemptLedger;
}

/** Instagram items first, in their original order; then each other source's slice for this run. */
export async function applySourcePolicy(
  collected: SourceItem[],
  deps: PolicyDeps,
): Promise<{ items: SourceItem[]; remaining: Record<string, number> }> {
  const instagram = collected.filter((i) => i.source === "instagram");
  const others = collected.filter((i) => i.source !== "instagram");
  if (others.length > 0) await deps.store(others);

  const bySource = new Map<SourceKind, SourceItem[]>();
  for (const item of others) bySource.set(item.source, [...(bySource.get(item.source) ?? []), item]);

  const selectedAll: SourceItem[] = [];
  const remaining: Record<string, number> = {};
  for (const [source, items] of bySource) {
    const { selected, remaining: left } = selectPending(items, deps);
    selectedAll.push(...selected);
    remaining[source] = left;
  }
  return { items: [...instagram, ...selectedAll], remaining };
}

/**
 * Everything a collector's batch is missing: the stored items of enabled non-Instagram
 * sources that were not in it. A collector that only reports what is new (the X harvester)
 * would otherwise strand the rest of a backlog in the store. The batch's own copy of an item
 * wins over the stored one; already-done items are dropped later, by selectPending.
 */
export function mergeWithStored(
  batch: SourceItem[],
  stored: ReadonlyMap<string, SourceItem>,
  enabled: ReadonlySet<SourceKind>,
): SourceItem[] {
  const inBatch = new Set(batch.map((i) => i.id));
  const extra = [...stored.values()].filter(
    (i) => i.source !== "instagram" && enabled.has(i.source) && !inBatch.has(i.id),
  );
  return [...batch, ...extra];
}

/** How acquiring went for one source this run. */
export interface AcquireTally {
  ok: number;
  failed: string[];
  firstError: string | null;
}

/** This many failures with no success from the same source in one run read as the source being down. */
export const OUTAGE_MIN_FAILURES = 3;

/**
 * Record how acquiring each non-Instagram item went. A SourceUnavailableError never touches the
 * ledger. `tallies` also counts, per source, what worked and what failed, so a run where nothing
 * worked can be recognised afterwards by settleAcquire.
 */
export function acquireHooksFor(
  ledgerRef: { current: AttemptLedger },
  now: () => Date,
  onOutage?: (source: SourceKind, err: SourceUnavailableError) => void,
  tallies?: Map<SourceKind, AcquireTally>,
): AcquireHooks {
  const tallyOf = (source: SourceKind): AcquireTally | undefined => {
    if (!tallies) return undefined;
    const existing = tallies.get(source);
    if (existing) return existing;
    const fresh: AcquireTally = { ok: 0, failed: [], firstError: null };
    tallies.set(source, fresh);
    return fresh;
  };
  return {
    onFailure(item, err) {
      if (item.source === "instagram") return;
      if (err instanceof SourceUnavailableError) {
        onOutage?.(item.source, err);
        return;
      }
      const tally = tallyOf(item.source);
      if (tally) {
        tally.failed.push(item.id);
        tally.firstError ??= (err instanceof Error ? err.message : String(err)).split("\n")[0];
      }
      ledgerRef.current = recordFailure(ledgerRef.current, item.id, err, now());
    },
    onEmpty(item) {
      if (item.source === "instagram") return;
      ledgerRef.current = recordEmpty(ledgerRef.current, item.id, now());
    },
    onSuccess(item) {
      if (item.source === "instagram") return;
      const tally = tallyOf(item.source);
      if (tally) tally.ok += 1;
      ledgerRef.current = recordSuccess(ledgerRef.current, item.id);
    },
  };
}

/**
 * Sources where several items failed and none worked are down, not full of bad items. Their
 * failures are taken back out of the ledger, so a dead tool or expired login cannot quarantine
 * the backlog 25 items at a time, and they are returned for the caller to record as a source
 * failure (which is what raises the alert).
 */
export function settleAcquire(
  tallies: ReadonlyMap<SourceKind, AcquireTally>,
  ledgerRef: { current: AttemptLedger },
  before: AttemptLedger,
): Array<{ source: SourceKind; error: string }> {
  const outages: Array<{ source: SourceKind; error: string }> = [];
  for (const [source, tally] of tallies) {
    if (tally.ok > 0 || tally.failed.length < OUTAGE_MIN_FAILURES) continue;
    const next = { ...ledgerRef.current };
    for (const id of tally.failed) {
      if (id in before) next[id] = before[id];
      else delete next[id];
    }
    ledgerRef.current = next;
    outages.push({ source, error: tally.firstError ?? "every acquisition failed" });
  }
  return outages;
}

export interface PreviewOptions extends Omit<SelectOptions, "max"> {
  max: number;
}

/**
 * What a first live run would take, per non-Instagram source, without storing or
 * acquiring anything. The Instagram collector is never called: it runs scrapers.
 */
export async function previewSources(
  collectors: SourceCollector[],
  o: PreviewOptions,
): Promise<Record<string, { listed: number; pending: number; wouldSelect: number }>> {
  const out: Record<string, { listed: number; pending: number; wouldSelect: number }> = {};
  for (const collector of collectors) {
    if (collector.source === "instagram") continue;
    const items = await collector.collect();
    const pending = selectPending(items, { ...o, max: Number.MAX_SAFE_INTEGER }).selected.length;
    out[collector.source] = {
      listed: items.length,
      pending,
      wouldSelect: selectPending(items, o).selected.length,
    };
  }
  return out;
}

/** SOURCE_SINCE as a Date; a value that is not a date is ignored with a warning. */
export function parseSince(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    console.warn(`[sources] SOURCE_SINCE "${value}" is not a date; ignoring it.`);
    return undefined;
  }
  return date;
}

/** Fold this run's per-source outcomes into the health file and list the sources to alert about. */
export function finishSourceRun(
  outcomes: ReadonlyMap<string, SourceOutcome>,
  d: { health: HealthFile; now: Date },
): { health: HealthFile; failing: string[] } {
  if (outcomes.size === 0) return { health: d.health, failing: [] };
  let health = d.health;
  for (const [source, outcome] of outcomes) health = recordSourceRun(health, source, outcome, d.now);
  return { health, failing: failingSources(health, d.now) };
}
