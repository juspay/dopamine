// src/__tests__/search-source.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSearchDb } from "../search/db.js";
import { type SearchStates, buildSearchRecords, indexRecords } from "../search/indexer.js";
import { getVideo, hybridSearch } from "../search/query.js";
import type { SourceItem } from "../types/index.js";

const youtubeItem: SourceItem = {
  id: "youtube_abc",
  source: "youtube",
  content_type: "long_video",
  title: "A talk",
  author: "Some Channel",
  caption_text: null,
  url: "https://www.youtube.com/watch?v=abc",
  thumbnail_url: null,
  published_at: null,
  duration_seconds: null,
  yt: { videoId: "abc", channelId: null, caption_file: null },
};

const kb = {
  category: "Tech & Coding",
  transcript: "remote terminal access from the browser",
  visual_description: "",
  key_takeaways: [],
  topics: [],
};

const states: SearchStates = {
  knowledge: { "a_1.mp4": kb, youtube_abc: kb },
  classifications: {
    "a_1.mp4": {
      category: "Tech & Coding",
      tags: [],
      description: "Instagram terminal video",
      code: "AAA",
      username: "a",
    },
    youtube_abc: {
      category: "Tech & Coding",
      tags: [],
      description: "YouTube terminal talk",
      code: null,
      username: "Some Channel",
    },
  },
  catalog: [
    { filename: "a_1.mp4", description: "Instagram terminal video", taken_at: "2026-07-01" },
    { filename: "youtube_abc", description: "YouTube terminal talk", taken_at: "2026-07-02", source: "youtube" },
  ],
  analysis: {},
  research: {},
  verifications: {},
  linksV2: {},
  items: new Map([["youtube_abc", youtubeItem]]),
};

const embedder = async (texts: string[]) => texts.map(() => [1, 0, 0]);

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "search-source-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("buildSearchRecords", () => {
  it("gives each record its source, deriving instagram when the catalog says nothing", () => {
    const bySource = Object.fromEntries(buildSearchRecords(states).map((r) => [r.id, r.source]));
    expect(bySource).toEqual({ a_1: "instagram", youtube_abc: "youtube" });
  });

  it("links a non-instagram record to its original page and leaves the instagram reel link as it was", () => {
    const records = Object.fromEntries(buildSearchRecords(states).map((r) => [r.id, r.sourceUrl]));
    expect(records.youtube_abc).toBe("https://www.youtube.com/watch?v=abc");
    expect(records.a_1).toBe("https://www.instagram.com/reel/AAA/");
  });
});

describe("source facet", () => {
  it("returns only that source's rows when filtered, and both when not", async () => {
    const db = openSearchDb(path.join(dir, "search.db"));
    try {
      await indexRecords(db, buildSearchRecords(states), embedder, "test-model");
      const all = hybridSearch(db, "terminal", null);
      expect(all.hits.map((h) => h.id).sort()).toEqual(["a_1", "youtube_abc"]);
      const youtube = hybridSearch(db, "terminal", null, { source: "youtube" });
      expect(youtube.hits.map((h) => h.id)).toEqual(["youtube_abc"]);
      expect(youtube.hits[0].source).toBe("youtube");
      const instagram = hybridSearch(db, "terminal", null, { source: "instagram" });
      expect(instagram.hits.map((h) => h.id)).toEqual(["a_1"]);
    } finally {
      db.close();
    }
  });

  it("reports the source on a single video lookup", async () => {
    const db = openSearchDb(path.join(dir, "search.db"));
    try {
      await indexRecords(db, buildSearchRecords(states), embedder, "test-model");
      expect(getVideo(db, "youtube_abc")?.source).toBe("youtube");
      expect(getVideo(db, "a_1")?.source).toBe("instagram");
    } finally {
      db.close();
    }
  });
});

describe("opening a search database made before sources existed", () => {
  it("adds the source column and treats the old rows as instagram", () => {
    const dbPath = path.join(dir, "old.db");
    const old = new DatabaseSync(dbPath);
    old.exec(`CREATE TABLE videos (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, creator TEXT NOT NULL,
      taken_at TEXT NOT NULL DEFAULT '', source_url TEXT NOT NULL DEFAULT '',
      verification TEXT NOT NULL DEFAULT 'unknown', implementability REAL NOT NULL DEFAULT 0,
      usefulness TEXT NOT NULL DEFAULT 'unknown', takeaways_json TEXT NOT NULL DEFAULT '[]',
      topics_json TEXT NOT NULL DEFAULT '[]', doc_hash TEXT NOT NULL DEFAULT ''
    )`);
    old.exec("INSERT INTO videos (id, title, category, creator) VALUES ('old_1', 'Old', 'Other', 'x')");
    old.close();

    const db = openSearchDb(dbPath);
    try {
      const row = db.prepare("SELECT source FROM videos WHERE id = 'old_1'").get() as { source: string };
      expect(row.source).toBe("instagram");
    } finally {
      db.close();
    }
  });
});
