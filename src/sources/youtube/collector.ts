// src/sources/youtube/collector.ts
import fs from "node:fs/promises";
import { execa } from "execa";
import { CONFIG } from "../../pipeline/config.js";
import { loadState, saveState } from "../../pipeline/state.js";
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

/** Split items into those not yet seen, and the union of all ids (for persistence). */
export function dedupeNewItems(items: SourceItem[], knownIds: Set<string>): { fresh: SourceItem[]; allIds: string[] } {
  const fresh = items.filter((i) => !knownIds.has(i.id));
  const allIds = [...new Set([...knownIds, ...items.map((i) => i.id)])];
  return { fresh, allIds };
}

/** Parse an ISO-8601 duration (e.g. "PT4M13S") to seconds. */
function isoDurationToSeconds(d: string): number {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return (parseInt(m?.[1] ?? "0", 10) * 3600) + (parseInt(m?.[2] ?? "0", 10) * 60) + parseInt(m?.[3] ?? "0", 10);
}

function makeRealListFn(): YtListFn {
  return async (pageToken) => {
    const { google } = await import("googleapis");
    const youtube = google.youtube({ version: "v3", auth: buildOAuthClient(CONFIG.YOUTUBE) });
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

export function makeYoutubeCollector(): SourceCollector {
  return {
    source: "youtube",

    async collect(): Promise<SourceItem[]> {
      const all = await collectYoutubeItems(makeRealListFn(), CONFIG.YT_DOWNLOAD_MAX_SECONDS);
      const known = new Set(await loadState<string[]>(CONFIG.STATE.YOUTUBE_KNOWN_IDS, []));
      const { fresh, allIds } = dedupeNewItems(all, known);
      await saveState(CONFIG.STATE.YOUTUBE_KNOWN_IDS, allIds);
      return fresh;
    },

    async acquire(item: SourceItem): Promise<AcquiredAssets | null> {
      const run: ExecRunner = async (cmd, args) => {
        const r = await execa(cmd, args);
        return { stdout: r.stdout, stderr: r.stderr };
      };
      const readVtt = async (p: string): Promise<string | null> => {
        try { return await fs.readFile(p, "utf8"); } catch { return null; }
      };
      const listDir = async (dir: string): Promise<string[]> => {
        try { return await fs.readdir(dir); } catch { return []; }
      };
      await fs.mkdir(CONFIG.YOUTUBE_VIDEOS_DIR, { recursive: true });
      return acquireYoutube(item, { run, readVtt, listDir, outDir: CONFIG.YOUTUBE_VIDEOS_DIR });
    },
  };
}
