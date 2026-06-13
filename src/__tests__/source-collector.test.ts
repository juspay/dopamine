// src/__tests__/source-collector.test.ts
import { describe, it, expect, vi } from "vitest";
import type { SourceCollector } from "../sources/types.js";
import type { SourceItem, AcquiredAssets } from "../types/index.js";

const item: SourceItem = {
  id: "x_1.mp4", source: "instagram", content_type: "short_video",
  title: null, author: "x", caption_text: null, url: null,
  thumbnail_url: null, published_at: null, duration_seconds: null,
};

describe("SourceCollector contract", () => {
  it("a conforming fake implements collect() and acquire()", async () => {
    const assets: AcquiredAssets = { videoPath: "/v/x.mp4", thumbnailPath: null, transcriptText: null };
    const fake: SourceCollector = {
      source: "instagram",
      collect: vi.fn(async () => [item]),
      acquire: vi.fn(async () => assets),
    };
    expect(fake.source).toBe("instagram");
    expect(await fake.collect()).toEqual([item]);
    expect(await fake.acquire(item)).toEqual(assets);
  });

  it("acquire() may return null to skip an item", async () => {
    const fake: SourceCollector = {
      source: "youtube",
      collect: vi.fn(async () => []),
      acquire: vi.fn(async () => null),
    };
    expect(await fake.acquire(item)).toBeNull();
  });
});
