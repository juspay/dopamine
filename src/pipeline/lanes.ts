// src/pipeline/lanes.ts
import type { SourceItem, AcquiredAssets, SourceKind } from "../types/index.js";
import type { SourceCollector } from "../sources/types.js";

export interface LaneItem {
  item: SourceItem;
  assets: AcquiredAssets;
}

/** Outcome callbacks. They fire for every item that has a collector; who records what
 *  (Instagram's null is a silent skip, for example) is the caller's decision. */
export interface AcquireHooks {
  onFailure?(item: SourceItem, err: unknown): void;
  onEmpty?(item: SourceItem): void;
  onSuccess?(item: SourceItem): void;
}

/** A hook that throws is a bug in the caller's bookkeeping, never a reason to stop the lane. */
function fire(label: string, call: () => void): void {
  try {
    call();
  } catch (err) {
    console.error(`[lanes] ${label} hook threw: ${String(err).split("\n")[0]}`);
  }
}

/** Acquire assets for every item via its source's collector. Items with no
 *  registered collector, or whose acquire() returns null, are dropped.
 *  Bounded concurrency (default 4) caps simultaneous subprocesses / file handles. */
export async function acquireAll(
  items: SourceItem[],
  registry: Map<SourceKind, SourceCollector>,
  concurrency = 4,
  hooks: AcquireHooks = {},
): Promise<LaneItem[]> {
  const results: LaneItem[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const item = items[index++];
      const collector = registry.get(item.source);
      if (!collector) continue;
      let assets: AcquiredAssets | null;
      try {
        assets = await collector.acquire(item);
      } catch (err) {
        console.error(`[lanes] acquire failed for ${item.id}: ${String(err).split("\n")[0]}`);
        fire("onFailure", () => hooks.onFailure?.(item, err));
        continue;
      }
      if (assets === null) {
        fire("onEmpty", () => hooks.onEmpty?.(item));
        continue;
      }
      results.push({ item, assets });
      fire("onSuccess", () => hooks.onSuccess?.(item));
    }
  }

  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}
