// src/__tests__/source-paths.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONFIG } from "../pipeline/config.js";
import { localVideoPath } from "../sources/paths.js";
import type { SourceItem } from "../types/index.js";

const base: SourceItem = {
  id: "x",
  source: "instagram",
  content_type: "short_video",
  title: null,
  author: null,
  caption_text: null,
  url: null,
  thumbnail_url: null,
  published_at: null,
  duration_seconds: null,
};

describe("localVideoPath", () => {
  it("puts an instagram video in the saved-videos folder under its filename", () => {
    expect(localVideoPath(base, "u_1.mp4")).toBe(path.join(CONFIG.VIDEOS_DIR, "u_1.mp4"));
  });

  it("treats an id with no known item as instagram, as the dashboard always has", () => {
    expect(localVideoPath(undefined, "u_1.mp4")).toBe(path.join(CONFIG.VIDEOS_DIR, "u_1.mp4"));
  });

  it("puts a youtube video in the youtube folder under its video id", () => {
    const yt: SourceItem = {
      ...base,
      id: "youtube_abc",
      source: "youtube",
      content_type: "short_video",
      yt: { videoId: "abc", channelId: null, caption_file: null },
    };
    expect(localVideoPath(yt, "youtube_abc")).toBe(path.join(CONFIG.YOUTUBE_VIDEOS_DIR, "abc.mp4"));
  });

  it("returns null for a youtube item that has no video id", () => {
    expect(localVideoPath({ ...base, id: "youtube_x", source: "youtube" }, "youtube_x")).toBeNull();
  });
});
