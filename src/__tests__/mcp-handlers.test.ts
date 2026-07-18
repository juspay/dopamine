import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleToolCall, TOOLS, type HandlerDeps } from "../mcp/handlers.js";
import { openSearchDb } from "../search/db.js";
import { buildSearchRecords, indexRecords, type SearchStates } from "../search/indexer.js";

const states: SearchStates = {
  knowledge: {
    "a_1.mp4": {
      category: "Tech & Coding",
      transcript: "cloudflare bypass with cloakbrowser",
      visual_description: "",
      key_takeaways: [{ timestamp: "0:01", takeaway: "use cloakbrowser" }],
      topics: ["scraping"],
    },
  },
  classifications: {
    "a_1.mp4": {
      category: "Tech & Coding",
      tags: ["scraping"],
      description: "CloakBrowser",
      code: "AAA",
      username: "a",
    },
  },
  catalog: [{ filename: "a_1.mp4", description: "CloakBrowser stealth chromium", taken_at: "2026-07-01" }],
  analysis: {
    "a_1.mp4": {
      actionable_items: [
        { name: "CloakBrowser", type: "tool_install", description: "stealth chromium", url: "https://example.com/c" },
      ],
    },
  },
  research: {},
  verifications: {},
  linksV2: {},
};

let tmpDir: string;
let db: DatabaseSync;
let deps: HandlerDeps;

function parseJson(content: { content: { text: string }[] }): unknown {
  return JSON.parse(content.content[0].text);
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-handlers-"));
  db = openSearchDb(path.join(tmpDir, "search.db"));
  await indexRecords(db, buildSearchRecords(states), async (texts) => texts.map(() => [1, 0, 0]), "test-model", {
    corpusGeneratedAt: "2026-07-16T00:00:00.000Z",
  });
  deps = {
    getDb: () => db,
    getQueryVector: async () => null,
    embeddingModel: "test-model",
    missingDbHelp: "HELP: build the index",
  };
});

afterEach(async () => {
  db.close();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("TOOLS", () => {
  it("declares the four tools", () => {
    expect(TOOLS.map((t) => t.name)).toEqual(["search_corpus", "get_video", "search_tools", "corpus_stats"]);
  });
});

describe("handleToolCall", () => {
  it("returns the friendly help message when the db is unavailable", async () => {
    const broken: HandlerDeps = {
      ...deps,
      getDb: () => {
        throw new Error("missing");
      },
    };
    const out = await handleToolCall(broken, "search_corpus", { query: "x" });
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toBe("HELP: build the index");
  });

  it("rejects unknown tools and missing required args as tool errors, never throws", async () => {
    expect((await handleToolCall(deps, "nope", {})).isError).toBe(true);
    expect((await handleToolCall(deps, "search_corpus", {})).isError).toBe(true);
    expect((await handleToolCall(deps, "search_tools", {})).isError).toBe(true);
  });

  it("search_corpus returns hits with fts_only mode when no query vector is available", async () => {
    const out = await handleToolCall(deps, "search_corpus", { query: "cloudflare", limit: Number.NaN });
    const result = parseJson(out) as { mode: string; hits: { id: string }[] };
    expect(out.isError).toBeUndefined();
    expect(result.mode).toBe("fts_only");
    expect(result.hits[0].id).toBe("a_1");
  });

  it("search_corpus uses hybrid mode when the query vector matches the index model", async () => {
    const withVector: HandlerDeps = { ...deps, getQueryVector: async () => [1, 0, 0] };
    const result = parseJson(await handleToolCall(withVector, "search_corpus", { query: "zzz" })) as { mode: string };
    expect(result.mode).toBe("hybrid");
  });

  it("get_video returns full detail and errors on unknown ids", async () => {
    const detail = parseJson(await handleToolCall(deps, "get_video", { id: "a_1" })) as { transcript: string };
    expect(detail.transcript).toContain("cloudflare");
    expect((await handleToolCall(deps, "get_video", { id: "missing" })).isError).toBe(true);
  });

  it("search_tools and corpus_stats return indexed data", async () => {
    const tools = parseJson(await handleToolCall(deps, "search_tools", { query: "cloak" })) as { name: string }[];
    expect(tools[0].name).toBe("CloakBrowser");
    const s = parseJson(await handleToolCall(deps, "corpus_stats", {})) as {
      totalVideos: number;
      corpusGeneratedAt: string;
    };
    expect(s.totalVideos).toBe(1);
    expect(s.corpusGeneratedAt).toBe("2026-07-16T00:00:00.000Z");
  });
});
