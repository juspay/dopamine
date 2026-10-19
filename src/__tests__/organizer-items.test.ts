// src/__tests__/organizer-items.test.ts
import { describe, expect, it } from "vitest";
import { isOrganizable } from "../agents/organizer.js";
import type { SourceItem } from "../types/index.js";

const item = (id: string, source: SourceItem["source"]): SourceItem => ({
  id,
  source,
  content_type: "short_video",
  title: null,
  author: null,
  caption_text: null,
  url: null,
  thumbnail_url: null,
  published_at: null,
  duration_seconds: null,
});

describe("isOrganizable", () => {
  const index = new Map([
    ["u_1.mp4", item("u_1.mp4", "instagram")],
    ["youtube_abc", item("youtube_abc", "youtube")],
  ]);

  it("organizes an instagram video", () => {
    expect(isOrganizable("u_1.mp4", index)).toBe(true);
  });

  it("skips a youtube item, whose video does not live in the instagram folder", () => {
    expect(isOrganizable("youtube_abc", index)).toBe(false);
  });

  it("still organizes an id nothing knows about, as before", () => {
    expect(isOrganizable("orphan_9.mp4", index)).toBe(true);
  });
});
