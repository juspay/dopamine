// src/sources/store.ts
import { CONFIG } from "../pipeline/config.js";
import { loadState, writeJsonAtomic } from "../pipeline/state.js";
import type { MetadataEntry, SourceItem } from "../types/index.js";
import { igMetadataToSourceItem } from "./instagram/map.js";

/** Non-Instagram items by id. Instagram stays in metadata.json, in its own shape. */
export type SourceItemStore = Record<string, SourceItem>;

function asStore(raw: unknown): SourceItemStore {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as SourceItemStore) : {};
}

function isSourceItem(raw: unknown): raw is SourceItem {
  return typeof raw === "object" && raw !== null && "source" in raw && "id" in raw;
}

/**
 * Union `batch` into the non-Instagram store, keyed by id. New wins, absent ids are
 * kept, and a second call with the same batch changes nothing. Instagram items are
 * never written here: their records stay in metadata.json.
 */
export async function ingestSourceItems(
  batch: SourceItem[],
  storePath: string = CONFIG.STATE.SOURCE_ITEMS,
): Promise<{ added: number; updated: number; skipped: number; total: number }> {
  const store = asStore(await loadState<unknown>(storePath, {}));
  const incoming = new Map<string, SourceItem>();
  let skipped = 0;
  for (const item of batch) {
    if (!item?.id || item.source === "instagram") {
      skipped++;
      continue;
    }
    incoming.set(item.id, item);
  }
  const next: SourceItemStore = { ...store };
  let added = 0;
  let updated = 0;
  for (const [id, item] of incoming) {
    if (id in store) updated++;
    else added++;
    next[id] = item;
  }
  await writeJsonAtomic(storePath, next);
  return { added, updated, skipped, total: Object.keys(next).length };
}

/**
 * Every known item by id: metadata.json (Instagram entries, or already-mapped items)
 * plus the non-Instagram store. On an id present in both, the metadata.json entry wins.
 * A missing or unreadable file contributes nothing.
 */
export async function loadItemIndex(
  paths: { metadata?: string; store?: string } = {},
): Promise<Map<string, SourceItem>> {
  const rawMeta = await loadState<unknown>(paths.metadata ?? CONFIG.STATE.METADATA, []);
  const store = asStore(await loadState<unknown>(paths.store ?? CONFIG.STATE.SOURCE_ITEMS, {}));
  const index = new Map<string, SourceItem>(Object.entries(store));
  const entries: unknown[] = Array.isArray(rawMeta) ? rawMeta : [];
  for (const raw of entries) {
    if (raw === null || typeof raw !== "object") continue;
    const item = isSourceItem(raw) ? raw : igMetadataToSourceItem(raw as MetadataEntry);
    index.set(item.id, item);
  }
  return index;
}
