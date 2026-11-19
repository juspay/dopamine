// src/sources/youtube/feeds.ts
//
// The lists YouTube items come from: liked videos and own playlists through the Data API,
// Watch Later through yt-dlp with a cookie file (the Data API does not list it).
import type { ExecRunner } from "./download.js";
import type { YtVideoRaw } from "./map.js";

export interface FeedSource {
  name: string;
  /** null means the feed was skipped (not configured): neither a success nor a failure. */
  list(): Promise<YtVideoRaw[] | null>;
}

type Log = (line: string) => void;

const PLACEHOLDER_TITLES = new Set(["Deleted video", "Private video", "[Deleted video]", "[Private video]"]);

/**
 * Every feed's videos in feed order; a video in two feeds is listed once, where it first
 * appears. A failing feed is skipped with a log line. All feeds failing is the source failing.
 */
export async function collectFeeds(feeds: FeedSource[], log: Log = console.error): Promise<YtVideoRaw[]> {
  const out = new Map<string, YtVideoRaw>();
  let failed = 0;
  let listed = 0;
  for (const feed of feeds) {
    let videos: YtVideoRaw[] | null;
    try {
      videos = await feed.list();
    } catch (err) {
      failed++;
      log(`[youtube] feed "${feed.name}" failed: ${String(err instanceof Error ? err.message : err).split("\n")[0]}`);
      continue;
    }
    if (videos === null) continue;
    listed++;
    for (const v of videos) {
      if (!v.id || PLACEHOLDER_TITLES.has(v.title) || out.has(v.id)) continue;
      out.set(v.id, v);
    }
  }
  // A skipped feed is not a success: liked videos failing while Watch Later is merely
  // unconfigured must still count as the source failing, or an expired token goes unnoticed.
  if (failed > 0 && listed === 0) throw new Error("Every YouTube feed failed; see the lines above.");
  return [...out.values()];
}

export function buildWatchLaterArgs(cookiesFile: string, sourceAddress?: string): string[] {
  return [
    "--cookies",
    cookiesFile,
    ...(sourceAddress ? ["--source-address", sourceAddress] : []),
    "--flat-playlist",
    "--dump-single-json",
    "--no-warnings",
    ":ytwatchlater",
  ];
}

interface FlatEntry {
  id?: unknown;
  title?: unknown;
  duration?: unknown;
  channel?: unknown;
  uploader?: unknown;
  channel_id?: unknown;
}

const text = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

/** The entries of `yt-dlp --flat-playlist --dump-single-json`. Anything unreadable yields nothing. */
export function parseFlatPlaylist(json: string): YtVideoRaw[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  const entries = (parsed as { entries?: unknown })?.entries;
  if (!Array.isArray(entries)) return [];
  const out: YtVideoRaw[] = [];
  for (const raw of entries as Array<FlatEntry | null>) {
    const id = text(raw?.id);
    if (!raw || !id) continue;
    out.push({
      id,
      title: text(raw.title) ?? "",
      channelId: text(raw.channel_id),
      channelTitle: text(raw.channel) ?? text(raw.uploader),
      durationSeconds: typeof raw.duration === "number" ? Math.round(raw.duration) : 0,
      publishedAt: null,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      description: null,
    });
  }
  return out;
}

export interface WatchLaterDeps {
  run: ExecRunner;
  cookiesFile?: string;
  sourceAddress?: string;
  /** Permission bits of the cookie file, or null when it does not exist. */
  statMode(path: string): Promise<number | null>;
  log?: Log;
}

const EXPIRED = /sign in|not a bot|login required|cookies are no longer valid|playlist does not exist/i;

/**
 * Watch Later. The cookies are a Google login, so they go on one request, at most once per
 * feed object (the collector builds one per run), and the feed is skipped (not failed) when
 * they are absent, exposed or expired.
 */
export function makeWatchLaterFeed(d: WatchLaterDeps): FeedSource {
  const log = d.log ?? console.error;
  let cached: Promise<YtVideoRaw[] | null> | undefined;
  const skip = (why: string): null => {
    log(`[youtube] Watch Later skipped: ${why}`);
    return null;
  };
  const fetchOnce = async (): Promise<YtVideoRaw[] | null> => {
    if (!d.cookiesFile) return skip("YT_COOKIES_FILE is not set");
    const mode = await d.statMode(d.cookiesFile);
    if (mode === null) return skip("the cookie file is missing");
    if ((mode & 0o077) !== 0) return skip("the cookie file is readable by others (chmod 600 it)");
    try {
      const { stdout } = await d.run("yt-dlp", buildWatchLaterArgs(d.cookiesFile, d.sourceAddress));
      return parseFlatPlaylist(stdout);
    } catch (err) {
      if (EXPIRED.test(String(err))) return skip("the cookies look expired, re-export them (docs/youtube-setup.md)");
      throw err;
    }
  };
  return {
    name: "watch-later",
    list: () => {
      cached ??= fetchOnce().catch((err: unknown) => {
        cached = undefined;
        throw err;
      });
      return cached;
    },
  };
}

export interface PlaylistDeps {
  listPage(playlistId: string, pageToken: string | null): Promise<{ ids: string[]; next: string | null }>;
  /** Details for up to 50 video ids. */
  details(ids: string[]): Promise<YtVideoRaw[]>;
}

const DETAILS_CHUNK = 50;

export function makePlaylistFeed(playlistId: string, d: PlaylistDeps): FeedSource {
  return {
    name: `playlist ${playlistId}`,
    async list(): Promise<YtVideoRaw[]> {
      const ids: string[] = [];
      let token: string | null = null;
      do {
        const page = await d.listPage(playlistId, token);
        ids.push(...page.ids);
        token = page.next;
      } while (token !== null);
      const out: YtVideoRaw[] = [];
      for (let i = 0; i < ids.length; i += DETAILS_CHUNK)
        out.push(...(await d.details(ids.slice(i, i + DETAILS_CHUNK))));
      return out;
    },
  };
}
