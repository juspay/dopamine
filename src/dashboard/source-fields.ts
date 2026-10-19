// src/dashboard/source-fields.ts
//
// The per-item fields the dashboard derives from an item's source: where its video
// and thumbnail are, and the link back to the original. Instagram's results are
// unchanged from what data-builder produced before other sources existed.
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { localVideoPath } from "../sources/paths.js";
import type { SourceItem } from "../types/index.js";

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
