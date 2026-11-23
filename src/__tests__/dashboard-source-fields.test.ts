// src/__tests__/dashboard-source-fields.test.ts
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  creatorFor,
  dateFor,
  metadataByVideoFile,
  resolveThumb,
  resolveVideoFile,
  sourceUrlFor,
} from "../dashboard/source-fields.js";
import { CONFIG } from "../pipeline/config.js";
import type { MetadataEntry, SourceItem } from "../types/index.js";

const base: SourceItem = {
  id: "x",
  source: "instagram",
  content_type: "short_video",
  title: null,
  author: null,
  caption_text: null,
  url: "https://scontent.cdninstagram.com/signed-video-url",
  thumbnail_url: null,
  published_at: null,
  duration_seconds: null,
};
const youtube: SourceItem = {
  ...base,
  id: "youtube_abc",
  source: "youtube",
  url: "https://www.youtube.com/watch?v=abc",
  yt: { videoId: "abc", channelId: null, caption_file: null },
};

describe("sourceUrlFor", () => {
  it("is the watch or post url for a non-instagram item", () => {
    expect(sourceUrlFor(youtube)).toBe("https://www.youtube.com/watch?v=abc");
  });
  it("is null for instagram, whose item url is an expiring CDN link, and for an unknown item", () => {
    expect(sourceUrlFor(base)).toBeNull();
    expect(sourceUrlFor(undefined)).toBeNull();
  });
  it("is null for a non-instagram item with no url", () => {
    expect(sourceUrlFor({ ...youtube, url: null })).toBeNull();
  });
});

describe("resolveVideoFile", () => {
  const savedDir = path.basename(CONFIG.VIDEOS_DIR);

  it("keeps the instagram url shape: the saved-videos folder, then the encoded filename", async () => {
    const exists = vi.fn(async () => true);
    expect(await resolveVideoFile(base, "some user_1.mp4", exists)).toEqual({
      hasVideo: true,
      videoPath: `/videos/${savedDir}/some%20user_1.mp4`,
    });
  });

  it("treats an id with no known item as instagram", async () => {
    const result = await resolveVideoFile(undefined, "u_1.mp4", async () => true);
    expect(result.videoPath).toBe(`/videos/${savedDir}/u_1.mp4`);
  });

  it("serves a youtube video from the youtube folder", async () => {
    expect(await resolveVideoFile(youtube, "youtube_abc", async () => true)).toEqual({
      hasVideo: true,
      videoPath: "/videos/youtube/abc.mp4",
    });
  });

  it("reports no video when the file is missing", async () => {
    expect(await resolveVideoFile(youtube, "youtube_abc", async () => false)).toEqual({
      hasVideo: false,
      videoPath: null,
    });
  });

  it("does not look for a file when the source keeps none", async () => {
    const exists = vi.fn(async () => true);
    const noId: SourceItem = { ...youtube, yt: undefined };
    expect(await resolveVideoFile(noId, "youtube_abc", exists)).toEqual({ hasVideo: false, videoPath: null });
    expect(exists).not.toHaveBeenCalled();
  });
});

describe("resolveThumb", () => {
  it("always returns the path for an instagram item, as before, even if the file is missing", async () => {
    expect(await resolveThumb(base, "u_1", async () => false)).toBe("/videos/thumbnails/u_1.jpg");
    expect(await resolveThumb(undefined, "u_1", async () => false)).toBe("/videos/thumbnails/u_1.jpg");
  });

  it("returns the path for a non-instagram item whose thumbnail exists", async () => {
    expect(await resolveThumb(youtube, "youtube_abc", async () => true)).toBe("/videos/thumbnails/youtube_abc.jpg");
  });

  it("returns an empty string for a non-instagram item with no thumbnail, so the page shows a placeholder", async () => {
    expect(await resolveThumb(youtube, "youtube_abc", async () => false)).toBe("");
  });
});

// 2026-11-22: every YouTube card showed "unknown" as its creator, because the dashboard read
// the creator from Instagram-only fields while the channel name was in the item's author.
describe("creatorFor", () => {
  it("uses the channel or handle of a non-Instagram item", () => {
    expect(creatorFor({ ...youtube, author: "AICodeKing" }, "")).toBe("AICodeKing");
    expect(creatorFor({ ...youtube, source: "x", author: "@someone" }, "")).toBe("someone");
  });
  it("keeps what the Instagram lookups found", () => {
    expect(creatorFor({ ...base, author: "ignored" }, "ig_user")).toBe("ig_user");
    expect(creatorFor(undefined, "ig_user")).toBe("ig_user");
  });
  it("falls back to what was found when a non-Instagram item has no author", () => {
    expect(creatorFor({ ...youtube, author: null }, "")).toBe("");
  });
});

describe("dateFor", () => {
  it("uses a non-Instagram item's publish date when the catalog has none", () => {
    expect(dateFor({ ...youtube, published_at: "2026-11-01T10:00:00Z" }, "")).toBe("2026-11-01T10:00:00Z");
  });
  it("prefers the catalog date, and is empty when there is none at all", () => {
    expect(dateFor({ ...youtube, published_at: "2026-11-01T10:00:00Z" }, "2026-10-01")).toBe("2026-10-01");
    expect(dateFor({ ...youtube, published_at: null }, "")).toBe("");
    expect(dateFor(undefined, "2026-10-01")).toBe("2026-10-01");
  });
});

describe("metadataByVideoFile", () => {
  const post = (username: string, pk: string, urls: string[]): MetadataEntry => ({
    pk,
    code: pk,
    media_type: 8,
    taken_at: null,
    caption_text: null,
    username,
    full_name: `${username} name`,
    location: null,
    like_count: 0,
    comment_count: 0,
    video_url: null,
    thumbnail_url: null,
    resources: urls.map((u, i) => ({ pk: `${pk}${i}`, media_type: 2, video_url: u, thumbnail_url: null })),
  });
  const cdn = (name: string): string => `https://scontent.cdninstagram.com/o1/v/t2/f2/${name}?_nc_ht=x&oh=y`;

  it("finds a multi-video post by the file name of any of its videos", () => {
    const map = metadataByVideoFile([post("technologyhive", "1", [cdn("AQNa.mp4"), cdn("AQNb.mp4")])]);
    expect(map.get("AQNa.mp4")?.username).toBe("technologyhive");
    expect(map.get("AQNb.mp4")?.username).toBe("technologyhive");
    expect(map.get("other.mp4")).toBeUndefined();
  });
  it("leaves out a file name two accounts share, and skips missing or bad links", () => {
    const map = metadataByVideoFile([
      post("a", "1", [cdn("same.mp4"), "not a url"]),
      post("b", "2", [cdn("same.mp4")]),
      post("c", "3", [cdn("same.mp4")]),
      { ...post("d", "4", []), resources: undefined as unknown as MetadataEntry["resources"] },
    ]);
    expect(map.has("same.mp4")).toBe(false);
    expect(map.size).toBe(0);
  });
});
