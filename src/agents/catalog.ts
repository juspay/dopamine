/**
 * CatalogAgent — port of generate_catalog.py
 *
 * Reads metadata.json (SourceItem[] or legacy MetadataEntry[]), video_properties.json,
 * classifications.json. Emits catalog.json (array of unified records) and catalog.csv.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { loadState, saveState } from "../pipeline/state.js";
import { igMetadataToSourceItem } from "../sources/instagram/map.js";
import type { MetadataEntry, VideoProperties, SourceItem } from "../types/index.js";

interface ClassificationEntry {
  pk?: string | null; username?: string | null; category?: string; subcategory?: string;
  tags?: string[]; description?: string; language?: string; mood?: string;
}

export interface CatalogRecord {
  filename: string; source: string; content_type: string; author: string;
  category: string; subcategory: string; tags: string[]; description: string;
  duration_seconds: number; resolution: string; file_size_mb: number;
  instagram_user: string; caption: string; hashtags: string[];
  language: string; mood: string; taken_at: string; like_count: number; comment_count: number;
}

function extractHashtags(caption: string): string[] {
  if (!caption) return [];
  const m = caption.match(/#(\w+)/g);
  return m ? m.map((x) => x.slice(1)) : [];
}
function parseFilenameUser(filename: string): string | null {
  const m = filename.match(/^(.+)_(\d+)\.mp4$/);
  return m ? m[1] : null;
}
function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

/** metadata.json may hold SourceItems (new) or legacy MetadataEntry[] — normalize. */
function asSourceItem(e: SourceItem | MetadataEntry): SourceItem {
  return "source" in e && "id" in e ? (e as SourceItem) : igMetadataToSourceItem(e as MetadataEntry);
}

/** Build one catalog record (pure; exported for testing). */
export function buildCatalogRecord(
  filename: string,
  cls: ClassificationEntry,
  props: VideoProperties | undefined,
  item: SourceItem | undefined,
): CatalogRecord {
  const ig = item?.ig;
  const caption = ig?.caption_text ?? item?.caption_text ?? "";
  const width = props?.width ?? 0;
  const height = props?.height ?? 0;
  const source = item?.source ?? "instagram";
  const instagram_user =
    source === "instagram" ? (cls.username ?? ig?.username ?? parseFilenameUser(filename) ?? "") : "";
  return {
    filename,
    source,
    content_type: item?.content_type ?? "short_video",
    author: item?.author ?? "",
    category: cls.category ?? "",
    subcategory: cls.subcategory ?? "",
    tags: cls.tags ?? [],
    description: cls.description ?? "",
    duration_seconds: props?.duration ?? item?.duration_seconds ?? 0,
    resolution: width && height ? `${width}x${height}` : "",
    file_size_mb: props?.file_size ? Math.round((props.file_size / (1024 * 1024)) * 100) / 100 : 0,
    instagram_user,
    caption,
    hashtags: extractHashtags(caption),
    language: cls.language ?? "",
    mood: cls.mood ?? "",
    taken_at: ig?.taken_at ?? item?.published_at ?? "",
    like_count: ig?.like_count ?? 0,
    comment_count: ig?.comment_count ?? 0,
  };
}

export async function runCatalogAgent(): Promise<void> {
  console.log("\n=== CatalogAgent ===");
  const rawMeta = await loadState<Array<SourceItem | MetadataEntry>>(CONFIG.STATE.METADATA, []);
  const items = rawMeta.map(asSourceItem);
  const itemById = new Map(items.map((it) => [it.id, it] as const));
  const videoProps = await loadState<Record<string, VideoProperties>>(CONFIG.STATE.PROPERTIES, {});
  const classifications = await loadState<Record<string, ClassificationEntry>>(CONFIG.STATE.CLASSIFICATIONS, {});

  console.log(`  metadata.json: ${items.length} entries`);
  console.log(`  classifications.json: ${Object.keys(classifications).length} entries`);

  const catalog: CatalogRecord[] = Object.keys(classifications)
    .sort()
    .map((filename) =>
      buildCatalogRecord(filename, classifications[filename], videoProps[filename], itemById.get(filename)),
    );

  await saveState(CONFIG.STATE.CATALOG, catalog);
  console.log(`Saved ${CONFIG.STATE.CATALOG} (${catalog.length} records)`);

  const fieldnames = [
    "filename", "source", "content_type", "author", "category", "subcategory", "tags",
    "description", "duration_seconds", "resolution", "file_size_mb", "instagram_user",
    "caption", "hashtags", "language", "mood", "taken_at", "like_count", "comment_count",
  ] as const;
  const lines = [fieldnames.join(",")];
  for (const r of catalog) {
    lines.push(
      fieldnames
        .map((f) => {
          const v = r[f];
          return Array.isArray(v) ? csvEscape(v.join(";")) : csvEscape(String(v));
        })
        .join(","),
    );
  }
  await fs.mkdir(path.dirname(CONFIG.STATE.CATALOG_CSV), { recursive: true });
  await fs.writeFile(CONFIG.STATE.CATALOG_CSV, lines.join("\n"), "utf8");
  console.log(`Saved ${CONFIG.STATE.CATALOG_CSV} (${catalog.length} records)`);
}
