import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { CONFIG } from "../pipeline/config.js";

const execFileAsync = promisify(execFile);

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
 * Extract up to maxFrames evenly-spaced JPEG frames from a video using ffmpeg.
 * Returns an array of Buffer objects (JPEG images).
 * Falls back to empty array if ffmpeg is unavailable or the file can't be processed.
 *
 * Why: NeuroLink's VideoProcessor has no frame limit and can produce >16 frames,
 * exceeding Vertex AI's image limit. This bypasses the VideoProcessor entirely.
 */
export async function extractVideoFrames(
  videoPath: string,
  maxFrames = 10
): Promise<Buffer[]> {
  const tmpDir = await mkdtemp(path.join(tmpdir(), "dopamine-frames-"));
  try {
    // Get video duration via ffprobe
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet", "-print_format", "json", "-show_streams",
      "-select_streams", "v:0", videoPath,
    ]);
    const probe = JSON.parse(stdout);
    const stream = probe.streams?.[0];
    const duration = parseFloat(stream?.duration ?? "0") ||
      (stream?.nb_frames ? parseFloat(stream.nb_frames) / parseFloat(stream.avg_frame_rate ?? "30") : 30);

    // Build evenly-spaced timestamps
    const timestamps: number[] = [];
    for (let i = 0; i < maxFrames; i++) {
      timestamps.push((duration * i) / maxFrames);
    }

    // Extract one frame at each timestamp
    for (let i = 0; i < timestamps.length; i++) {
      const outPath = path.join(tmpDir, `frame${String(i).padStart(3, "0")}.jpg`);
      await execFileAsync("ffmpeg", [
        "-ss", String(timestamps[i]),
        "-i", videoPath,
        "-frames:v", "1",
        "-vf", "scale=768:-1",
        "-q:v", "5",
        "-y", outPath,
      ], { timeout: 10_000 }).catch(() => null);  // ignore per-frame errors
    }

    const jpegFiles = (await readdir(tmpDir))
      .filter(f => f.endsWith(".jpg"))
      .sort();

    if (jpegFiles.length === 0) return [];

    return await Promise.all(jpegFiles.map(f => readFile(path.join(tmpDir, f))));
  } catch {
    return [];
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => null);
  }
}

/**
 * Read a video file and return it as a data URL suitable for passing to
 * NeuroLink's `input.images` array.  NeuroLink's messageBuilder parses the
 * data URI, extracts the `video/mp4` mime type, and sends it as a single
 * `inlineData` part to Gemini — which processes the video natively (audio,
 * temporal context, the works) instead of relying on frame extraction.
 *
 * Must only be called for files within the Gemini inline limit (~20 MB).
 * For larger files, fall back to a thumbnail.
 */
export async function readVideoAsDataUrl(videoPath: string): Promise<string> {
  const buffer = await fs.readFile(videoPath);
  return `data:video/mp4;base64,${buffer.toString("base64")}`;
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
