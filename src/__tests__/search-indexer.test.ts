import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSearchDb } from "../search/db.js";
import { buildSearchRecords, indexRecords, type SearchStates } from "../search/indexer.js";

const states: SearchStates = {
  knowledge: {
    "creator_1.mp4": {
      category: "Tech & Coding",
      transcript: "we use vibetunnel for remote terminals",
      visual_description: "terminal demo",
      key_takeaways: [{ timestamp: "0:01", takeaway: "install vibetunnel" }],
      topics: ["terminals"],
    },
  },
  classifications: {
    "creator_1.mp4": {
      category: "Tech & Coding",
      tags: ["cli"],
      description: "class desc",
      code: "AbC123",
      username: "creator",
    },
  },
  catalog: [
    {
      filename: "creator_1.mp4",
      description: "VibeTunnel remote terminal",
      taken_at: "2026-07-01",
      caption: "cap",
      instagram_user: "creator",
    },
  ],
  analysis: {
    "creator_1.mp4": {
      actionable_items: [
        { name: "vibetunnel", type: "tool_install", description: "remote terminal", url: "https://vibetunnel.sh" },
      ],
      implementability_score: 8,
      usefulness_prediction: "highly_useful",
    },
  },
  research: { "creator_1.mp4": { items: [{ item_name: "vibetunnel", url_status: "live" }] } },
  verifications: { "creator_1.mp4": { overall_score: "verified_useful" } },
  linksV2: { "creator_1.mp4": { links: [{ name: "vibetunnel", url: "https://vibetunnel.sh", description: "site" }] } },
};

describe("buildSearchRecords", () => {
  it("builds one record with derived title, tools, and composed doc", () => {
    const records = buildSearchRecords(states);
    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.id).toBe("creator_1");
    expect(r.title).toBe("VibeTunnel remote terminal");
    expect(r.creator).toBe("creator");
    expect(r.sourceUrl).toBe("https://www.instagram.com/reel/AbC123/");
    expect(r.verification).toBe("verified_useful");
    expect(r.tools[0]).toMatchObject({ name: "vibetunnel", urlStatus: "live" });
    // The links_v2 entry with the same name must not duplicate the analysis tool
    expect(r.tools.filter((t) => t.name === "vibetunnel")).toHaveLength(1);
    expect(r.doc).toContain("install vibetunnel");
    expect(r.docHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("indexRecords", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-indexer-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("embeds new records, skips unchanged on re-run, prunes deleted", async () => {
    const db = openSearchDb(path.join(tmpDir, "search.db"));
    const calls: string[][] = [];
    const embedder = async (texts: string[]): Promise<number[][]> => {
      calls.push(texts);
      return texts.map(() => [0.1, 0.2, 0.3]);
    };
    const records = buildSearchRecords(states);

    await indexRecords(db, records, embedder, "test-model");
    expect(calls).toHaveLength(1);

    await indexRecords(db, records, embedder, "test-model");
    expect(calls).toHaveLength(1);

    await indexRecords(db, [], embedder, "test-model");
    const count = db.prepare("SELECT COUNT(*) AS n FROM videos").get() as { n: number };
    expect(count.n).toBe(0);
    const ftsCount = db.prepare("SELECT COUNT(*) AS n FROM videos_fts").get() as { n: number };
    expect(ftsCount.n).toBe(0);
    db.close();
  });

  it("refreshes the FTS row when only the tail of a long transcript changes", async () => {
    // The embedded doc is truncated to 4000 chars, so a change past the cutoff
    // leaves docHash identical — the FTS gate must still catch it (contentHash
    // hashes the full FTS values, not the truncated doc).
    const db = openSearchDb(path.join(tmpDir, "search.db"));
    const embedder = async (texts: string[]): Promise<number[][]> => texts.map(() => [1, 0, 0]);
    const longTranscript = `${"x".repeat(6000)} ORIGINAL_TAIL`;
    const long: SearchStates = {
      ...states,
      knowledge: { "creator_1.mp4": { ...states.knowledge["creator_1.mp4"], transcript: longTranscript } },
    };
    await indexRecords(db, buildSearchRecords(long), embedder, "test-model");

    const changed: SearchStates = {
      ...long,
      knowledge: {
        "creator_1.mp4": {
          ...long.knowledge["creator_1.mp4"],
          transcript: longTranscript.replace("ORIGINAL_TAIL", "CHANGED_TAIL"),
        },
      },
    };
    await indexRecords(db, buildSearchRecords(changed), embedder, "test-model");
    const fts = db.prepare("SELECT transcript FROM videos_fts WHERE id = ?").get("creator_1") as {
      transcript: string;
    };
    expect(fts.transcript).toContain("CHANGED_TAIL");
    db.close();
  });

  it("refreshes the FTS row when only the caption changes", async () => {
    const db = openSearchDb(path.join(tmpDir, "search.db"));
    const embedder = async (texts: string[]): Promise<number[][]> => texts.map(() => [1, 0, 0]);
    await indexRecords(db, buildSearchRecords(states), embedder, "test-model");

    // caption is FTS-indexed but not part of the embedded doc
    const changed: SearchStates = {
      ...states,
      catalog: [{ ...states.catalog[0], caption: "brand new caption" }],
    };
    await indexRecords(db, buildSearchRecords(changed), embedder, "test-model");
    const fts = db.prepare("SELECT caption FROM videos_fts WHERE id = ?").get("creator_1") as { caption: string };
    expect(fts.caption).toBe("brand new caption");
    db.close();
  });

  it("re-embeds when the model changes", async () => {
    const db = openSearchDb(path.join(tmpDir, "search.db"));
    const calls: string[][] = [];
    const embedder = async (texts: string[]): Promise<number[][]> => {
      calls.push(texts);
      return texts.map(() => [1, 0, 0]);
    };
    const records = buildSearchRecords(states);
    await indexRecords(db, records, embedder, "model-a");
    await indexRecords(db, records, embedder, "model-b");
    expect(calls).toHaveLength(2);
    db.close();
  });
});
