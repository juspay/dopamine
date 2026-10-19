// src/__tests__/markdown-items.test.ts
import { describe, expect, it } from "vitest";
import { generateMarkdown, metaFromItem } from "../agents/markdown.js";
import type { MetadataEntry, SourceItem } from "../types/index.js";

const youtube: SourceItem = {
  id: "youtube_abc",
  source: "youtube",
  content_type: "long_video",
  title: "A talk about caching",
  author: "Some Channel",
  caption_text: null,
  url: "https://www.youtube.com/watch?v=abc",
  thumbnail_url: null,
  published_at: "2026-03-04T12:00:00Z",
  duration_seconds: 900,
};

describe("generateMarkdown for non-instagram items", () => {
  it("shows the channel as the author and the item's title, not 'unknown'", () => {
    const { content } = generateMarkdown(
      "youtube_abc",
      { category: "Tech", transcript: "hello" },
      { description: "" },
      metaFromItem(youtube),
      undefined,
    );
    expect(content).toContain("# A talk about caching");
    expect(content).toContain("**Source:** @Some Channel");
    expect(content).not.toContain("unknown");
    expect(content).toContain("**Date:** March 4, 2026");
    expect(content).toContain("**Likes:** N/A");
  });

  it("prefers the description over the item's text for the title", () => {
    const { content } = generateMarkdown(
      "youtube_abc",
      {},
      { description: "Caching explained", category: "Tech" },
      metaFromItem(youtube),
      undefined,
    );
    expect(content).toContain("# Caching explained");
  });
});

describe("generateMarkdown for instagram", () => {
  it("still renders likes and the full name from a metadata entry", () => {
    const ig: MetadataEntry = {
      pk: "7",
      code: "c7",
      media_type: 2,
      taken_at: "2026-01-01T12:00:00",
      caption_text: "ig caption",
      username: "someone",
      full_name: "Some One",
      location: null,
      like_count: 1234,
      comment_count: 0,
      video_url: null,
      thumbnail_url: null,
      resources: [],
    };
    const { content } = generateMarkdown("someone_7.mp4", { category: "Tech" }, undefined, ig, undefined);
    expect(content).toContain("**Source:** @someone (Some One)");
    expect(content).toContain("**Likes:** 1,234");
  });
});
