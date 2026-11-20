// src/sources/paths.ts
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import type { SourceItem } from "../types/index.js";

/**
 * Where an item's local video lives, or null when its source keeps none.
 * An id with no known item is treated as Instagram, as the dashboard always has.
 */
export function localVideoPath(item: SourceItem | undefined, filename: string): string | null {
  if (!item || item.source === "instagram") return path.join(CONFIG.VIDEOS_DIR, filename);
  if (item.source === "youtube") {
    return item.yt?.videoId ? path.join(CONFIG.YOUTUBE_VIDEOS_DIR, `${item.yt.videoId}.mp4`) : null;
  }
  if (item.source === "x") {
    return item.x?.tweetId && /^\d{1,25}$/.test(item.x.tweetId)
      ? path.join(CONFIG.X_VIDEOS_DIR, `${item.x.tweetId}.mp4`)
      : null;
  }
  return null;
}
