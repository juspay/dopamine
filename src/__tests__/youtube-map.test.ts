// src/__tests__/youtube-map.test.ts
import { describe, it, expect } from "vitest";
import { deriveContentType, youtubeId, mapYtVideo, type YtVideoRaw } from "../sources/youtube/map.js";

describe("deriveContentType", () => {
  it("classifies <= threshold as short_video (boundary included)", () => {
    expect(deriveContentType(60, 60)).toBe("short_video");
    expect(deriveContentType(59, 60)).toBe("short_video");
  });
  it("classifies > threshold as long_video", () => {
    expect(deriveContentType(61, 60)).toBe("long_video");
  });
});

describe("youtubeId", () => {
  it("prefixes the raw video id", () => {
    expect(youtubeId("abc")).toBe("youtube_abc");
  });
});

describe("mapYtVideo", () => {
  const raw: YtVideoRaw = {
    id: "vid1", title: "T", channelId: "UC1", channelTitle: "Chan",
    durationSeconds: 700, publishedAt: "2024-01-01T00:00:00Z",
    thumbnailUrl: "https://img/x.jpg", description: "desc",
  };
  it("maps to a SourceItem with youtube id/source/content_type/author/url/yt", () => {
    const item = mapYtVideo(raw, 300);
    expect(item.id).toBe("youtube_vid1");
    expect(item.source).toBe("youtube");
    expect(item.content_type).toBe("long_video");
    expect(item.author).toBe("Chan");
    expect(item.url).toBe("https://www.youtube.com/watch?v=vid1");
    expect(item.caption_text).toBe("desc");
    expect(item.yt?.videoId).toBe("vid1");
    expect(item.yt?.channelId).toBe("UC1");
  });

  it("maps null channelTitle and channelId to null author and null yt.channelId", () => {
    const rawNullChannel: YtVideoRaw = {
      id: "vid2", title: "T2", channelId: null, channelTitle: null,
      durationSeconds: 30, publishedAt: null,
      thumbnailUrl: null, description: null,
    };
    const item = mapYtVideo(rawNullChannel, 300);
    expect(item.author).toBeNull();
    expect(item.yt?.channelId).toBeNull();
  });
});
