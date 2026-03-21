import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { getVideoFiles } from "../utils/video.js";
import type { VideoProperties, FfprobeOutput } from "../types/index.js";

export async function runPropertiesAgent(): Promise<void> {
  await fs.mkdir(CONFIG.THUMB_DIR, { recursive: true });

  const properties = await loadState<Record<string, VideoProperties>>(
    CONFIG.STATE.PROPERTIES, {}
  );
  const videoFiles = await getVideoFiles(CONFIG.VIDEOS_DIR);
  let processed = 0, skipped = 0;

  for (const [i, videoPath] of videoFiles.entries()) {
    const filename = path.basename(videoPath);
    if (filename in properties) {
      skipped++;
      console.log(`[${i + 1}/${videoFiles.length}] SKIP: ${filename}`);
      continue;
    }

    try {
      // ffprobe
      const { stdout } = await execa("ffprobe", [
        "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", videoPath,
      ]);
      const probe = JSON.parse(stdout) as FfprobeOutput;
      properties[filename] = extractProperties(probe);

      // ffmpeg thumbnail
      const thumbPath = path.join(
        CONFIG.THUMB_DIR,
        filename.replace(/\.mp4$/i, ".jpg")
      );
      await execa("ffmpeg", [
        "-y", "-i", videoPath, "-ss", "1",
        "-vframes", "1", "-q:v", "2", thumbPath,
      ]).catch(() => {}); // Non-fatal

      processed++;
      console.log(`[${i + 1}/${videoFiles.length}] OK: ${filename}`);
      await saveState(CONFIG.STATE.PROPERTIES, properties);
    } catch (err) {
      console.error(`[${i + 1}/${videoFiles.length}] ERROR: ${filename}: ${err}`);
    }
  }

  console.log(`\nProperties done. Processed: ${processed}, Skipped: ${skipped}`);
}

function extractProperties(probe: FfprobeOutput): VideoProperties {
  const fmt = probe.format ?? {};
  const videoStream = probe.streams?.find(s => s.codec_type === "video");
  let fps = 0;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    fps = den !== 0 ? Math.round((num / den) * 100) / 100 : 0;
  }
  return {
    duration:  parseFloat(fmt.duration ?? "0"),
    width:     parseInt(videoStream?.width  ?? "0", 10),
    height:    parseInt(videoStream?.height ?? "0", 10),
    codec:     videoStream?.codec_name ?? "",
    file_size: parseInt(fmt.size ?? "0", 10),
    bitrate:   parseInt(fmt.bit_rate ?? "0", 10),
    fps,
  };
}
