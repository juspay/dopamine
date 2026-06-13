// src/__tests__/instagram-map.test.ts
import { describe, it, expect } from "vitest";
import type { MetadataEntry } from "../types/index.js";
import { igMetadataToSourceItem } from "../sources/instagram/map.js";

const FIXTURE: MetadataEntry = {
  pk: "3895043733795754636", code: "ABC123", media_type: 2,
  taken_at: "2024-01-15T10:00:00Z", caption_text: "Some caption #ai",
  username: "testuser", full_name: "Test User", location: null,
  like_count: 100, comment_count: 5,
  video_url: "https://example.com/v.mp4", thumbnail_url: "https://example.com/t.jpg",
  resources: [],
};

describe("igMetadataToSourceItem", () => {
  it("derives id '{username}_{pk}.mp4', source, content_type, author", () => {
    const item = igMetadataToSourceItem(FIXTURE);
    expect(item.id).toBe("testuser_3895043733795754636.mp4");
    expect(item.source).toBe("instagram");
    expect(item.content_type).toBe("short_video");
    expect(item.author).toBe("testuser");
  });

  it("nests the full MetadataEntry under .ig and leaves yt undefined", () => {
    const item = igMetadataToSourceItem(FIXTURE);
    expect(item.ig).toStrictEqual(FIXTURE);
    expect(item.yt).toBeUndefined();
    expect(item.duration_seconds).toBeNull();
  });

  it("handles a null username (id uses empty author segment)", () => {
    const item = igMetadataToSourceItem({ ...FIXTURE, username: null });
    expect(item.id).toBe("_3895043733795754636.mp4");
    expect(item.author).toBeNull();
  });
});
