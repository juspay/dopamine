// src/sources/youtube/collector.ts
import fs from "node:fs/promises";
import { execa } from "execa";
import { egressAddressOrDefault, egressGet } from "../../net/egress.js";
import { CONFIG } from "../../pipeline/config.js";
import type { AcquiredAssets, SourceItem } from "../../types/index.js";
import type { SourceCollector } from "../types.js";
import { buildOAuthClient } from "./auth.js";
import { acquireYoutube } from "./download.js";
import type { ExecRunner } from "./download.js";
import { type FeedSource, type PlaylistDeps, collectFeeds, makePlaylistFeed, makeWatchLaterFeed } from "./feeds.js";
import { type YtVideoRaw, isMusic, mapYtVideo } from "./map.js";
import { ytDlpFailureMessage } from "./ytdlp.js";

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
  return (
    Number.parseInt(m?.[1] ?? "0", 10) * 3600 +
    Number.parseInt(m?.[2] ?? "0", 10) * 60 +
    Number.parseInt(m?.[3] ?? "0", 10)
  );
}

// googleapis bundles its own google-auth-library copy; its OAuth2Client type differs
// by a private field from the top-level one buildOAuthClient returns. The runtime object
// is identical, so cast to the exact auth type googleapis expects (derived, not hardcoded).
type YoutubeOptionsAuth = Exclude<Parameters<typeof import("googleapis").google.youtube>[0], string>["auth"];

type ApiVideo = import("googleapis").youtube_v3.Schema$Video;

function toRaw(v: ApiVideo): YtVideoRaw {
  return {
    id: v.id ?? "",
    title: v.snippet?.title ?? "",
    channelId: v.snippet?.channelId ?? null,
    channelTitle: v.snippet?.channelTitle ?? null,
    durationSeconds: isoDurationToSeconds(v.contentDetails?.duration ?? "PT0S"),
    publishedAt: v.snippet?.publishedAt ?? null,
    thumbnailUrl: v.snippet?.thumbnails?.maxres?.url ?? v.snippet?.thumbnails?.high?.url ?? null,
    description: v.snippet?.description ?? null,
    categoryId: v.snippet?.categoryId ?? null,
  };
}

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
    return { items: (res.data.items ?? []).map(toRaw), nextPageToken: res.data.nextPageToken ?? null };
  };
}

type YoutubeApi = ReturnType<typeof import("googleapis").google.youtube>;

async function youtubeApi(): Promise<YoutubeApi> {
  const { google } = await import("googleapis");
  const auth = buildOAuthClient(CONFIG.YOUTUBE) as unknown as YoutubeOptionsAuth;
  return google.youtube({ version: "v3", auth });
}

function makeLikedFeed(listFn: YtListFn = makeRealListFn()): FeedSource {
  return {
    name: "liked",
    async list(): Promise<YtVideoRaw[]> {
      const out: YtVideoRaw[] = [];
      let pageToken: string | null = null;
      do {
        const page = await listFn(pageToken);
        out.push(...page.items);
        pageToken = page.nextPageToken;
      } while (pageToken !== null);
      return out;
    },
  };
}

function realPlaylistDeps(): PlaylistDeps {
  return {
    async listPage(playlistId, pageToken) {
      const res = await (await youtubeApi()).playlistItems.list({
        part: ["contentDetails"],
        playlistId,
        maxResults: 50,
        ...(pageToken ? { pageToken } : {}),
      });
      const ids = (res.data.items ?? []).map((i) => i.contentDetails?.videoId ?? "").filter((id) => id !== "");
      return { ids, next: res.data.nextPageToken ?? null };
    },
    async details(ids) {
      const res = await (await youtubeApi()).videos.list({
        part: ["snippet", "contentDetails"],
        id: ids,
        maxResults: 50,
      });
      return (res.data.items ?? []).map(toRaw);
    },
  };
}

const YT_DLP_TIMEOUT_MS = 10 * 60_000;

/** Runs yt-dlp with a time limit. A failure carries yt-dlp's own error line, never the command. */
const run: ExecRunner = async (cmd, args) => {
  const r = await execa(cmd, args, { reject: false, timeout: YT_DLP_TIMEOUT_MS });
  if (r.failed)
    throw new Error(
      ytDlpFailureMessage({ stderr: String(r.stderr ?? ""), exitCode: r.exitCode, timedOut: r.timedOut }),
    );
  return { stdout: String(r.stdout ?? ""), stderr: String(r.stderr ?? "") };
};

async function fileMode(p: string): Promise<number | null> {
  try {
    return (await fs.stat(p)).mode & 0o777;
  } catch {
    return null;
  }
}

/** The cookie file, but only when it exists and nobody else can read it. */
async function usableCookiesFile(): Promise<string | undefined> {
  const file = CONFIG.YT_COOKIES_FILE;
  if (!file) return undefined;
  const mode = await fileMode(file);
  return mode !== null && (mode & 0o077) === 0 ? file : undefined;
}

/** Liked videos and Watch Later always; own playlists only when listed in YOUTUBE_PLAYLIST_IDS. */
function defaultFeeds(): FeedSource[] {
  return [
    makeLikedFeed(),
    makeWatchLaterFeed({
      run,
      cookiesFile: CONFIG.YT_COOKIES_FILE,
      sourceAddress: egressAddressOrDefault(CONFIG.EGRESS_INTERFACE) ?? undefined,
      statMode: fileMode,
    }),
    ...CONFIG.YOUTUBE_PLAYLIST_IDS.map((id) => makePlaylistFeed(id, realPlaylistDeps())),
  ];
}

/**
 * Lists every feed on every call and remembers nothing. Which videos still need work is the
 * pipeline's decision (knowledge base, retry ledger, per-run cap), so a video whose download
 * failed is offered again, and previewing this collector cannot hide anything from a real run.
 */
export function makeYoutubeCollector(deps: { feeds?: FeedSource[]; includeMusic?: boolean } = {}): SourceCollector {
  const includeMusic = deps.includeMusic ?? CONFIG.YOUTUBE_INCLUDE_MUSIC;
  return {
    source: "youtube",

    async collect(): Promise<SourceItem[]> {
      const listed = await collectFeeds(deps.feeds ?? defaultFeeds());
      // Liked music would go through the whole knowledge pipeline; it is left out unless asked for.
      const videos = includeMusic ? listed : listed.filter((v) => !isMusic(v));
      if (videos.length < listed.length)
        console.log(
          `[youtube] left out ${listed.length - videos.length} music video(s) (YOUTUBE_INCLUDE_MUSIC=1 keeps them)`,
        );
      return videos.map((v) => mapYtVideo(v, CONFIG.YT_DOWNLOAD_MAX_SECONDS));
    },

    async acquire(item: SourceItem): Promise<AcquiredAssets | null> {
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
      await fs.mkdir(CONFIG.THUMB_DIR, { recursive: true });
      const egress = egressAddressOrDefault(CONFIG.EGRESS_INTERFACE);
      return acquireYoutube(item, {
        run,
        readVtt,
        listDir,
        outDir: CONFIG.YOUTUBE_VIDEOS_DIR,
        sourceAddress: egress ?? undefined,
        cookiesFile: await usableCookiesFile(),
        thumbDir: CONFIG.THUMB_DIR,
        exists: (f) =>
          fs.access(f).then(
            () => true,
            () => false,
          ),
        fetchBytes: async (url) => {
          const bytes = await egressGet(url, egress);
          if (bytes === null) throw new Error("thumbnail request did not return 200");
          return bytes;
        },
        writeFile: (f, bytes) => fs.writeFile(f, bytes),
      });
    },
  };
}
