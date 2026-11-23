// src/__tests__/youtube-collector.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as state from "../pipeline/state.js";
import {
  type YtListFn,
  type YtListPage,
  collectYoutubeItems,
  makeYoutubeCollector,
} from "../sources/youtube/collector.js";
import { isMusic } from "../sources/youtube/map.js";

const raw = (id: string, dur: number) => ({
  id,
  title: `T-${id}`,
  channelId: "UC1",
  channelTitle: "Chan",
  durationSeconds: dur,
  publishedAt: null,
  thumbnailUrl: null,
  description: null,
});

describe("collectYoutubeItems", () => {
  it("paginates and maps every page item", async () => {
    const listFn: YtListFn = vi
      .fn()
      .mockResolvedValueOnce({ items: [raw("a", 58)], nextPageToken: "P2" } as YtListPage)
      .mockResolvedValueOnce({ items: [raw("b", 720)], nextPageToken: null } as YtListPage);
    const items = await collectYoutubeItems(listFn, 60);
    expect(listFn).toHaveBeenNthCalledWith(1, null);
    expect(listFn).toHaveBeenNthCalledWith(2, "P2");
    expect(items.map((i) => i.id)).toEqual(["youtube_a", "youtube_b"]);
    expect(items[0].content_type).toBe("short_video");
    expect(items[1].content_type).toBe("long_video");
  });
});

describe("makeYoutubeCollector().collect", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const listOf = (...ids: string[]) => ({
    feeds: [{ name: "liked", list: async () => ids.map((id) => raw(id, 600)) }],
  });

  it("returns every listed item on every call, so an unfinished one is offered again", async () => {
    const collector = makeYoutubeCollector(listOf("a", "b"));
    expect((await collector.collect()).map((i) => i.id)).toEqual(["youtube_a", "youtube_b"]);
    expect((await collector.collect()).map((i) => i.id)).toEqual(["youtube_a", "youtube_b"]);
  });

  it("writes no state, so previewing it cannot hide items from the first live run", async () => {
    const save = vi.spyOn(state, "saveState").mockResolvedValue();
    const atomic = vi.spyOn(state, "writeJsonAtomic").mockResolvedValue();
    await makeYoutubeCollector(listOf("a")).collect();
    expect(save).not.toHaveBeenCalled();
    expect(atomic).not.toHaveBeenCalled();
  });
});

// 2026-11-22: the first YouTube run ingested liked music ("AFROJACK - Topic", "Coke Studio
// Pakistan") into the knowledge pipeline. Music is now left out unless asked for.
describe("isMusic", () => {
  it("is true for YouTube's Music category and for auto-generated Topic channels", () => {
    expect(isMusic({ ...raw("a", 200), categoryId: "10" })).toBe(true);
    expect(isMusic({ ...raw("a", 200), channelTitle: "AFROJACK - Topic" })).toBe(true);
  });
  it("is false for anything else, including a video with no category", () => {
    expect(isMusic({ ...raw("a", 200), categoryId: "28" })).toBe(false);
    expect(isMusic({ ...raw("a", 200), channelTitle: "Music Theory Explained" })).toBe(false);
    expect(isMusic(raw("a", 200))).toBe(false);
  });
});

describe("makeYoutubeCollector().collect and music", () => {
  const feeds = {
    feeds: [
      {
        name: "liked",
        list: async () => [
          { ...raw("talk", 600), categoryId: "28" },
          { ...raw("song", 200), categoryId: "10" },
          { ...raw("topic", 200), channelTitle: "Someone - Topic" },
        ],
      },
    ],
  };

  it("leaves music out by default", async () => {
    expect((await makeYoutubeCollector(feeds).collect()).map((i) => i.id)).toEqual(["youtube_talk"]);
  });

  it("keeps music when asked to", async () => {
    const items = await makeYoutubeCollector({ ...feeds, includeMusic: true }).collect();
    expect(items.map((i) => i.id)).toEqual(["youtube_talk", "youtube_song", "youtube_topic"]);
  });
});
