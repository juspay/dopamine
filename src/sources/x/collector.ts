// src/sources/x/collector.ts
//
// Reads what the X harvester captured. It never drives a browser and never writes state:
// collect() only maps the harvester's file, so previewing it changes nothing, and the pipeline
// (not this collector) stores the items and decides which still need work.
import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { egressGet, resolveEgressAddress } from "../../net/egress.js";
import { CONFIG } from "../../pipeline/config.js";
import { loadState } from "../../pipeline/state.js";
import type { AcquiredAssets, SourceItem } from "../../types/index.js";
import { type SourceCollector, SourceUnavailableError } from "../types.js";
import { xPostToSourceItem } from "./map.js";
import type { XPost } from "./parse.js";
import { jsRuntimeArgs } from "../youtube/ytdlp.js";

function isPost(v: unknown): v is XPost {
  const p = v as Partial<XPost> | null;
  return (
    typeof p === "object" &&
    p !== null &&
    typeof p.id === "string" &&
    /^\d{1,25}$/.test(p.id) &&
    typeof p.handle === "string" &&
    typeof p.text === "string" &&
    Array.isArray(p.photos) &&
    Array.isArray(p.links)
  );
}

/** The harvester's file as items; anything unreadable in it is skipped. */
export function itemsFromIncoming(raw: unknown): SourceItem[] {
  return Array.isArray(raw) ? raw.filter(isPost).map(xPostToSourceItem) : [];
}

/** What the model reads for a post: its text, the post it quotes, then the links, so the link steps see them. */
export function transcriptFor(item: SourceItem): string {
  const parts: string[] = [];
  const text = (item.caption_text ?? "").trim();
  if (text !== "") parts.push(text);
  const quoted = item.x?.quoted;
  if (quoted && quoted.text.trim() !== "") parts.push(`Quoted post by @${quoted.handle}:\n${quoted.text.trim()}`);
  const links = [...(item.x?.links ?? []), ...(quoted?.links ?? [])];
  if (links.length > 0) parts.push(`Links:\n${[...new Set(links)].join("\n")}`);
  return parts.join("\n\n");
}

export interface XAcquireDeps {
  videosDir: string;
  thumbDir: string;
  exists(p: string): Promise<boolean>;
  fetchBytes(url: string): Promise<Uint8Array>;
  writeFile(p: string, bytes: Uint8Array): Promise<void>;
  /** Downloads the post's video with yt-dlp; used when the captured link no longer works. */
  runYtDlp(postUrl: string, dest: string): Promise<void>;
}

const firstLine = (err: unknown): string => String(err instanceof Error ? err.message : err).split("\n")[0];

async function saveOnce(url: string, dest: string, d: XAcquireDeps): Promise<void> {
  if (await d.exists(dest)) return;
  await d.writeFile(dest, await d.fetchBytes(url));
}

export async function acquireX(item: SourceItem, d: XAcquireDeps): Promise<AcquiredAssets | null> {
  const x = item.x;
  if (!x) return null;
  let transcript = transcriptFor(item);

  let videoPath: string | null = null;
  if (x.videoUrl) {
    const dest = path.join(d.videosDir, `${x.tweetId}.mp4`);
    try {
      await saveOnce(x.videoUrl, dest, d);
      videoPath = dest;
    } catch {
      // The captured link is signed and expires; the post page still has the video.
      try {
        await d.runYtDlp(item.url ?? `https://x.com/${x.handle}/status/${x.tweetId}`, dest);
        videoPath = dest;
      } catch (err) {
        console.error(`[x] video for ${item.id} not downloaded: ${firstLine(err)}`);
        transcript = `${transcript}\n\n(The post has a video that could not be downloaded.)`.trim();
      }
    }
  }

  if ((item.caption_text ?? "").trim() === "" && videoPath === null) return null;

  let thumbnailPath: string | null = null;
  if (item.thumbnail_url) {
    const dest = path.join(d.thumbDir, `${item.id}.jpg`);
    try {
      await saveOnce(item.thumbnail_url, dest, d);
      thumbnailPath = dest;
    } catch (err) {
      console.error(`[x] thumbnail for ${item.id} not saved: ${firstLine(err)}`);
    }
  }
  return { videoPath, thumbnailPath, transcriptText: transcript === "" ? null : transcript };
}

const YT_DLP_TIMEOUT_MS = 10 * 60_000;

export function makeXCollector(): SourceCollector {
  return {
    source: "x",

    async collect(): Promise<SourceItem[]> {
      return itemsFromIncoming(await loadState<unknown>(CONFIG.STATE.X_INCOMING, []));
    },

    async acquire(item: SourceItem): Promise<AcquiredAssets | null> {
      let egress: string | null;
      try {
        egress = resolveEgressAddress(CONFIG.EGRESS_INTERFACE);
      } catch (err) {
        throw new SourceUnavailableError(firstLine(err));
      }
      await fs.mkdir(CONFIG.X_VIDEOS_DIR, { recursive: true });
      await fs.mkdir(CONFIG.THUMB_DIR, { recursive: true });
      return acquireX(item, {
        videosDir: CONFIG.X_VIDEOS_DIR,
        thumbDir: CONFIG.THUMB_DIR,
        exists: (p) =>
          fs.access(p).then(
            () => true,
            () => false,
          ),
        fetchBytes: async (url) => {
          const bytes = await egressGet(url, egress);
          if (bytes === null) throw new Error("request did not return 200");
          return bytes;
        },
        writeFile: (p, bytes) => fs.writeFile(p, bytes),
        runYtDlp: async (postUrl, dest) => {
          const args = [
            "-f",
            "mp4",
            ...jsRuntimeArgs(),
            ...(egress ? ["--source-address", egress] : []),
            "-o",
            dest,
            postUrl,
          ];
          const r = await execa("yt-dlp", args, { reject: false, timeout: YT_DLP_TIMEOUT_MS });
          if (r.failed) throw new Error(`yt-dlp exited with code ${r.exitCode ?? "unknown"}`);
        },
      });
    },
  };
}
