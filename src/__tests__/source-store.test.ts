// src/__tests__/source-store.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ingestSourceItems, loadItemIndex } from "../sources/store.js";
import type { MetadataEntry, SourceItem } from "../types/index.js";

let dir: string;
let storePath: string;
let metadataPath: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "source-store-"));
  storePath = path.join(dir, "source_items.json");
  metadataPath = path.join(dir, "metadata.json");
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const item = (id: string, over: Partial<SourceItem> = {}): SourceItem => ({
  id,
  source: "youtube",
  content_type: "long_video",
  title: `title of ${id}`,
  author: "channel",
  caption_text: null,
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnail_url: null,
  published_at: null,
  duration_seconds: null,
  ...over,
});

const igEntry = (pk: string, username = "u"): MetadataEntry => ({
  pk,
  code: `c${pk}`,
  media_type: 2,
  taken_at: "2026-01-01T00:00:00",
  caption_text: "a caption",
  username,
  full_name: null,
  location: null,
  like_count: 0,
  comment_count: 0,
  video_url: null,
  thumbnail_url: null,
  resources: [],
});

const readStore = async (): Promise<Record<string, SourceItem>> =>
  JSON.parse(await fs.readFile(storePath, "utf8")) as Record<string, SourceItem>;

describe("ingestSourceItems", () => {
  it("adds, updates and is idempotent", async () => {
    expect(await ingestSourceItems([item("youtube_a"), item("youtube_b")], storePath)).toEqual({
      added: 2,
      updated: 0,
      skipped: 0,
      total: 2,
    });
    const again = await ingestSourceItems([item("youtube_a", { title: "new title" }), item("youtube_b")], storePath);
    expect(again).toEqual({ added: 0, updated: 2, skipped: 0, total: 2 });
    const store = await readStore();
    expect(store.youtube_a.title).toBe("new title");
    const third = await ingestSourceItems([item("youtube_a", { title: "new title" })], storePath);
    expect(third.total).toBe(2);
    expect(await readStore()).toEqual(store);
  });

  it("never writes an instagram item", async () => {
    const ig = item("u_1.mp4", { source: "instagram", content_type: "short_video" });
    const result = await ingestSourceItems([ig, item("youtube_a")], storePath);
    expect(result).toEqual({ added: 1, updated: 0, skipped: 1, total: 1 });
    expect(Object.keys(await readStore())).toEqual(["youtube_a"]);
  });

  it("keeps the later of two same-id items in one batch", async () => {
    const result = await ingestSourceItems(
      [item("youtube_a", { title: "first" }), item("youtube_a", { title: "second" })],
      storePath,
    );
    expect(result).toMatchObject({ added: 1, updated: 0, total: 1 });
    expect((await readStore()).youtube_a.title).toBe("second");
  });

  it("a corrupt store reads as empty and the next ingest rewrites it whole", async () => {
    await fs.writeFile(storePath, "{ this is not json", "utf8");
    const result = await ingestSourceItems([item("youtube_a")], storePath);
    expect(result).toMatchObject({ added: 1, total: 1 });
    expect(Object.keys(await readStore())).toEqual(["youtube_a"]);
  });
});

describe("loadItemIndex", () => {
  it("merges metadata.json and the store", async () => {
    await fs.writeFile(metadataPath, JSON.stringify([igEntry("1")]), "utf8");
    await ingestSourceItems([item("youtube_a")], storePath);
    const index = await loadItemIndex({ metadata: metadataPath, store: storePath });
    expect([...index.keys()].sort()).toEqual(["u_1.mp4", "youtube_a"]);
    expect(index.get("u_1.mp4")?.source).toBe("instagram");
    expect(index.get("u_1.mp4")?.caption_text).toBe("a caption");
    expect(index.get("youtube_a")?.title).toBe("title of youtube_a");
  });

  it("accepts an already-mapped source item inside metadata.json", async () => {
    const mapped = item("u_2.mp4", { source: "instagram", content_type: "short_video" });
    await fs.writeFile(metadataPath, JSON.stringify([mapped]), "utf8");
    const index = await loadItemIndex({ metadata: metadataPath, store: storePath });
    expect(index.get("u_2.mp4")).toEqual(mapped);
  });

  it("lets the instagram entry win when an id is in both files", async () => {
    await fs.writeFile(metadataPath, JSON.stringify([igEntry("1")]), "utf8");
    await fs.writeFile(storePath, JSON.stringify({ "u_1.mp4": item("u_1.mp4") }), "utf8");
    const index = await loadItemIndex({ metadata: metadataPath, store: storePath });
    expect(index.get("u_1.mp4")?.source).toBe("instagram");
  });

  it("reads missing or corrupt files as empty", async () => {
    expect((await loadItemIndex({ metadata: metadataPath, store: storePath })).size).toBe(0);
    await fs.writeFile(metadataPath, "not json", "utf8");
    await fs.writeFile(storePath, "[1, 2]", "utf8");
    expect((await loadItemIndex({ metadata: metadataPath, store: storePath })).size).toBe(0);
  });
});
