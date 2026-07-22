import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type ProjectMappingsFile,
  type ProjectVector,
  parseJudgement,
  prefilter,
  runProjectMapper,
} from "../agents/project-mapper.js";
import { openSearchDb } from "../search/db.js";
import { type SearchStates, buildSearchRecords, indexRecords } from "../search/indexer.js";

describe("prefilter", () => {
  const projects: ProjectVector[] = [
    { name: "A", vector: Float32Array.from([1, 0, 0]) },
    { name: "B", vector: Float32Array.from([0, 1, 0]) },
    { name: "C", vector: Float32Array.from([0, 0, 1]) },
  ];
  it("returns projects above the floor, best first", () => {
    expect(prefilter([1, 0.1, 0], projects, 4, 0.5)).toEqual(["A"]);
    expect(prefilter([0, 0, 0], projects, 4, 0.5)).toEqual([]);
  });
  it("respects topK", () => {
    expect(prefilter([1, 1, 1], projects, 2, 0.1)).toHaveLength(2);
  });
});

describe("parseJudgement", () => {
  it("keeps applies+known verdicts, clamps reason, drops the rest", () => {
    const r = parseJudgement(
      {
        results: [
          { project: "A", applies: true, confidence: "high", reason: "x".repeat(300) },
          { project: "B", applies: false, confidence: "low", reason: "no" },
          { project: "Z", applies: true, confidence: "high", reason: "unknown project" },
        ],
      },
      ["A", "B"],
    );
    expect(r).toHaveLength(1);
    expect(r[0].project).toBe("A");
    expect(r[0].reason.length).toBeLessThanOrEqual(140);
  });

  it("dedupes duplicate/case-variant verdicts for the same project", () => {
    const r = parseJudgement(
      {
        results: [
          { project: "Alpha", applies: true, confidence: "high", reason: "first" },
          { project: "alpha", applies: true, confidence: "low", reason: "dup case-variant" },
          { project: "Alpha", applies: true, confidence: "medium", reason: "literal dup" },
        ],
      },
      ["Alpha"],
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ project: "Alpha", confidence: "high" });
  });

  it("returns [] on malformed output", () => {
    expect(parseJudgement({ nope: 1 }, ["A"])).toEqual([]);
  });
});

function kb(transcript: string, takeaway: string) {
  return {
    category: "Tech & Coding",
    transcript,
    visual_description: "",
    key_takeaways: [{ timestamp: "0:01", takeaway }],
    topics: [],
  };
}

const states: SearchStates = {
  knowledge: {
    "a_1.mp4": kb("web scraping stealth browser", "scrape sites"),
    "b_2.mp4": kb("cooking pasta recipe kitchen", "cook pasta"),
    "c_3.mp4": kb("unrelated middle topic", "middling"),
  },
  classifications: {
    "a_1.mp4": { category: "Tech & Coding", tags: [], description: "Scraper video", code: "AAA", username: "a" },
    "b_2.mp4": { category: "Food & Cooking", tags: [], description: "Pasta video", code: "BBB", username: "b" },
    "c_3.mp4": { category: "Other", tags: [], description: "Middle video", code: "CCC", username: "c" },
  },
  catalog: [
    { filename: "a_1.mp4", description: "Scraper video", taken_at: "2026-07-10" },
    { filename: "b_2.mp4", description: "Pasta video", taken_at: "2026-07-11" },
    { filename: "c_3.mp4", description: "Middle video", taken_at: "2026-07-12" },
  ],
  analysis: { "a_1.mp4": { actionable_items: [{ name: "StealthBrowser", type: "tool_install", description: "d" }] } },
  research: {},
  verifications: {},
  linksV2: {},
};

// Video embedder: scraper→[1,0,0], cooking→[0,0,1], else→[0,1,0]
const videoEmbed = async (texts: string[]): Promise<number[][]> =>
  texts.map((t) => (t.includes("scraping") ? [1, 0, 0] : t.includes("cooking") ? [0, 0, 1] : [0, 1, 0]));

// Project embedder mirrors the space: Scraper→[1,0,0], Kitchen→[0,0,1]
const projectEmbed = async (text: string): Promise<number[]> => (text.includes("cooking") ? [0, 0, 1] : [1, 0, 0]);

const PROJECTS = [
  { name: "Scraper", description: "web scraping tools and anti-bot bypass", keywords: [] },
  { name: "Kitchen", description: "cooking recipes and food prep", keywords: [] },
];

let tmpDir: string;

async function seedDb(dbPath: string) {
  const db = openSearchDb(dbPath);
  await indexRecords(db, buildSearchRecords(states), videoEmbed, "test-model");
  db.close();
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-mapper-"));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("runProjectMapper", () => {
  const paths = () => ({
    dbPath: path.join(tmpDir, "search.db"),
    projectsPath: path.join(tmpDir, "projects.json"),
    mappingsPath: path.join(tmpDir, "project_mappings.json"),
    // the fixture seeds embeddings with "test-model"; the mapper only prefilters
    // videos embedded with this model so its vectors share the project space
    embeddingModel: "test-model",
  });

  it("prefilters then judges, writing mappings to json and the table", async () => {
    const p = paths();
    await seedDb(p.dbPath);
    await fs.writeFile(p.projectsPath, JSON.stringify(PROJECTS));
    const judge = async (prompt: string) => ({
      results: ["Scraper", "Kitchen"]
        .filter((n) => prompt.includes(`- ${n}:`))
        .map((n) => ({ project: n, applies: true, confidence: "high", reason: `fits ${n}` })),
    });
    await runProjectMapper(null, { ...p, embed: projectEmbed, judge });

    const file = JSON.parse(await fs.readFile(p.mappingsPath, "utf8")) as ProjectMappingsFile;
    expect(file.mappings.a_1.map((m) => m.project)).toEqual(["Scraper"]);
    expect(file.mappings.b_2.map((m) => m.project)).toEqual(["Kitchen"]);
    expect(file.mappings.c_3).toEqual([]); // no candidate cleared the floor → judged nothing

    const db = openSearchDb(p.dbPath, { readonly: true });
    const rows = db.prepare("SELECT video_id, project FROM project_mappings ORDER BY video_id").all() as {
      video_id: string;
      project: string;
    }[];
    db.close();
    expect(rows).toEqual([
      { video_id: "a_1", project: "Scraper" },
      { video_id: "b_2", project: "Kitchen" },
    ]);
  });

  it("is incremental: unchanged portfolio re-judges nothing, changed portfolio re-maps", async () => {
    const p = paths();
    await seedDb(p.dbPath);
    await fs.writeFile(p.projectsPath, JSON.stringify(PROJECTS));
    let calls = 0;
    const judge = async (prompt: string) => {
      calls++;
      return {
        results: ["Scraper", "Kitchen"]
          .filter((n) => prompt.includes(`- ${n}:`))
          .map((n) => ({ project: n, applies: true, confidence: "high", reason: "x" })),
      };
    };
    await runProjectMapper(null, { ...p, embed: projectEmbed, judge });
    const first = calls;
    expect(first).toBeGreaterThan(0);

    await runProjectMapper(null, { ...p, embed: projectEmbed, judge });
    expect(calls).toBe(first); // same hash → no new judgements

    await fs.writeFile(
      p.projectsPath,
      JSON.stringify([{ ...PROJECTS[0], description: "web scraping — REWORDED" }, PROJECTS[1]]),
    );
    await runProjectMapper(null, { ...p, embed: projectEmbed, judge });
    expect(calls).toBeGreaterThan(first); // portfolio changed → re-mapped
  });

  it("re-judges a video whose search-index content hash changed", async () => {
    const p = paths();
    await seedDb(p.dbPath);
    await fs.writeFile(p.projectsPath, JSON.stringify(PROJECTS));
    let calls = 0;
    const judge = async (prompt: string) => {
      calls++;
      return {
        results: ["Scraper", "Kitchen"]
          .filter((n) => prompt.includes(`- ${n}:`))
          .map((n) => ({ project: n, applies: true, confidence: "high", reason: "x" })),
      };
    };
    await runProjectMapper(null, { ...p, embed: projectEmbed, judge });
    const first = calls;

    const db = openSearchDb(p.dbPath);
    db.prepare("UPDATE videos SET doc_hash = ? WHERE id = ?").run("CHANGED", "a_1");
    db.close();

    await runProjectMapper(null, { ...p, embed: projectEmbed, judge });
    expect(calls).toBe(first + 1); // only a_1 re-judged; unchanged videos skipped
  });

  it("no-ops without projects.json", async () => {
    const p = paths();
    await seedDb(p.dbPath);
    await runProjectMapper(null, { ...p, embed: projectEmbed, judge: async () => ({ results: [] }) });
    await expect(fs.access(p.mappingsPath)).rejects.toThrow();
  });
});
