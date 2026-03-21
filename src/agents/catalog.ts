/**
 * CatalogAgent — port of generate_catalog.py
 *
 * Reads metadata.json, video_properties.json, classifications.json.
 * Matches entries by pk extracted from filename.
 * Outputs catalog.json (array of unified records) and catalog.csv.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { loadState, saveState } from "../pipeline/state.js";
import type { MetadataEntry, VideoProperties } from "../types/index.js";

/** Shape of a single classification entry as written by ClassifierAgent. */
interface ClassificationEntry {
  pk?: string | null;
  username?: string | null;
  category?: string;
  subcategory?: string;
  tags?: string[];
  description?: string;
  language?: string;
  mood?: string;
}

/** A single unified catalog record. */
export interface CatalogRecord {
  filename: string;
  category: string;
  subcategory: string;
  tags: string[];
  description: string;
  duration_seconds: number;
  resolution: string;
  file_size_mb: number;
  instagram_user: string;
  caption: string;
  hashtags: string[];
  language: string;
  mood: string;
  taken_at: string;
  like_count: number;
  comment_count: number;
}

/** Extract hashtags from caption text. */
function extractHashtags(caption: string): string[] {
  if (!caption) return [];
  const matches = caption.match(/#(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

/** Extract username and pk from filename pattern: {username}_{pk}.mp4 */
function parseFilename(filename: string): { username: string | null; pk: string | null } {
  const match = filename.match(/^(.+)_(\d+)\.mp4$/);
  if (match) {
    return { username: match[1], pk: match[2] };
  }
  return { username: null, pk: null };
}

/** Escape a value for CSV — wraps in quotes if it contains comma, quote, or newline. */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export async function runCatalogAgent(): Promise<void> {
  console.log("\n=== CatalogAgent ===");

  // Load all input data
  const metadataList = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
  const videoProps = await loadState<Record<string, VideoProperties>>(
    CONFIG.STATE.PROPERTIES,
    {}
  );
  const classifications = await loadState<Record<string, ClassificationEntry>>(
    CONFIG.STATE.CLASSIFICATIONS,
    {}
  );

  console.log(`  metadata.json: ${metadataList.length} entries`);
  console.log(`  video_properties.json: ${Object.keys(videoProps).length} entries`);
  console.log(`  classifications.json: ${Object.keys(classifications).length} entries`);

  // Index metadata by pk (string)
  const metaByPk = new Map<string, MetadataEntry>();
  for (const entry of metadataList) {
    const pk = String(entry.pk ?? "");
    if (pk) {
      metaByPk.set(pk, entry);
    }
  }

  // Build catalog from classifications (one per video file)
  const catalog: CatalogRecord[] = [];

  const sortedFilenames = Object.keys(classifications).sort();

  for (const filename of sortedFilenames) {
    const cls = classifications[filename];
    const props = videoProps[filename];

    // Try to find Instagram metadata
    // 1. Use pk from classification if available
    // 2. Parse pk from filename
    let meta: MetadataEntry | undefined;
    const clsPk = cls.pk;
    if (clsPk) {
      meta = metaByPk.get(String(clsPk));
    }
    if (!meta) {
      const { pk: filePk } = parseFilename(filename);
      if (filePk) {
        meta = metaByPk.get(filePk);
      }
    }

    const caption = meta?.caption_text ?? "";
    const hashtags = extractHashtags(caption);

    const width = props?.width ?? 0;
    const height = props?.height ?? 0;
    const resolution = width && height ? `${width}x${height}` : "";
    const fileSizeMb = props?.file_size
      ? Math.round((props.file_size / (1024 * 1024)) * 100) / 100
      : 0;

    const record: CatalogRecord = {
      filename,
      category: cls.category ?? "",
      subcategory: cls.subcategory ?? "",
      tags: cls.tags ?? [],
      description: cls.description ?? "",
      duration_seconds: props?.duration ?? 0,
      resolution,
      file_size_mb: fileSizeMb,
      instagram_user: cls.username ?? meta?.username ?? "",
      caption,
      hashtags,
      language: cls.language ?? "",
      mood: cls.mood ?? "",
      taken_at: meta?.taken_at ?? "",
      like_count: meta?.like_count ?? 0,
      comment_count: meta?.comment_count ?? 0,
    };
    catalog.push(record);
  }

  // Save JSON
  await saveState(CONFIG.STATE.CATALOG, catalog);
  console.log(`Saved ${CONFIG.STATE.CATALOG} (${catalog.length} records)`);

  // Save CSV
  const fieldnames = [
    "filename",
    "category",
    "subcategory",
    "tags",
    "description",
    "duration_seconds",
    "resolution",
    "file_size_mb",
    "instagram_user",
    "caption",
    "hashtags",
    "language",
    "mood",
    "taken_at",
    "like_count",
    "comment_count",
  ] as const;

  const csvLines: string[] = [];
  csvLines.push(fieldnames.join(","));

  for (const record of catalog) {
    const row = fieldnames.map((field) => {
      const value = record[field];
      if (Array.isArray(value)) {
        return csvEscape(value.join(";"));
      }
      return csvEscape(String(value));
    });
    csvLines.push(row.join(","));
  }

  await fs.mkdir(path.dirname(CONFIG.STATE.CATALOG_CSV), { recursive: true });
  await fs.writeFile(CONFIG.STATE.CATALOG_CSV, csvLines.join("\n"), "utf8");
  console.log(`Saved ${CONFIG.STATE.CATALOG_CSV} (${catalog.length} records)`);

  // Summary stats
  console.log(`\n=== Summary ===`);
  console.log(`Total videos: ${catalog.length}`);
  const categoryCounts = new Map<string, number>();
  for (const r of catalog) {
    const cat = r.category || "(uncategorized)";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }
  console.log(`\nCategories (${categoryCounts.size}):`);
  const sortedCats = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCats) {
    console.log(`  ${cat}: ${count}`);
  }
}
