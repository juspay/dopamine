// src/__tests__/youtube-collector.test.ts
import { describe, it, expect, vi } from "vitest";
import { collectYoutubeItems, dedupeNewItems, type YtListPage, type YtListFn } from "../sources/youtube/collector.js";
import type { SourceItem } from "../types/index.js";

const raw = (id: string, dur: number) => ({
  id, title: `T-${id}`, channelId: "UC1", channelTitle: "Chan",
  durationSeconds: dur, publishedAt: null, thumbnailUrl: null, description: null,
});

describe("collectYoutubeItems", () => {
  it("paginates and maps every page item", async () => {
    const listFn: YtListFn = vi.fn()
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

describe("dedupeNewItems", () => {
  it("returns only items whose id is not in knownIds, plus the union of ids", () => {
    const items: SourceItem[] = [
      { id: "youtube_a", source: "youtube", content_type: "short_video", title: null, author: null, caption_text: null, url: null, thumbnail_url: null, published_at: null, duration_seconds: null },
      { id: "youtube_b", source: "youtube", content_type: "short_video", title: null, author: null, caption_text: null, url: null, thumbnail_url: null, published_at: null, duration_seconds: null },
    ];
    const { fresh, allIds } = dedupeNewItems(items, new Set(["youtube_a"]));
    expect(fresh.map((i) => i.id)).toEqual(["youtube_b"]);
    expect(new Set(allIds)).toEqual(new Set(["youtube_a", "youtube_b"]));
  });
});
