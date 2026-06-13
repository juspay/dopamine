// src/__tests__/source-types.test.ts
import { describe, it, expect } from "vitest";
import type { SourceItem, AcquiredAssets, SourceKind, ContentType } from "../types/index.js";

describe("multi-provider source types", () => {
  it("constructs a YouTube SourceItem", () => {
    const item: SourceItem = {
      id: "youtube_abc123",
      source: "youtube",
      content_type: "long_video",
      title: "A talk",
      author: "Chan",
      caption_text: null,
      url: "https://www.youtube.com/watch?v=abc123",
      thumbnail_url: null,
      published_at: null,
      duration_seconds: 1200,
      yt: { videoId: "abc123", channelId: "UC1", caption_file: null },
    };
    expect(item.source).toBe("youtube");
    expect(item.yt?.videoId).toBe("abc123");
  });

  it("constructs an Instagram SourceItem and AcquiredAssets", () => {
    const item: SourceItem = {
      id: "alice_100.mp4",
      source: "instagram",
      content_type: "short_video",
      title: null,
      author: "alice",
      caption_text: "hi",
      url: null,
      thumbnail_url: null,
      published_at: null,
      duration_seconds: null,
    };
    const assets: AcquiredAssets = { videoPath: "/v/x.mp4", thumbnailPath: null, transcriptText: null };
    const k: SourceKind = item.source;
    const c: ContentType = item.content_type;
    expect(k).toBe("instagram");
    expect(c).toBe("short_video");
    expect(assets.transcriptText).toBeNull();
  });
});
