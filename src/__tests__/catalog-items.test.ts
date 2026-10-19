// src/__tests__/catalog-items.test.ts
import { describe, expect, it } from "vitest";
import { buildCatalog, buildCatalogRecord } from "../agents/catalog.js";
import { igMetadataToSourceItem } from "../sources/instagram/map.js";
import type { MetadataEntry, SourceItem, VideoProperties } from "../types/index.js";

const item = (id: string, over: Partial<SourceItem> = {}): SourceItem => ({
  id,
  source: "youtube",
  content_type: "long_video",
  title: "A title",
  author: "Some Channel",
  caption_text: "a description",
  url: "https://www.youtube.com/watch?v=abc",
  thumbnail_url: null,
  published_at: "2026-03-04T12:00:00Z",
  duration_seconds: 900,
  ...over,
});

const igEntry: MetadataEntry = {
  pk: "7",
  code: "c7",
  media_type: 2,
  taken_at: "2026-01-01T00:00:00",
  caption_text: "ig caption #tag",
  username: "someone",
  full_name: null,
  location: null,
  like_count: 12,
  comment_count: 3,
  video_url: null,
  thumbnail_url: null,
  resources: [],
};

describe("buildCatalog", () => {
  it("gives a store-only youtube item its source, content type, author and duration", () => {
    const itemById = new Map([["youtube_abc", item("youtube_abc")]]);
    const [record] = buildCatalog({ youtube_abc: { category: "Tech", subcategory: "CLI" } }, {}, itemById);
    expect(record).toMatchObject({
      filename: "youtube_abc",
      source: "youtube",
      content_type: "long_video",
      author: "Some Channel",
      duration_seconds: 900,
      instagram_user: "",
      taken_at: "2026-03-04T12:00:00Z",
    });
  });

  it("carries a text_post content type through", () => {
    const itemById = new Map([["x_1", item("x_1", { source: "youtube", content_type: "text_post" })]]);
    expect(buildCatalog({ x_1: { category: "News" } }, {}, itemById)[0].content_type).toBe("text_post");
  });

  it("builds an instagram record exactly as buildCatalogRecord does", () => {
    const igItem = igMetadataToSourceItem(igEntry);
    const cls = { category: "Tech", pk: "7", username: "someone" };
    const props: VideoProperties = {
      duration: 30,
      width: 720,
      height: 1280,
      codec: "h264",
      file_size: 1048576,
      bitrate: 1,
      fps: 30,
    };
    const [record] = buildCatalog(
      { "someone_7.mp4": cls },
      { "someone_7.mp4": props },
      new Map([["someone_7.mp4", igItem]]),
    );
    expect(record).toEqual(buildCatalogRecord("someone_7.mp4", cls, props, igItem));
  });

  it("returns records sorted by filename", () => {
    const records = buildCatalog({ b: {}, a: {}, c: {} }, {}, new Map());
    expect(records.map((r) => r.filename)).toEqual(["a", "b", "c"]);
  });
});
