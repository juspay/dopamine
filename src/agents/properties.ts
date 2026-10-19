import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import type { LaneItem } from "../pipeline/lanes.js";
import { getVideoFiles } from "../utils/video.js";
import type { VideoProperties, FfprobeOutput } from "../types/index.js";

/** Default concurrency for parallel ffprobe/thumbnail extraction. */
const DEFAULT_CONCURRENCY = 8;

/**
 * Process a single video: run ffprobe + ffmpeg thumbnail in parallel.
 * Returns the extracted properties or null on failure.
 */
/** The thumbnail file for a properties key: `u_1.mp4` -> `u_1.jpg`, `youtube_abc` -> `youtube_abc.jpg`. */
export function thumbnailFileName(key: string): string {
  return `${key.replace(/\.mp4$/i, "")}.jpg`;
}

/**
 * Every video that needs properties, with the key it is stored under. Disk files keep their
 * basename. A lane video outside the saved-videos folder (YouTube's) is keyed by item id,
 * the same id the catalog and dashboard look it up by.
 */
export function propertiesTargets(diskFiles: string[], lane: LaneItem[]): Array<{ key: string; videoPath: string }> {
  const targets = new Map<string, string>();
  for (const videoPath of diskFiles) targets.set(path.basename(videoPath), videoPath);
  for (const { item, assets } of lane) {
    if (!assets.videoPath) continue;
    if (path.resolve(path.dirname(assets.videoPath)) === path.resolve(CONFIG.VIDEOS_DIR)) continue;
    if (!targets.has(item.id)) targets.set(item.id, assets.videoPath);
  }
  return [...targets].map(([key, videoPath]) => ({ key, videoPath }));
}

async function processOneVideo(
  videoPath: string,
  key: string,
  thumbDir: string,
): Promise<{ filename: string; props: VideoProperties } | null> {
  const filename = key;
  const thumbPath = path.join(thumbDir, thumbnailFileName(key));

  try {
    // Run ffprobe and ffmpeg thumbnail concurrently for the same video
    const [probeResult] = await Promise.all([
      execa("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", videoPath]),
      execa("ffmpeg", ["-y", "-i", videoPath, "-ss", "1", "-vframes", "1", "-q:v", "2", thumbPath]).catch(() => {}), // Non-fatal
    ]);

    const probe = JSON.parse(probeResult.stdout) as FfprobeOutput;
    return { filename, props: extractProperties(probe) };
  } catch (err) {
    console.error(`  ERROR: ${filename}: ${err}`);
    return null;
  }
}

export async function runPropertiesAgent(laneItems: LaneItem[] = []): Promise<void> {
  await fs.mkdir(CONFIG.THUMB_DIR, { recursive: true });

  const properties = await loadState<Record<string, VideoProperties>>(CONFIG.STATE.PROPERTIES, {});
  const videoFiles = propertiesTargets(await getVideoFiles(CONFIG.VIDEOS_DIR), laneItems);
  let processed = 0,
    skipped = 0,
    failed = 0;

  // Separate files that need processing from those already done
  const toProcess: Array<{ index: number; key: string; videoPath: string }> = [];
  for (const [i, { key, videoPath }] of videoFiles.entries()) {
    const filename = key;
    if (filename in properties) {
      skipped++;
      console.log(`[${i + 1}/${videoFiles.length}] SKIP: ${filename}`);
    } else {
      toProcess.push({ index: i, key, videoPath });
    }
  }

  if (toProcess.length === 0) {
    console.log(`\nProperties done. Processed: 0, Skipped: ${skipped}`);
    return;
  }

  const concurrency = parseInt(process.env.PROPERTIES_CONCURRENCY ?? String(DEFAULT_CONCURRENCY), 10);
  console.log(`Processing ${toProcess.length} videos (concurrency: ${concurrency})`);

  // Process in parallel batches
  for (let batchStart = 0; batchStart < toProcess.length; batchStart += concurrency) {
    const batch = toProcess.slice(batchStart, batchStart + concurrency);
    const results = await Promise.all(
      batch.map(({ videoPath, key }) => processOneVideo(videoPath, key, CONFIG.THUMB_DIR)),
    );

    for (const [bIdx, result] of results.entries()) {
      const { index, key: filename } = batch[bIdx];
      if (result) {
        properties[result.filename] = result.props;
        processed++;
        console.log(`[${index + 1}/${videoFiles.length}] OK: ${filename}`);
      } else {
        // ffprobe failed for this video — counted but not stored.
        // The video stays unrecorded so it will be retried next run.
        // Repeated failures here indicate a corrupt/unsupported file.
        failed++;
        console.warn(`[${index + 1}/${videoFiles.length}] FAIL (ffprobe error, will retry): ${filename}`);
      }
    }

    // Save after each batch -- resume mode guarantee
    await saveState(CONFIG.STATE.PROPERTIES, properties);
  }

  console.log(`\nProperties done. Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
}

function extractProperties(probe: FfprobeOutput): VideoProperties {
  const fmt = probe.format ?? {};
  const videoStream = probe.streams?.find((s) => s.codec_type === "video");
  let fps = 0;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    fps = den !== 0 ? Math.round((num / den) * 100) / 100 : 0;
  }
  // ffprobe emits width/height as numbers; String() handles both number and
  // undefined safely before parseInt so the parse always has a valid input.
  return {
    duration: parseFloat(fmt.duration ?? "0"),
    width: typeof videoStream?.width === "number" ? videoStream.width : parseInt(String(videoStream?.width ?? "0"), 10),
    height:
      typeof videoStream?.height === "number" ? videoStream.height : parseInt(String(videoStream?.height ?? "0"), 10),
    codec: videoStream?.codec_name ?? "",
    file_size: parseInt(fmt.size ?? "0", 10),
    bitrate: parseInt(fmt.bit_rate ?? "0", 10),
    fps,
  };
}
