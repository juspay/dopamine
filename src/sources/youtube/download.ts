// src/sources/youtube/download.ts
import path from "node:path";
import type { AcquiredAssets, SourceItem } from "../../types/index.js";
import { vttToText } from "../../utils/vtt.js";
import { SourceUnavailableError } from "../types.js";
import { isNetworkFailure, isVideoGone } from "./network.js";
import { type YtDlpOptions, buildCaptionArgs, buildVideoArgs } from "./ytdlp.js";

export type ExecRunner = (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export interface AcquireDeps {
  run: ExecRunner;
  readVtt: (p: string) => Promise<string | null>;
  /** List filenames (not full paths) in a directory; used to locate locale-tagged VTT files. */
  listDir: (dir: string) => Promise<string[]>;
  outDir: string;
  sourceAddress?: string;
  /** Used only to retry once a video that needs a signed-in request (age-restricted, or refused subtitles). */
  cookiesFile?: string;
  /** Where the dashboard looks for thumbnails. Without it (or the three below) none is saved. */
  thumbDir?: string;
  exists?: (p: string) => Promise<boolean>;
  fetchBytes?: (url: string) => Promise<Uint8Array>;
  writeFile?: (p: string, bytes: Uint8Array) => Promise<void>;
}

const AGE_RESTRICTED = /confirm your age|age-restricted/i;
// YouTube serves some videos' subtitles only to a signed-in request and answers others with 429.
const SUBTITLES_REFUSED = /Unable to download video subtitles.*HTTP Error 429/i;
const NEEDS_SIGN_IN = (message: string): boolean => AGE_RESTRICTED.test(message) || SUBTITLES_REFUSED.test(message);
const firstLine = (err: unknown): string => String(err instanceof Error ? err.message : err).split("\n")[0];

/**
 * One yt-dlp run. An age-restricted video, or one whose subtitles are refused, is retried once
 * with the cookie file when there is one.
 */
async function runYtDlp(deps: AcquireDeps, build: (o: YtDlpOptions) => string[]): Promise<void> {
  const base: YtDlpOptions = { sourceAddress: deps.sourceAddress };
  try {
    await deps.run("yt-dlp", build(base));
  } catch (err) {
    if (!deps.cookiesFile || !NEEDS_SIGN_IN(String(err))) throw err;
    await deps.run("yt-dlp", build({ ...base, cookiesFile: deps.cookiesFile }));
  }
}

async function saveThumbnail(item: SourceItem, deps: AcquireDeps): Promise<string | null> {
  if (!deps.thumbDir || !deps.exists || !deps.fetchBytes || !deps.writeFile || !item.thumbnail_url) return null;
  const dest = path.join(deps.thumbDir, `${item.id}.jpg`);
  if (await deps.exists(dest)) return dest;
  try {
    await deps.writeFile(dest, await deps.fetchBytes(item.thumbnail_url));
    return dest;
  } catch (err) {
    console.error(`[youtube] thumbnail for ${item.id} not saved: ${firstLine(err)}`);
    return null;
  }
}

/**
 * Captions always; the mp4 only for a short video. Anything already on disk is reused, so a
 * retry is cheap. Returns null when there is nothing to analyse yet (no captions and no video).
 * Throws SourceUnavailableError when YouTube cannot be reached, so the item is not blamed.
 */
export async function acquireYoutube(item: SourceItem, deps: AcquireDeps): Promise<AcquiredAssets | null> {
  const videoId = item.yt?.videoId;
  if (!videoId) return null;
  const { readVtt, listDir, outDir } = deps;
  const findVtt = (files: string[]): string | undefined =>
    files.find((f) => f.startsWith(`${videoId}.en`) && f.endsWith(".vtt"));

  let files = await listDir(outDir);
  if (findVtt(files) === undefined) {
    // A premiere or live stream that has not aired has nothing to fetch yet; yt-dlp errors on it.
    if (item.duration_seconds === 0) return null;
    try {
      await runYtDlp(deps, (o) => buildCaptionArgs(videoId, path.join(outDir, `${videoId}.%(ext)s`), o));
    } catch (err) {
      if (isNetworkFailure(String(err))) throw new SourceUnavailableError(`YouTube is unreachable: ${firstLine(err)}`);
      if (isVideoGone(String(err))) return null;
      throw err;
    }
    files = await listDir(outDir);
  }

  // yt-dlp may write any locale-tagged English VTT (en.vtt, en-US.vtt, en-GB.vtt, ...).
  let transcriptText: string | null = null;
  const vttFile = findVtt(files);
  if (vttFile !== undefined) {
    const vtt = await readVtt(path.join(outDir, vttFile));
    if (vtt !== null) transcriptText = vttToText(vtt);
  }

  let videoPath: string | null = null;
  if (item.content_type === "short_video" && item.duration_seconds !== 0) {
    const mp4 = path.join(outDir, `${videoId}.mp4`);
    if (files.includes(`${videoId}.mp4`)) {
      videoPath = mp4;
    } else {
      try {
        await runYtDlp(deps, (o) => buildVideoArgs(videoId, mp4, o));
        videoPath = mp4;
      } catch (err) {
        // A network failure is worth another run: the captions stay on disk, so the retry is
        // cheap. Any other failure (no mp4 format, say) will not fix itself, so the item goes
        // ahead on its captions alone.
        if (isNetworkFailure(String(err)))
          throw new SourceUnavailableError(`YouTube is unreachable: ${firstLine(err)}`);
        console.error(`[youtube] video for ${item.id} not downloaded, using captions only: ${firstLine(err)}`);
      }
    }
  }

  if (transcriptText === null && videoPath === null) return null;
  return { videoPath, thumbnailPath: await saveThumbnail(item, deps), transcriptText };
}
