import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";

/**
 * Return sorted list of absolute paths to .mp4 files in the given directory.
 * Mirrors: sorted([f for f in os.listdir(VIDEO_DIR) if f.lower().endswith(".mp4")])
 */
export async function getVideoFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter(f => f.toLowerCase().endsWith(".mp4"))
      .sort()
      .map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

/**
 * Extract the Instagram pk from a filename like "username_pk.mp4".
 * The pk is the numeric part after the last underscore.
 * Mirrors: parts = f.rsplit("_", 1); if len(parts) == 2 and parts[1].isdigit(): ...
 */
export function extractPkFromFilename(filename: string): string | null {
  const stem = filename.replace(/\.mp4$/i, "");
  const lastUnderscore = stem.lastIndexOf("_");
  if (lastUnderscore === -1) return null;
  const pk = stem.slice(lastUnderscore + 1);
  return /^\d+$/.test(pk) ? pk : null;
}

/**
 * Get thumbnail path for a video filename.
 * Returns the absolute path if the thumbnail exists, null otherwise.
 * Mirrors: THUMB_DIR / stem + ".jpg"
 */
export async function getThumbnailPath(filename: string): Promise<string | null> {
  const thumbFilename = filename.replace(/\.mp4$/i, ".jpg");
  const thumbPath = path.join(CONFIG.THUMB_DIR, thumbFilename);
  try {
    await fs.access(thumbPath);
    return thumbPath;
  } catch {
    return null;
  }
}
