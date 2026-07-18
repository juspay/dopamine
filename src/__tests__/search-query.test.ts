import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSearchDb } from "../search/db.js";
import { buildSearchRecords, indexRecords, type SearchStates } from "../search/indexer.js";
import { clampLimit, getVideo, hybridSearch, searchTools, stats, toFtsQuery } from "../search/query.js";

function kb(transcript: string, takeaway: string, topics: string[]) {
  return {
    category: "Tech & Coding",
    transcript,
    visual_description: "",
    key_takeaways: [{ timestamp: "0:01", takeaway }],
    topics,
  };
}

const states: SearchStates = {
  knowledge: {
    "a_1.mp4": kb("bot detection cloudflare bypass scraping stealth", "use cloakbrowser", ["scraping"]),
    "b_2.mp4": kb("terminal remote access from browser", "use vibetunnel", ["terminals"]),
    "c_3.mp4": kb("kitchen renovation ideas", "paint the wall", ["interior"]),
  },
  classifications: {
    "a_1.mp4": {
      category: "Tech & Coding",
      tags: ["scraping"],
      description: "CloakBrowser video",
      code: "AAA",
      username: "a",
    },
    "b_2.mp4": {
      category: "Tech & Coding",
      tags: ["cli"],
      description: "VibeTunnel video",
      code: "BBB",
      username: "b",
    },
    "c_3.mp4": {
      category: "Interior Design & Home",
      tags: ["home"],
      description: "Kitchen video",
      code: "CCC",
      username: "c",
    },
  },
  catalog: [
    { filename: "a_1.mp4", description: "CloakBrowser stealth chromium", taken_at: "2026-07-01" },
    { filename: "b_2.mp4", description: "VibeTunnel remote terminal", taken_at: "2026-07-02" },
    { filename: "c_3.mp4", description: "Kitchen makeover", taken_at: "2026-07-03" },
  ],
  analysis: {
    "a_1.mp4": {
      actionable_items: [
        {
          name: "CloakBrowser",
          type: "tool_install",
          description: "stealth chromium",
          url: "https://example.com/cloak",
        },
      ],
    },
  },
  research: { "a_1.mp4": { items: [{ item_name: "CloakBrowser", url_status: "live" }] } },
  verifications: { "a_1.mp4": { overall_score: "verified_useful" } },
  linksV2: {},
};

// Fake 3-dim embedding space: video A near [1,0,0], B near [0,1,0], C near [0,0,1]
const VEC_BY_DOC_SNIPPET: [string, number[]][] = [
  ["cloakbrowser", [1, 0, 0.05]],
  ["vibetunnel", [0, 1, 0.05]],
  ["kitchen", [0, 0.05, 1]],
];

async function embedder(texts: string[]): Promise<number[][]> {
  return texts.map((t) => {
    const lower = t.toLowerCase();
    const match = VEC_BY_DOC_SNIPPET.find(([snippet]) => lower.includes(snippet));
    return match ? match[1] : [0.3, 0.3, 0.3];
  });
}

let tmpDir: string;
let db: DatabaseSync;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-query-"));
  db = openSearchDb(path.join(tmpDir, "search.db"));
  await indexRecords(db, buildSearchRecords(states), embedder, "test-model");
});

afterEach(async () => {
  db.close();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("toFtsQuery", () => {
  it("quotes every term, keeping operator words searchable as literals", () => {
    expect(toFtsQuery('cloudflare "bypass"')).toBe('"cloudflare" OR "bypass"');
    expect(toFtsQuery("black and white")).toBe('"black" OR "and" OR "white"');
    expect(toFtsQuery("  ")).toBe('""');
  });
});

describe("clampLimit", () => {
  it("clamps NaN, negatives, floats, and huge values", () => {
    expect(clampLimit(undefined, 10)).toBe(10);
    expect(clampLimit(Number.NaN, 10)).toBe(10);
    expect(clampLimit(-5, 10)).toBe(1);
    expect(clampLimit(3.9, 10)).toBe(3);
    expect(clampLimit(10_000, 10)).toBe(100);
  });
});

describe("hybridSearch", () => {
  it("finds by keyword in fts_only mode", () => {
    const result = hybridSearch(db, "cloudflare", null);
    expect(result.mode).toBe("fts_only");
    expect(result.hits[0].id).toBe("a_1");
    expect(result.hits[0].topTools).toContain("CloakBrowser");
  });

  it("uses the query vector in hybrid mode", () => {
    const result = hybridSearch(db, "zzz-no-keyword-match", [0, 0.9, 0.1]);
    expect(result.mode).toBe("hybrid");
    expect(result.hits[0].id).toBe("b_2");
  });

  it("only compares same-model embeddings when queryModel is given, and reports the honest mode", () => {
    // Query vector points at video B, but the index was built with "test-model" —
    // a mismatched queryModel must ignore all vectors and fall back to FTS signal only.
    const mismatch = hybridSearch(db, "zzz-no-keyword-match", [0, 0.9, 0.1], { queryModel: "other-model" });
    expect(mismatch.hits).toHaveLength(0);
    expect(mismatch.mode).toBe("fts_only");
    const match = hybridSearch(db, "zzz-no-keyword-match", [0, 0.9, 0.1], { queryModel: "test-model" });
    expect(match.hits[0].id).toBe("b_2");
    expect(match.mode).toBe("hybrid");
  });

  it("applies category filter and limit", () => {
    // OR semantics: each term matches a different video, so all three are candidates
    const query = "cloudflare terminal kitchen";
    const filtered = hybridSearch(db, query, null, { category: "Interior Design & Home" });
    expect(filtered.hits.map((h) => h.id)).toEqual(["c_3"]);
    const limited = hybridSearch(db, query, null, { limit: 1 });
    expect(limited.hits).toHaveLength(1);
  });
});

describe("getVideo", () => {
  it("returns full detail including transcript and tools", () => {
    const detail = getVideo(db, "a_1");
    expect(detail).not.toBeNull();
    expect(detail?.transcript).toContain("cloudflare");
    expect(detail?.tools[0].name).toBe("CloakBrowser");
    expect(detail?.verification).toBe("verified_useful");
  });

  it("returns null for unknown ids", () => {
    expect(getVideo(db, "nope")).toBeNull();
  });
});

describe("searchTools", () => {
  it("matches name substrings case-insensitively", () => {
    const hits = searchTools(db, "cloak");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ name: "CloakBrowser", urlStatus: "live", videoId: "a_1" });
  });

  it("filters by type", () => {
    expect(searchTools(db, "cloak", "workflow")).toHaveLength(0);
    expect(searchTools(db, "cloak", "tool_install")).toHaveLength(1);
  });
});

describe("stats", () => {
  it("reports totals, categories, and embedding coverage", () => {
    const s = stats(db);
    expect(s.totalVideos).toBe(3);
    expect(s.embeddedVideos).toBe(3);
    expect(s.model).toBe("test-model");
    expect(s.categories.find((c) => c.name === "Tech & Coding")?.count).toBe(2);
    expect(s.builtAt).not.toBe("");
  });
});
