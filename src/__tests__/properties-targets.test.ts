// src/__tests__/properties-targets.test.ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { propertiesTargets, thumbnailFileName } from "../agents/properties.js";
import { CONFIG } from "../pipeline/config.js";
import type { LaneItem } from "../pipeline/lanes.js";
import type { SourceItem } from "../types/index.js";

const lane = (id: string, videoPath: string | null): LaneItem => ({
  item: {
    id,
    source: id.startsWith("youtube_") ? "youtube" : "instagram",
    content_type: "short_video",
    title: null,
    author: null,
    caption_text: null,
    url: null,
    thumbnail_url: null,
    published_at: null,
    duration_seconds: null,
  } satisfies SourceItem,
  assets: { videoPath, thumbnailPath: null, transcriptText: null },
});

const inInstagramDir = (name: string) => path.join(CONFIG.VIDEOS_DIR, name);

describe("propertiesTargets", () => {
  it("keys a disk file by its basename, as before", () => {
    expect(propertiesTargets([inInstagramDir("u_1.mp4")], [])).toEqual([
      { key: "u_1.mp4", videoPath: inInstagramDir("u_1.mp4") },
    ]);
  });

  it("keys a youtube lane video by the item id", () => {
    const ytPath = path.join(CONFIG.YOUTUBE_VIDEOS_DIR, "abc.mp4");
    expect(propertiesTargets([], [lane("youtube_abc", ytPath)])).toEqual([{ key: "youtube_abc", videoPath: ytPath }]);
  });

  it("does not add an instagram lane video twice: it is already a disk file", () => {
    const targets = propertiesTargets([inInstagramDir("u_1.mp4")], [lane("u_1.mp4", inInstagramDir("u_1.mp4"))]);
    expect(targets).toHaveLength(1);
  });

  it("skips lane items without a video", () => {
    expect(propertiesTargets([], [lane("youtube_abc", null)])).toEqual([]);
  });

  it("collapses a repeated key", () => {
    const ytPath = path.join(CONFIG.YOUTUBE_VIDEOS_DIR, "abc.mp4");
    expect(propertiesTargets([], [lane("youtube_abc", ytPath), lane("youtube_abc", ytPath)])).toHaveLength(1);
  });
});

describe("thumbnailFileName", () => {
  it("replaces .mp4 with .jpg and adds .jpg to a key that has no extension", () => {
    expect(thumbnailFileName("u_1.mp4")).toBe("u_1.jpg");
    expect(thumbnailFileName("youtube_abc")).toBe("youtube_abc.jpg");
  });
});
