import { describe, it, expect } from "vitest";
import { webResponseToEntries, isSavedFeedUrl } from "../pipeline/piggyback/map-web-media.js";

const webItem = (pk: number, mt: number) => ({
  media: {
    pk,
    code: `c${pk}`,
    media_type: mt,
    taken_at: 1735689600, // 2025-01-01
    caption: { text: "hello" },
    user: { username: "alice", full_name: "Alice" },
    like_count: 5,
    comment_count: 1,
    image_versions2: { candidates: [{ url: "https://cdn/thumb.jpg" }] },
    video_versions: mt === 2 ? [{ url: "https://cdn/video.mp4" }] : undefined,
  },
});

describe("isSavedFeedUrl", () => {
  it("matches the saved + collection feed endpoints only", () => {
    expect(isSavedFeedUrl("https://www.instagram.com/api/v1/feed/saved/posts/?max_id=x")).toBe(true);
    expect(isSavedFeedUrl("https://www.instagram.com/api/v1/feed/collection/123/posts/")).toBe(true);
    expect(isSavedFeedUrl("https://www.instagram.com/api/v1/feed/timeline/")).toBe(false);
  });
});

describe("webResponseToEntries", () => {
  it("maps a saved-feed response to MetadataEntry[] with a video url", () => {
    const out = webResponseToEntries({ items: [webItem(1, 2), webItem(2, 1)] });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      pk: "1",
      code: "c1",
      media_type: 2,
      username: "alice",
      caption_text: "hello",
      video_url: "https://cdn/video.mp4",
      thumbnail_url: "https://cdn/thumb.jpg",
      like_count: 5,
    });
    expect(out[0].taken_at).toMatch(/^2025-01-01T/);
    expect(out[1].video_url).toBeNull();
  });

  it("tolerates items without a media wrapper and skips malformed entries", () => {
    const out = webResponseToEntries({ items: [{ media: { code: "x" } }, webItem(3, 2)] as never });
    expect(out.map((e) => e.pk)).toEqual(["3"]);
  });
});
