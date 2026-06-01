import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { getVideoFiles } from "../utils/video.js";
import type { VideoProperties, FfprobeOutput } from "../types/index.js";

/** Default concurrency for parallel ffprobe/thumbnail extraction. */
const DEFAULT_CONCURRENCY = 8;

/**
 * Process a single video: run ffprobe + ffmpeg thumbnail in parallel.
 * Returns the extracted properties or null on failure.
 */
async function processOneVideo(
  videoPath: string,
  thumbDir: string,
): Promise<{ filename: string; props: VideoProperties } | null> {
  const filename = path.basename(videoPath);
  const thumbPath = path.join(thumbDir, filename.replace(/\.mp4$/i, ".jpg"));

  try {
    // Run ffprobe and ffmpeg thumbnail concurrently for the same video
    const [probeResult] = await Promise.all([
      execa("ffprobe", [
        "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", videoPath,
      ]),
      execa("ffmpeg", [
        "-y", "-i", videoPath, "-ss", "1",
        "-vframes", "1", "-q:v", "2", thumbPath,
      ]).catch(() => {}), // Non-fatal
    ]);

    const probe = JSON.parse(probeResult.stdout) as FfprobeOutput;
    return { filename, props: extractProperties(probe) };
  } catch (err) {
    console.error(`  ERROR: ${filename}: ${err}`);
    return null;
  }
}

export async function runPropertiesAgent(): Promise<void> {
  await fs.mkdir(CONFIG.THUMB_DIR, { recursive: true });

  const properties = await loadState<Record<string, VideoProperties>>(
    CONFIG.STATE.PROPERTIES, {}
  );
  const videoFiles = await getVideoFiles(CONFIG.VIDEOS_DIR);
  let processed = 0, skipped = 0, failed = 0;

  // Separate files that need processing from those already done
  const toProcess: Array<{ index: number; videoPath: string }> = [];
  for (const [i, videoPath] of videoFiles.entries()) {
    const filename = path.basename(videoPath);
    if (filename in properties) {
      skipped++;
      console.log(`[${i + 1}/${videoFiles.length}] SKIP: ${filename}`);
    } else {
      toProcess.push({ index: i, videoPath });
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
      batch.map(({ videoPath }) => processOneVideo(videoPath, CONFIG.THUMB_DIR))
    );

    for (const [bIdx, result] of results.entries()) {
      const { index } = batch[bIdx];
      const filename = path.basename(batch[bIdx].videoPath);
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
  const videoStream = probe.streams?.find(s => s.codec_type === "video");
  let fps = 0;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    fps = den !== 0 ? Math.round((num / den) * 100) / 100 : 0;
  }
  // ffprobe emits width/height as numbers; String() handles both number and
  // undefined safely before parseInt so the parse always has a valid input.
  return {
    duration:  parseFloat(fmt.duration ?? "0"),
    width:     typeof videoStream?.width  === "number" ? videoStream.width  : parseInt(String(videoStream?.width  ?? "0"), 10),
    height:    typeof videoStream?.height === "number" ? videoStream.height : parseInt(String(videoStream?.height ?? "0"), 10),
    codec:     videoStream?.codec_name ?? "",
    file_size: parseInt(fmt.size ?? "0", 10),
    bitrate:   parseInt(fmt.bit_rate ?? "0", 10),
    fps,
  };
}
