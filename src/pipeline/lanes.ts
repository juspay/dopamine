// src/pipeline/lanes.ts
import type { SourceItem, AcquiredAssets, SourceKind } from "../types/index.js";
import type { SourceCollector } from "../sources/types.js";

export interface LaneItem {
  item: SourceItem;
  assets: AcquiredAssets;
}

/** Acquire assets for every item via its source's collector. Items with no
 *  registered collector, or whose acquire() returns null, are dropped.
 *  Bounded concurrency (default 4) caps simultaneous subprocesses / file handles. */
export async function acquireAll(
  items: SourceItem[],
  registry: Map<SourceKind, SourceCollector>,
  concurrency = 4,
): Promise<LaneItem[]> {
  const results: LaneItem[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const item = items[index++];
      const collector = registry.get(item.source);
      if (!collector) continue;
      try {
        const assets = await collector.acquire(item);
        if (assets !== null) results.push({ item, assets });
      } catch (err) {
        console.error(`[lanes] acquire failed for ${item.id}: ${String(err).split("\n")[0]}`);
      }
    }
  }

  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}
