import { describe, it, expect } from "vitest";
import { buildCatalogRecord } from "../agents/catalog.js";
import { resolveDashboardAuthor } from "../dashboard/data-builder.js";
import type { SourceItem, MetadataEntry } from "../types/index.js";

const ig = (username: string, pk: string): MetadataEntry => ({
  pk, code: "C", media_type: 2, taken_at: "2025-01-01", caption_text: "Tutorial #react",
  username, full_name: "U", location: null, like_count: 10, comment_count: 2,
  video_url: null, thumbnail_url: null, resources: [],
});
const igItem = (username: string, pk: string): SourceItem => ({
  id: `${username}_${pk}.mp4`, source: "instagram", content_type: "short_video",
  title: null, author: username, caption_text: "Tutorial #react", url: null,
  thumbnail_url: null, published_at: "2025-01-01", duration_seconds: null, ig: ig(username, pk),
});
const ytItem: SourceItem = {
  id: "youtube_abc", source: "youtube", content_type: "long_video", title: "Talk",
  author: "TechChannel", caption_text: "desc", url: "https://yt/abc", thumbnail_url: null,
  published_at: "2025-02-01", duration_seconds: 600, yt: { videoId: "abc", channelId: "UC", caption_file: null },
};

describe("buildCatalogRecord", () => {
  it("populates source/content_type/author and instagram_user for IG", () => {
    const r = buildCatalogRecord("alice_100.mp4", { category: "Tech & Coding", tags: ["react"] },
      { duration: 60, width: 1080, height: 1920, file_size: 10_485_760, codec: "h264", bitrate: 0, fps: 30 },
      igItem("alice", "100"));
    expect(r.source).toBe("instagram");
    expect(r.content_type).toBe("short_video");
    expect(r.author).toBe("alice");
    expect(r.instagram_user).toBe("alice");
    expect(r.hashtags).toEqual(["react"]);
    expect(r.resolution).toBe("1080x1920");
    expect(r.file_size_mb).toBe(10);
  });

  it("empties instagram_user for non-IG and uses the channel author", () => {
    const r = buildCatalogRecord("youtube_abc", { category: "Tech & Coding" }, undefined, ytItem);
    expect(r.source).toBe("youtube");
    expect(r.content_type).toBe("long_video");
    expect(r.author).toBe("TechChannel");
    expect(r.instagram_user).toBe("");
  });

  it("back-compat: derives instagram_user from filename when item is missing", () => {
    const r = buildCatalogRecord("bob_200.mp4", {}, undefined, undefined);
    expect(r.source).toBe("instagram");
    expect(r.instagram_user).toBe("bob");
  });
});

describe("resolveDashboardAuthor", () => {
  it("prefers author, then instagram_user, then fallback username", () => {
    expect(resolveDashboardAuthor("Chan", "ig", "fb")).toBe("Chan");
    expect(resolveDashboardAuthor("", "ig", "fb")).toBe("ig");
    expect(resolveDashboardAuthor("", "", "fb")).toBe("fb");
  });
});
