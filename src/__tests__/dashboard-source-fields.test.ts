// src/__tests__/dashboard-source-fields.test.ts
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resolveThumb, resolveVideoFile, sourceUrlFor } from "../dashboard/source-fields.js";
import { CONFIG } from "../pipeline/config.js";
import type { SourceItem } from "../types/index.js";

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
