// src/sources/youtube/download.ts
import path from "node:path";
import { buildCaptionArgs, buildVideoArgs } from "./ytdlp.js";
import { vttToText } from "../../utils/vtt.js";
import type { SourceItem, AcquiredAssets } from "../../types/index.js";

export type ExecRunner = (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export interface AcquireDeps {
  run: ExecRunner;
  readVtt: (p: string) => Promise<string | null>;
  /** List filenames (not full paths) in a directory; used to locate locale-tagged VTT files. */
  listDir: (dir: string) => Promise<string[]>;
  outDir: string;
}

export async function acquireYoutube(item: SourceItem, deps: AcquireDeps): Promise<AcquiredAssets> {
  const videoId = item.yt?.videoId;
  if (!videoId) return { videoPath: null, thumbnailPath: null, transcriptText: null };
  const { run, readVtt, listDir, outDir } = deps;

  await run("yt-dlp", buildCaptionArgs(videoId, path.join(outDir, `${videoId}.%(ext)s`)));

  // yt-dlp may produce any locale-tagged English VTT (en.vtt, en-US.vtt, en-GB.vtt, en-AU.vtt, …).
  // Glob the output directory so we pick up whichever variant was written.
  let transcriptText: string | null = null;
  const prefix = `${videoId}.en`;
  const files = await listDir(outDir);
  const vttFile = files.find((f) => f.startsWith(prefix) && f.endsWith(".vtt"));
  if (vttFile !== undefined) {
    const vtt = await readVtt(path.join(outDir, vttFile));
    if (vtt !== null) transcriptText = vttToText(vtt);
  }

  let videoPath: string | null = null;
  if (item.content_type === "short_video") {
    const mp4 = path.join(outDir, `${videoId}.mp4`);
    await run("yt-dlp", buildVideoArgs(videoId, mp4));
    videoPath = mp4;
  }
  return { videoPath, thumbnailPath: null, transcriptText };
}
