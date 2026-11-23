// src/dashboard/source-fields.ts
//
// The per-item fields the dashboard derives from an item's source: where its video
// and thumbnail are, and the link back to the original. Instagram's results are
// unchanged from what data-builder produced before other sources existed.
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { localVideoPath } from "../sources/paths.js";
import type { MetadataEntry, SourceItem } from "../types/index.js";

export type FileExists = (p: string) => Promise<boolean>;

/** The watch or post url for a non-Instagram item. Instagram's item url is an expiring CDN link. */
export function sourceUrlFor(item: SourceItem | undefined): string | null {
  return item && item.source !== "instagram" ? item.url : null;
}

/** `hasVideo` and the web path the player uses, from where the item's source keeps its video. */
export async function resolveVideoFile(
  item: SourceItem | undefined,
  filename: string,
  exists: FileExists,
): Promise<{ hasVideo: boolean; videoPath: string | null }> {
  const file = localVideoPath(item, filename);
  if (file === null || !(await exists(file))) return { hasVideo: false, videoPath: null };
  const relative = path.relative(path.resolve("videos"), file).split(path.sep);
  const name = relative.pop() ?? filename;
  return { hasVideo: true, videoPath: `/videos/${[...relative, encodeURIComponent(name)].join("/")}` };
}

/**
 * The thumbnail's web path. An Instagram item always gets its path, as before. Another
 * source's item gets an empty string when no thumbnail file exists, so the page can show
 * a placeholder instead of a broken image.
 */
export async function resolveThumb(item: SourceItem | undefined, stem: string, exists: FileExists): Promise<string> {
  const webPath = `/videos/thumbnails/${stem}.jpg`;
  if (!item || item.source === "instagram") return webPath;
  return (await exists(path.join(CONFIG.THUMB_DIR, `${stem}.jpg`))) ? webPath : "";
}

/**
 * The creator to show. Instagram's comes from the classification and catalog lookups; another
 * source's is its channel or handle (without a leading @), which those lookups never have.
 */
export function creatorFor(item: SourceItem | undefined, found: string): string {
  if (!item || item.source === "instagram") return found;
  const author = (item.author ?? "").replace(/^@/, "").trim();
  return author || found;
}

/**
 * Instagram posts by the file name of each of their videos. Some older downloads of
 * multi-video posts were saved under the video's CDN file name instead of
 * `{username}_{pk}.mp4`, so this is the only way back to their post. A file name that two
 * different accounts share is left out rather than guessed.
 */
export function metadataByVideoFile(metadata: MetadataEntry[]): Map<string, MetadataEntry> {
  const found = new Map<string, MetadataEntry>();
  const ambiguous = new Set<string>();
  for (const entry of metadata) {
    const urls = [entry.video_url, ...(entry.resources ?? []).map((r) => r.video_url)];
    for (const url of urls) {
      const name = videoFileName(url);
      if (!name || ambiguous.has(name)) continue;
      const other = found.get(name);
      if (other && other.username !== entry.username) {
        found.delete(name);
        ambiguous.add(name);
      } else if (!other) {
        found.set(name, entry);
      }
    }
  }
  return found;
}

function videoFileName(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return path.posix.basename(new URL(url).pathname) || null;
  } catch {
    return null;
  }
}

/** The date to show: the catalog's, else a non-Instagram item's publish date, else nothing. */
export function dateFor(item: SourceItem | undefined, catalogDate: string): string {
  if (catalogDate) return catalogDate;
  if (!item || item.source === "instagram") return catalogDate;
  return item.published_at ?? "";
}
