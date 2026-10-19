// src/sources/youtube/collector.ts
import fs from "node:fs/promises";
import { execa } from "execa";
import { CONFIG } from "../../pipeline/config.js";
import { buildOAuthClient } from "./auth.js";
import { mapYtVideo, type YtVideoRaw } from "./map.js";
import { acquireYoutube } from "./download.js";
import type { ExecRunner } from "./download.js";
import type { SourceItem, AcquiredAssets } from "../../types/index.js";
import type { SourceCollector } from "../types.js";

export type YtListPage = { items: YtVideoRaw[]; nextPageToken: string | null };
export type YtListFn = (pageToken: string | null) => Promise<YtListPage>;

/** Paginate a list function and map every raw video to a SourceItem (pure given listFn). */
export async function collectYoutubeItems(listFn: YtListFn, thresholdSeconds: number): Promise<SourceItem[]> {
  const items: SourceItem[] = [];
  let pageToken: string | null = null;
  do {
    const page = await listFn(pageToken);
    for (const raw of page.items) items.push(mapYtVideo(raw, thresholdSeconds));
    pageToken = page.nextPageToken;
  } while (pageToken !== null);
  return items;
}

/** Parse an ISO-8601 duration (e.g. "PT4M13S") to seconds. */
function isoDurationToSeconds(d: string): number {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return parseInt(m?.[1] ?? "0", 10) * 3600 + parseInt(m?.[2] ?? "0", 10) * 60 + parseInt(m?.[3] ?? "0", 10);
}

// googleapis bundles its own google-auth-library copy; its OAuth2Client type differs
// by a private field from the top-level one buildOAuthClient returns. The runtime object
// is identical, so cast to the exact auth type googleapis expects (derived, not hardcoded).
type YoutubeOptionsAuth = Exclude<Parameters<typeof import("googleapis").google.youtube>[0], string>["auth"];

function makeRealListFn(): YtListFn {
  return async (pageToken) => {
    const { google } = await import("googleapis");
    const auth = buildOAuthClient(CONFIG.YOUTUBE) as unknown as YoutubeOptionsAuth;
    const youtube = google.youtube({ version: "v3", auth });
    const res = await youtube.videos.list({
      part: ["snippet", "contentDetails"],
      myRating: "like",
      maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    const items: YtVideoRaw[] = (res.data.items ?? []).map((v) => ({
      id: v.id ?? "",
      title: v.snippet?.title ?? "",
      channelId: v.snippet?.channelId ?? null,
      channelTitle: v.snippet?.channelTitle ?? null,
      durationSeconds: isoDurationToSeconds(v.contentDetails?.duration ?? "PT0S"),
      publishedAt: v.snippet?.publishedAt ?? null,
      thumbnailUrl: v.snippet?.thumbnails?.maxres?.url ?? v.snippet?.thumbnails?.high?.url ?? null,
      description: v.snippet?.description ?? null,
    }));
    return { items, nextPageToken: res.data.nextPageToken ?? null };
  };
}

/**
 * Lists every liked video on every call and remembers nothing. Which ones still need work is
 * the pipeline's decision (knowledge base, retry ledger, per-run cap), so a video whose download
 * failed is offered again, and previewing this collector cannot hide anything from a real run.
 */
export function makeYoutubeCollector(listFn: YtListFn = makeRealListFn()): SourceCollector {
  return {
    source: "youtube",

    async collect(): Promise<SourceItem[]> {
      return collectYoutubeItems(listFn, CONFIG.YT_DOWNLOAD_MAX_SECONDS);
    },

    async acquire(item: SourceItem): Promise<AcquiredAssets | null> {
      const run: ExecRunner = async (cmd, args) => {
        const r = await execa(cmd, args);
        return { stdout: r.stdout, stderr: r.stderr };
      };
      const readVtt = async (p: string): Promise<string | null> => {
        try {
          return await fs.readFile(p, "utf8");
        } catch {
          return null;
        }
      };
      const listDir = async (dir: string): Promise<string[]> => {
        try {
          return await fs.readdir(dir);
        } catch {
          return [];
        }
      };
      await fs.mkdir(CONFIG.YOUTUBE_VIDEOS_DIR, { recursive: true });
      return acquireYoutube(item, { run, readVtt, listDir, outDir: CONFIG.YOUTUBE_VIDEOS_DIR });
    },
  };
}
