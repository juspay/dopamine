// src/__tests__/youtube-collector.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as state from "../pipeline/state.js";
import {
  collectYoutubeItems,
  makeYoutubeCollector,
  type YtListPage,
  type YtListFn,
} from "../sources/youtube/collector.js";
import type { SourceItem } from "../types/index.js";

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

  const listOf = (...ids: string[]): YtListFn =>
    vi.fn(async () => ({ items: ids.map((id) => raw(id, 600)), nextPageToken: null }) as YtListPage);

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
