// src/__tests__/youtube-feeds.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  type FeedSource,
  buildWatchLaterArgs,
  collectFeeds,
  makePlaylistFeed,
  makeWatchLaterFeed,
  parseFlatPlaylist,
} from "../sources/youtube/feeds.js";
import type { YtVideoRaw } from "../sources/youtube/map.js";

const raw = (id: string, title = `T-${id}`): YtVideoRaw => ({
  id,
  title,
  channelId: null,
  channelTitle: "Chan",
  durationSeconds: 100,
  publishedAt: null,
  thumbnailUrl: null,
  description: null,
});
const feed = (name: string, items: YtVideoRaw[] | Error): FeedSource => ({
  name,
  list: async () => {
    if (items instanceof Error) throw items;
    return items;
  },
});
const quiet = () => {};

describe("collectFeeds", () => {
  it("keeps feed order and lists a video shared by two feeds once, in the first feed's position", async () => {
    const out = await collectFeeds([feed("liked", [raw("a"), raw("b")]), feed("later", [raw("b"), raw("c")])], quiet);
    expect(out.map((v) => v.id)).toEqual(["a", "b", "c"]);
  });

  it("drops entries with no id and deleted or private placeholders", async () => {
    const out = await collectFeeds(
      [feed("liked", [raw(""), raw("x", "Deleted video"), raw("y", "Private video"), raw("ok")])],
      quiet,
    );
    expect(out.map((v) => v.id)).toEqual(["ok"]);
  });

  it("skips a failing feed, says so, and still returns the others", async () => {
    const log = vi.fn();
    const out = await collectFeeds([feed("liked", new Error("quota")), feed("later", [raw("c")])], log);
    expect(out.map((v) => v.id)).toEqual(["c"]);
    expect(log.mock.calls.flat().join(" ")).toMatch(/liked.*quota/);
  });

  it("throws when every feed fails, so the source is recorded as failing", async () => {
    await expect(collectFeeds([feed("liked", new Error("a")), feed("later", new Error("b"))], quiet)).rejects.toThrow(
      /every youtube feed failed/i,
    );
  });

  it("returns nothing for no feeds", async () => {
    expect(await collectFeeds([], quiet)).toEqual([]);
  });
});

describe("buildWatchLaterArgs", () => {
  it("sends the cookie file once, lists without downloading, and ends with the watch later feed", () => {
    const args = buildWatchLaterArgs("/secret/c.txt");
    expect(args.filter((a) => a === "--cookies")).toHaveLength(1);
    expect(args[args.indexOf("--cookies") + 1]).toBe("/secret/c.txt");
    expect(args).toContain("--flat-playlist");
    expect(args).toContain("--dump-single-json");
    expect(args.at(-1)).toBe(":ytwatchlater");
    expect(args).not.toContain("--source-address");
  });

  it("binds to the egress address when one is given", () => {
    const args = buildWatchLaterArgs("/c.txt", "192.168.1.7");
    expect(args[args.indexOf("--source-address") + 1]).toBe("192.168.1.7");
  });
});

describe("parseFlatPlaylist", () => {
  it("maps entries and builds a thumbnail url", () => {
    const json = JSON.stringify({
      entries: [
        { id: "abc", title: "One", duration: 61.4, channel: "Chan A", channel_id: "UC1" },
        { id: "def", title: "Two", uploader: "Up B" },
        null,
        { title: "no id" },
      ],
    });
    expect(parseFlatPlaylist(json)).toEqual([
      {
        id: "abc",
        title: "One",
        channelId: "UC1",
        channelTitle: "Chan A",
        durationSeconds: 61,
        publishedAt: null,
        thumbnailUrl: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
        description: null,
      },
      {
        id: "def",
        title: "Two",
        channelId: null,
        channelTitle: "Up B",
        durationSeconds: 0,
        publishedAt: null,
        thumbnailUrl: "https://i.ytimg.com/vi/def/hqdefault.jpg",
        description: null,
      },
    ]);
  });

  it("returns nothing for output that is not a playlist", () => {
    expect(parseFlatPlaylist("not json")).toEqual([]);
    expect(parseFlatPlaylist("{}")).toEqual([]);
  });
});

describe("makeWatchLaterFeed", () => {
  const ok = JSON.stringify({ entries: [{ id: "abc", title: "One" }] });
  const deps = (over: Partial<Parameters<typeof makeWatchLaterFeed>[0]> = {}) => {
    const log = vi.fn();
    const run = vi.fn(async () => ({ stdout: ok, stderr: "" }));
    return { log, run, d: { run, cookiesFile: "/secret/c.txt", statMode: async () => 0o600, log, ...over } };
  };

  it("lists watch later with the cookie file", async () => {
    const { run, d } = deps();
    expect((await makeWatchLaterFeed(d).list())?.map((v) => v.id)).toEqual(["abc"]);
    expect(run).toHaveBeenCalledWith("yt-dlp", buildWatchLaterArgs("/secret/c.txt"));
  });

  it("sends the cookies at most once per run however often it is asked", async () => {
    const { run, d } = deps();
    const f = makeWatchLaterFeed(d);
    await f.list();
    await f.list();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no cookie file is set", { cookiesFile: undefined }, /YT_COOKIES_FILE is not set/],
    ["the file is missing", { statMode: async () => null }, /missing/],
    ["the file is readable by others", { statMode: async () => 0o644 }, /chmod 600/],
  ])("is skipped with a clear line when %s", async (_name, over, pattern) => {
    const { run, log, d } = deps(over);
    expect(await makeWatchLaterFeed(d).list()).toBeNull();
    expect(run).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(" ")).toMatch(pattern);
  });

  it("is skipped, not failed, when the cookies have expired", async () => {
    const { log, d } = deps({
      run: async () => {
        throw new Error("ERROR: [youtube:tab] Sign in to confirm you're not a bot. Use --cookies");
      },
    });
    expect(await makeWatchLaterFeed(d).list()).toBeNull();
    expect(log.mock.calls.flat().join(" ")).toMatch(/expired/);
  });

  it("is skipped when YouTube says the playlist does not exist, which is what stale cookies get", async () => {
    const { log, d } = deps({
      run: async () => {
        throw new Error("ERROR: [youtube:tab] WL: YouTube said: The playlist does not exist.");
      },
    });
    expect(await makeWatchLaterFeed(d).list()).toBeNull();
    expect(log.mock.calls.flat().join(" ")).toMatch(/expired/);
  });

  it("fails on any other yt-dlp error", async () => {
    const { d } = deps({
      run: async () => {
        throw new Error("Connection reset by peer");
      },
    });
    await expect(makeWatchLaterFeed(d).list()).rejects.toThrow(/Connection reset/);
  });
});

describe("a skipped feed is not a success", () => {
  const skipped: FeedSource = { name: "watch-later", list: async () => null };

  it("throws when the only feed that ran failed and the other was skipped, so a dead token is not silent", async () => {
    await expect(collectFeeds([feed("liked", new Error("invalid_grant")), skipped], quiet)).rejects.toThrow(
      /every youtube feed failed/i,
    );
  });

  it("returns the listed videos when one feed lists and another is skipped", async () => {
    expect((await collectFeeds([feed("liked", [raw("a")]), skipped], quiet)).map((v) => v.id)).toEqual(["a"]);
  });

  it("returns nothing, without failing, when every feed is skipped", async () => {
    expect(await collectFeeds([skipped], quiet)).toEqual([]);
  });

  it("drops yt-dlp's bracketed placeholders for deleted and private videos", async () => {
    const out = await collectFeeds(
      [feed("later", [raw("x", "[Deleted video]"), raw("y", "[Private video]"), raw("ok")])],
      quiet,
    );
    expect(out.map((v) => v.id)).toEqual(["ok"]);
  });
});

describe("makePlaylistFeed", () => {
  it("pages through the playlist and asks for details 50 ids at a time", async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `v${i}`);
    const listPage = vi.fn(async (_id: string, token: string | null) => {
      const start = token ? Number(token) : 0;
      const next = start + 50 < ids.length ? String(start + 50) : null;
      return { ids: ids.slice(start, start + 50), next };
    });
    const details = vi.fn(async (chunk: string[]) => chunk.map((id) => raw(id)));
    const out = await makePlaylistFeed("PL1", { listPage, details }).list();
    expect(out).toHaveLength(120);
    expect(listPage).toHaveBeenCalledTimes(3);
    expect(details.mock.calls.map((c) => c[0].length)).toEqual([50, 50, 20]);
    expect(out?.map((v) => v.id)).toEqual(ids);
  });
});
