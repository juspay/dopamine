// src/pipeline/ingest.ts
import { CONFIG } from "./config.js";
import { loadState, saveState } from "./state.js";
import type { MetadataEntry } from "../types/index.js";

type MaybeLegacy = MetadataEntry | { ig?: MetadataEntry };

/** Accept either a MetadataEntry or a legacy SourceItem (pk under `.ig`). */
function toEntry(raw: MaybeLegacy): MetadataEntry | null {
  if (raw && typeof raw === "object" && "pk" in raw && (raw as MetadataEntry).pk) {
    return raw as MetadataEntry;
  }
  const ig = (raw as { ig?: MetadataEntry })?.ig;
  return ig && ig.pk ? ig : null;
}

const sortKey = (e: MetadataEntry): number => (e.taken_at ? Date.parse(e.taken_at) : 0);

/**
 * Union `batch` into the canonical metadata store (videos/metadata.json) keyed
 * by pk. New batch entries win on conflict; existing entries absent from the
 * batch are preserved. Idempotent. Both capture paths (incremental instagrapi
 * and the browser piggyback harvester) call this.
 *
 * `storePath` is injectable so tests never touch the real store.
 */
export async function ingestMetadata(
  batch: MetadataEntry[],
  storePath: string = CONFIG.STATE.METADATA,
): Promise<{ added: number; updated: number; total: number }> {
  const existing = await loadState<MaybeLegacy[]>(storePath, []);
  const byPk = new Map<string, MetadataEntry>();
  for (const raw of existing) {
    const e = toEntry(raw);
    if (e) byPk.set(String(e.pk), e);
  }
  let added = 0;
  let updated = 0;
  for (const e of batch) {
    if (!e || !e.pk) continue;
    const key = String(e.pk);
    if (byPk.has(key)) updated++;
    else added++;
    byPk.set(key, e); // new wins
  }
  const merged = [...byPk.values()].sort((a, b) => sortKey(b) - sortKey(a));
  await saveState(storePath, merged);
  return { added, updated, total: merged.length };
}
