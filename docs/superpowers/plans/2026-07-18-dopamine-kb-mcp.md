# Dopamine Knowledge-Base MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hybrid (FTS5 + embeddings) search index over the video corpus and expose it as a user-scoped `dopamine-kb` MCP server so any Claude Code session can query the learnings.

**Architecture:** A new final pipeline step (`src/search/indexer.ts`) builds `videos/search.db` (node:sqlite; FTS5 + embedding BLOBs via the NeuroLink Vertex provider, incremental by content hash). A pure query engine (`src/search/query.ts` + `rank.ts`) does BM25 + cosine + reciprocal-rank fusion. A stdio MCP server (`src/mcp/server.ts`) exposes 4 tools and degrades to keyword-only when embedding calls fail.

**Tech Stack:** TypeScript ESM (strict, no `any`), `node:sqlite` (Node ≥24), `@juspay/neurolink` (`createAIProvider("vertex")` → `embedMany`), `@modelcontextprotocol/sdk` (low-level `Server` API, no zod coupling), vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-dopamine-kb-mcp-design.md`

**Conventions:** conventional commits; repo enforces single-commit PRs — commit per task during development, squash to one commit before opening the PR. Public repo: no personal paths/usernames in committed files.

---

### Task 0: Environment checks + dependency install

**Files:**
- Modify: `package.json` (dependency only; engines/scripts come later)

- [ ] **Step 0.1: Verify assumptions**

Run:
```bash
node --version                       # expect v24.x
grep '"zod"' package.json            # note zod major (SDK coupling avoided via low-level API regardless)
node -e "const s=require('node:sqlite'); const d=new s.DatabaseSync(':memory:'); d.exec(\"CREATE VIRTUAL TABLE t USING fts5(c)\"); console.log('fts5 ok')"
```
Expected: `fts5 ok`.

- [ ] **Step 0.2: Install MCP SDK**

Run: `npm install @modelcontextprotocol/sdk`
Expected: added to `dependencies`, lockfile updated, `npm ls @modelcontextprotocol/sdk` resolves.

- [ ] **Step 0.3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @modelcontextprotocol/sdk dependency"
```

---

### Task 1: Shared `deriveTitle` helper

**Files:**
- Create: `src/dashboard/title.ts`
- Modify: `src/dashboard/data-builder.ts:396-398`
- Test: `src/__tests__/derive-title.test.ts`

- [ ] **Step 1.1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { deriveTitle } from "../dashboard/title.js";

describe("deriveTitle", () => {
  it("prefers the catalog description", () => {
    expect(deriveTitle("Catalog desc", "Takeaway", "Class desc")).toBe("Catalog desc");
  });
  it("falls back to the first takeaway when catalog description is empty", () => {
    expect(deriveTitle("", "Takeaway", "Class desc")).toBe("Takeaway");
  });
  it("falls back to the classification description", () => {
    expect(deriveTitle(undefined, "", "Class desc")).toBe("Class desc");
  });
  it("returns (untitled) when everything is empty", () => {
    expect(deriveTitle(undefined, "", undefined)).toBe("(untitled)");
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/derive-title.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 1.3: Implement `src/dashboard/title.ts`**

```ts
/**
 * Title = catalog.description || first key_takeaway || classification.description || "(untitled)".
 * Shared by the dashboard data-builder and the search indexer so both derive
 * identical titles for the same video.
 */
export function deriveTitle(
  catalogDescription: string | undefined,
  firstTakeaway: string,
  classificationDescription: string | undefined,
): string {
  return catalogDescription || firstTakeaway || classificationDescription || "(untitled)";
}
```

- [ ] **Step 1.4: Use it in `data-builder.ts`**

Add import `import { deriveTitle } from "./title.js";` and replace lines 396-398:

```ts
// Title = catalog.description || first key_takeaway || classification.description || "(untitled)"
const title =
  catEntry?.description || takeawayText(kbEntry?.key_takeaways?.[0]) || classEntry?.description || "(untitled)";
```
with:
```ts
const title = deriveTitle(catEntry?.description, takeawayText(kbEntry?.key_takeaways?.[0]), classEntry?.description);
```

- [ ] **Step 1.5: Run tests + typecheck** — `npx vitest run && npx tsc --noEmit` → all pass.

- [ ] **Step 1.6: Commit** — `git add -A src/dashboard src/__tests__/derive-title.test.ts && git commit -m "refactor: extract deriveTitle into shared dashboard/title module"`

---

### Task 2: Composed-doc builder + hash (`src/search/doc.ts`)

**Files:**
- Create: `src/search/doc.ts`
- Test: `src/__tests__/search-doc.test.ts`

- [ ] **Step 2.1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { COMPOSED_DOC_MAX_CHARS, composeDoc, sha256Hex, type ComposedDocInput } from "../search/doc.js";

const base: ComposedDocInput = {
  title: "T",
  category: "Tech & Coding",
  tags: ["a", "b"],
  topics: ["topic1"],
  takeaways: ["do X", "do Y"],
  tools: [{ name: "toolA", description: "descA" }, { name: "toolB", description: "" }],
  description: "desc",
  transcript: "spoken words",
};

describe("composeDoc", () => {
  it("orders fields with transcript last", () => {
    const doc = composeDoc(base);
    expect(doc.indexOf("T")).toBeLessThan(doc.indexOf("do X"));
    expect(doc.endsWith("spoken words")).toBe(true);
    expect(doc).toContain("toolA: descA");
    expect(doc).toContain("toolB");
  });
  it("skips empty parts without blank lines", () => {
    const doc = composeDoc({ ...base, tags: [], description: "" });
    expect(doc).not.toMatch(/\n\n/);
  });
  it("truncates to the budget, sacrificing transcript first", () => {
    const doc = composeDoc({ ...base, transcript: "x".repeat(10_000) });
    expect(doc.length).toBe(COMPOSED_DOC_MAX_CHARS);
    expect(doc).toContain("do X"); // earlier fields survive
  });
});

describe("sha256Hex", () => {
  it("is stable and input-sensitive", () => {
    expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
    expect(sha256Hex("abc")).not.toBe(sha256Hex("abd"));
    expect(sha256Hex("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2.2: Run to verify failure** — `npx vitest run src/__tests__/search-doc.test.ts` → FAIL.

- [ ] **Step 2.3: Implement `src/search/doc.ts`**

```ts
import crypto from "node:crypto";

export interface ComposedDocInput {
  title: string;
  category: string;
  tags: string[];
  topics: string[];
  takeaways: string[];
  tools: { name: string; description: string }[];
  description: string;
  transcript: string;
}

export const COMPOSED_DOC_MAX_CHARS = 4000;

/**
 * Priority-ordered document for embedding + FTS. High-signal fields come first
 * so the truncation budget always sacrifices transcript tail, never takeaways.
 */
export function composeDoc(input: ComposedDocInput): string {
  const parts = [
    input.title,
    input.category,
    input.tags.join(", "),
    input.topics.join(", "),
    input.takeaways.join("\n"),
    input.tools.map((t) => (t.description ? `${t.name}: ${t.description}` : t.name)).join("\n"),
    input.description,
    input.transcript,
  ].filter((p) => p.trim() !== "");
  return parts.join("\n").slice(0, COMPOSED_DOC_MAX_CHARS);
}

export function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
```

- [ ] **Step 2.4: Run tests** — pass.
- [ ] **Step 2.5: Commit** — `git commit -m "feat(search): composed-doc builder and content hash"`

---

### Task 3: Database module (`src/search/db.ts`)

**Files:**
- Create: `src/search/db.ts`
- Test: `src/__tests__/search-db.test.ts`

- [ ] **Step 3.1: Write the failing test** (temp dirs via `mkdtemp` — never fixed `os.tmpdir()` paths)

```ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { blobToVector, openSearchDb, vectorToBlob } from "../search/db.js";

let tmpDir: string;
beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-searchdb-"));
});
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("openSearchDb", () => {
  it("creates the schema and is idempotent on reopen", () => {
    const p = path.join(tmpDir, "search.db");
    const db = openSearchDb(p);
    db.prepare("INSERT INTO index_meta (key, value) VALUES (?, ?)").run("k", "v");
    db.close();
    const db2 = openSearchDb(p); // re-running schema must not clobber data
    const row = db2.prepare("SELECT value FROM index_meta WHERE key = ?").get("k") as { value: string };
    expect(row.value).toBe("v");
    db2.close();
  });

  it("round-trips a Float32 vector through a BLOB", () => {
    const p = path.join(tmpDir, "search.db");
    const db = openSearchDb(p);
    db.prepare("INSERT INTO videos (id, title, category, creator, taken_at, source_url, verification, implementability, usefulness, takeaways_json, topics_json, doc_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
      .run("v1", "t", "c", "u", "", "", "unknown", 0, "unknown", "[]", "[]", "h");
    const vec = [0.25, -1.5, 3.75];
    db.prepare("INSERT INTO embeddings (video_id, model, dims, vector, text_hash) VALUES (?,?,?,?,?)")
      .run("v1", "m", 3, vectorToBlob(vec), "h");
    const row = db.prepare("SELECT vector FROM embeddings WHERE video_id = ?").get("v1") as { vector: Uint8Array };
    expect(Array.from(blobToVector(row.vector))).toEqual(vec);
    db.close();
  });
});
```

- [ ] **Step 3.2: Verify failure**, then implement `src/search/db.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  creator TEXT NOT NULL,
  taken_at TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  verification TEXT NOT NULL DEFAULT 'unknown',
  implementability REAL NOT NULL DEFAULT 0,
  usefulness TEXT NOT NULL DEFAULT 'unknown',
  takeaways_json TEXT NOT NULL DEFAULT '[]',
  topics_json TEXT NOT NULL DEFAULT '[]',
  doc_hash TEXT NOT NULL DEFAULT ''
);
CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
  id UNINDEXED, title, transcript, visual_description,
  takeaways, topics, tags, tools, caption,
  tokenize = 'porter unicode61'
);
CREATE TABLE IF NOT EXISTS embeddings (
  video_id TEXT PRIMARY KEY REFERENCES videos(id),
  model TEXT NOT NULL,
  dims INTEGER NOT NULL,
  vector BLOB NOT NULL,
  text_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tools (
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  url_status TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  video_id TEXT NOT NULL REFERENCES videos(id)
);
CREATE INDEX IF NOT EXISTS tools_video_id ON tools(video_id);
CREATE TABLE IF NOT EXISTS index_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function openSearchDb(dbPath: string, opts: { readonly?: boolean } = {}): DatabaseSync {
  if (opts.readonly) {
    return new DatabaseSync(dbPath, { readOnly: true });
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  return db;
}

export function vectorToBlob(vec: readonly number[]): Uint8Array {
  return new Uint8Array(Float32Array.from(vec).buffer);
}

/** Copies before viewing: SQLite BLOBs are not guaranteed 4-byte aligned. */
export function blobToVector(blob: Uint8Array): Float32Array {
  const copy = blob.slice();
  return new Float32Array(copy.buffer, 0, copy.byteLength / 4);
}
```

- [ ] **Step 3.3: Run tests + typecheck**, **Step 3.4: Commit** — `git commit -m "feat(search): search.db schema and vector blob helpers"`

---

### Task 4: Ranking primitives (`src/search/rank.ts`)

**Files:**
- Create: `src/search/rank.ts`
- Test: `src/__tests__/search-rank.test.ts`

- [ ] **Step 4.1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { cosineSim, rrfMerge } from "../search/rank.js";

describe("cosineSim", () => {
  it("is 1 for identical, 0 for orthogonal, 0 for zero vectors", () => {
    expect(cosineSim([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSim([0, 0], [1, 1])).toBe(0);
  });
});

describe("rrfMerge", () => {
  it("ranks an id present in both lists above single-list ids", () => {
    const merged = rrfMerge([["a", "b"], ["b", "c"]]);
    expect(merged[0].id).toBe("b");
  });
  it("preserves order within a single list and handles empties", () => {
    const merged = rrfMerge([["x", "y", "z"], []]);
    expect(merged.map((m) => m.id)).toEqual(["x", "y", "z"]);
    expect(rrfMerge([[], []])).toEqual([]);
  });
});
```

- [ ] **Step 4.2: Verify failure**, then implement:

```ts
export function cosineSim(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Reciprocal-rank fusion over best-first id lists (k=60 per the original paper). */
export function rrfMerge(lists: readonly (readonly string[])[], k = 60): { id: string; score: number }[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    for (const [rank, id] of list.entries()) {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    }
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((x, y) => y.score - x.score);
}
```

- [ ] **Step 4.3: Run tests**, **Step 4.4: Commit** — `git commit -m "feat(search): cosine similarity and reciprocal-rank fusion"`

---

### Task 5: Indexer (`src/search/indexer.ts`)

**Files:**
- Create: `src/search/indexer.ts`
- Modify: `src/pipeline/config.ts` (add `EMBEDDING_MODEL`, `STATE.SEARCH_DB`)
- Test: `src/__tests__/search-indexer.test.ts`

Three exported layers for testability: `buildSearchRecords` (pure state→records), `indexRecords` (db writes + embedding, embedder injected), `runSearchIndexer` (IO glue, CLI entry).

- [ ] **Step 5.1: Add config keys** — in `CONFIG.STATE` add `SEARCH_DB: path.resolve("videos", "search.db"),` and top-level `EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? "gemini-embedding-001",`

- [ ] **Step 5.2: Failing test**

```ts
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
  classifications: { "creator_1.mp4": { category: "Tech & Coding", tags: ["cli"], description: "class desc", code: "AbC123", username: "creator" } },
  catalog: [{ filename: "creator_1.mp4", description: "VibeTunnel remote terminal", taken_at: "2026-07-01", caption: "cap", instagram_user: "creator" }],
  analysis: { "creator_1.mp4": { actionable_items: [{ name: "vibetunnel", type: "tool_install", description: "remote terminal", url: "https://vibetunnel.sh" }], implementability_score: 8, usefulness_prediction: "highly_useful" } },
  research: { "creator_1.mp4": { items: [{ item_name: "vibetunnel", url_status: "live" }] } },
  verifications: { "creator_1.mp4": { overall_score: "verified_useful", confidence: 8 } },
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

    await indexRecords(db, records, embedder, "test-model"); // unchanged → no embedding call
    expect(calls).toHaveLength(1);

    await indexRecords(db, [], embedder, "test-model"); // record gone → pruned
    const count = db.prepare("SELECT COUNT(*) AS n FROM videos").get() as { n: number };
    expect(count.n).toBe(0);
    db.close();
  });
});
```

- [ ] **Step 5.3: Verify failure**, then implement `src/search/indexer.ts`:

```ts
import "dotenv/config";
import { createAIProvider } from "@juspay/neurolink";
import type { DatabaseSync } from "node:sqlite";
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";
import { deriveTitle } from "../dashboard/title.js";
import { normalizeToolUrl } from "../dashboard/data-builder.js";
import { takeawayText, type Takeaway } from "../schemas/knowledge.js";
import { exponentialBackoff } from "../utils/rate-limit.js";
import { composeDoc, sha256Hex } from "./doc.js";
import { openSearchDb, vectorToBlob } from "./db.js";

// --- Narrow views of the pipeline state files (only fields the index needs) ---

interface KbEntry {
  category?: string;
  transcript?: string;
  visual_description?: string;
  key_takeaways?: Takeaway[];
  topics?: string[];
  username?: string;
}
interface ClassEntry {
  category?: string;
  subcategory?: string;
  tags?: string[];
  description?: string;
  code?: string | null;
  username?: string;
}
interface CatEntry {
  filename: string;
  description?: string;
  category?: string;
  tags?: string[];
  taken_at?: string;
  caption?: string;
  hashtags?: string[];
  instagram_user?: string;
}
interface AnalysisEntry {
  actionable_items?: { name?: string; item_name?: string; type?: string; description?: string; url?: string }[];
  implementability_score?: number;
  usefulness_prediction?: string;
}
interface ResearchEntry {
  items?: { item_name?: string; url_status?: string }[];
}
interface VerifEntry {
  overall_score?: string;
  confidence?: number;
}
interface LinksEntry {
  links?: { name?: string; url?: unknown; description?: string }[];
}

export interface SearchStates {
  knowledge: Record<string, KbEntry>;
  classifications: Record<string, ClassEntry>;
  catalog: CatEntry[];
  analysis: Record<string, AnalysisEntry>;
  research: Record<string, ResearchEntry>;
  verifications: Record<string, VerifEntry>;
  linksV2: Record<string, LinksEntry>;
}

export interface SearchToolRow {
  name: string;
  type: string;
  url: string;
  urlStatus: string;
  description: string;
}

export interface SearchRecord {
  id: string;
  title: string;
  category: string;
  creator: string;
  takenAt: string;
  sourceUrl: string;
  verification: string;
  implementability: number;
  usefulness: string;
  takeaways: string[];
  topics: string[];
  tags: string[];
  transcript: string;
  visualDescription: string;
  caption: string;
  tools: SearchToolRow[];
  doc: string;
  docHash: string;
}

/** Same id sanitisation as the dashboard data-builder. */
function makeId(filename: string): string {
  const stem = filename.endsWith(".mp4") ? filename.slice(0, -4) : filename;
  return stem.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function buildSearchRecords(states: SearchStates): SearchRecord[] {
  const catalogByFilename = new Map(states.catalog.map((c) => [c.filename, c]));
  const allFilenames = new Set<string>([
    ...states.catalog.map((c) => c.filename),
    ...Object.keys(states.classifications),
    ...Object.keys(states.knowledge),
  ]);

  const records: SearchRecord[] = [];
  for (const filename of allFilenames) {
    const catEntry = catalogByFilename.get(filename);
    const classEntry = states.classifications[filename];
    const kbEntry = states.knowledge[filename];
    const anEntry = states.analysis[filename];
    const verifEntry = states.verifications[filename];
    const resEntry = states.research[filename];
    const linksEntry = states.linksV2[filename];

    const title = deriveTitle(
      catEntry?.description,
      takeawayText(kbEntry?.key_takeaways?.[0]),
      classEntry?.description,
    );
    const category = classEntry?.category ?? kbEntry?.category ?? catEntry?.category ?? "Other";
    const creator = classEntry?.username ?? kbEntry?.username ?? catEntry?.instagram_user ?? "";
    const code = classEntry?.code ?? null;
    const sourceUrl = code ? `https://www.instagram.com/reel/${code}/` : "";

    const analysedNoItems = !!anEntry && (anEntry.actionable_items?.length ?? 0) === 0;
    const verification = verifEntry?.overall_score ?? (analysedNoItems ? "not_verifiable" : "unknown");

    const urlStatusByName = new Map<string, string>();
    for (const ri of resEntry?.items ?? []) {
      if (ri.item_name) urlStatusByName.set(ri.item_name, ri.url_status ?? "");
    }

    const tools: SearchToolRow[] = [];
    for (const item of anEntry?.actionable_items ?? []) {
      const name = String(item.name ?? item.item_name ?? "").trim();
      if (!name) continue;
      tools.push({
        name,
        type: String(item.type ?? ""),
        url: normalizeToolUrl(item.url),
        urlStatus: urlStatusByName.get(name) ?? "",
        description: String(item.description ?? ""),
      });
    }
    for (const link of linksEntry?.links ?? []) {
      const name = String(link.name ?? "").trim();
      const url = normalizeToolUrl(link.url);
      if (!name || url === "") continue;
      if (tools.some((t) => t.name.toLowerCase() === name.toLowerCase())) continue;
      tools.push({ name, type: "link", url, urlStatus: "", description: String(link.description ?? "") });
    }

    const takeaways = (kbEntry?.key_takeaways ?? []).map(takeawayText);
    const topics = kbEntry?.topics ?? [];
    const tags = classEntry?.tags ?? catEntry?.tags ?? [];
    const transcript = kbEntry?.transcript ?? "";
    const visualDescription = kbEntry?.visual_description ?? "";
    const caption = catEntry?.caption ?? "";

    const doc = composeDoc({
      title,
      category,
      tags,
      topics,
      takeaways,
      tools: tools.map((t) => ({ name: t.name, description: t.description })),
      description: classEntry?.description ?? "",
      transcript,
    });

    records.push({
      id: makeId(filename),
      title,
      category,
      creator,
      takenAt: catEntry?.taken_at ?? "",
      sourceUrl,
      verification,
      implementability: anEntry?.implementability_score ?? 0,
      usefulness: anEntry?.usefulness_prediction ?? "unknown",
      takeaways,
      topics,
      tags,
      transcript,
      visualDescription,
      caption,
      tools,
      doc,
      docHash: sha256Hex(doc),
    });
  }
  return records;
}

export type Embedder = (texts: string[]) => Promise<number[][]>;

const EMBED_BATCH_SIZE = 32;

/**
 * Upsert records, prune deleted ids, and (re-)embed any record whose
 * model+doc hash is missing or stale. Embedding failures are logged and
 * skipped — the FTS side of the index still updates, and the next run
 * retries the missing vectors.
 */
export async function indexRecords(
  db: DatabaseSync,
  records: SearchRecord[],
  embedder: Embedder,
  model: string,
): Promise<void> {
  const currentIds = new Set(records.map((r) => r.id));

  db.exec("BEGIN");
  try {
    // Prune ids that no longer exist in the state files
    const existing = db.prepare("SELECT id FROM videos").all() as { id: string }[];
    const delVideo = db.prepare("DELETE FROM videos WHERE id = ?");
    const delFts = db.prepare("DELETE FROM videos_fts WHERE id = ?");
    const delEmb = db.prepare("DELETE FROM embeddings WHERE video_id = ?");
    for (const row of existing) {
      if (!currentIds.has(row.id)) {
        delVideo.run(row.id);
        delFts.run(row.id);
        delEmb.run(row.id);
      }
    }

    // Tools are cheap: rebuild wholesale
    db.exec("DELETE FROM tools");
    const insTool = db.prepare(
      "INSERT INTO tools (name, type, url, url_status, description, video_id) VALUES (?,?,?,?,?,?)",
    );

    const getHash = db.prepare("SELECT doc_hash FROM videos WHERE id = ?");
    const upsertVideo = db.prepare(`
      INSERT INTO videos (id, title, category, creator, taken_at, source_url, verification,
                          implementability, usefulness, takeaways_json, topics_json, doc_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, category=excluded.category, creator=excluded.creator,
        taken_at=excluded.taken_at, source_url=excluded.source_url,
        verification=excluded.verification, implementability=excluded.implementability,
        usefulness=excluded.usefulness, takeaways_json=excluded.takeaways_json,
        topics_json=excluded.topics_json, doc_hash=excluded.doc_hash
    `);
    const insFts = db.prepare(`
      INSERT INTO videos_fts (id, title, transcript, visual_description, takeaways, topics, tags, tools, caption)
      VALUES (?,?,?,?,?,?,?,?,?)
    `);

    for (const r of records) {
      const prev = getHash.get(r.id) as { doc_hash: string } | undefined;
      const docChanged = prev?.doc_hash !== r.docHash;
      upsertVideo.run(
        r.id, r.title, r.category, r.creator, r.takenAt, r.sourceUrl, r.verification,
        r.implementability, r.usefulness, JSON.stringify(r.takeaways), JSON.stringify(r.topics), r.docHash,
      );
      if (prev === undefined || docChanged) {
        delFts.run(r.id);
        insFts.run(
          r.id, r.title, r.transcript, r.visualDescription, r.takeaways.join("\n"),
          r.topics.join("\n"), r.tags.join("\n"), r.tools.map((t) => `${t.name} ${t.description}`).join("\n"),
          r.caption,
        );
      }
      for (const t of r.tools) {
        insTool.run(t.name, t.type, t.url, t.urlStatus, t.description, r.id);
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  // Embedding pass: everything whose model+doc hash is stale or absent
  const getEmb = db.prepare("SELECT text_hash FROM embeddings WHERE video_id = ?");
  const pending = records.filter((r) => {
    const row = getEmb.get(r.id) as { text_hash: string } | undefined;
    return row?.text_hash !== sha256Hex(model + r.doc);
  });

  const upsertEmb = db.prepare(`
    INSERT INTO embeddings (video_id, model, dims, vector, text_hash) VALUES (?,?,?,?,?)
    ON CONFLICT(video_id) DO UPDATE SET
      model=excluded.model, dims=excluded.dims, vector=excluded.vector, text_hash=excluded.text_hash
  `);

  let embedded = 0;
  let failed = 0;
  for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBED_BATCH_SIZE);
    const result = await exponentialBackoff(
      () => embedder(batch.map((r) => r.doc)),
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_BASE_DELAY_MS,
    );
    if (!result.success) {
      failed += batch.length;
      console.warn(`  Embedding batch failed (${batch.length} video(s) skipped): ${result.error.slice(0, 150)}`);
      continue;
    }
    for (const [j, vec] of result.value.entries()) {
      const r = batch[j];
      upsertEmb.run(r.id, model, vec.length, vectorToBlob(vec), sha256Hex(model + r.doc));
      embedded++;
    }
  }

  const setMeta = db.prepare("INSERT INTO index_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  setMeta.run("built_at", new Date().toISOString());
  setMeta.run("model", model);

  console.log(
    `  Search index: ${records.length} video(s), ${pending.length} needed embedding (${embedded} embedded, ${failed} failed).`,
  );
}

async function defaultEmbedder(): Promise<Embedder> {
  const provider = await createAIProvider("vertex");
  return (texts: string[]) => provider.embedMany(texts, CONFIG.EMBEDDING_MODEL);
}

export async function runSearchIndexer(options: { dbPath?: string; embedder?: Embedder } = {}): Promise<void> {
  console.log("\n=== Search Indexer ===");
  const states: SearchStates = {
    knowledge: await loadState(CONFIG.STATE.KNOWLEDGE_BASE, {}),
    classifications: await loadState(CONFIG.STATE.CLASSIFICATIONS, {}),
    catalog: await loadState(CONFIG.STATE.CATALOG, []),
    analysis: await loadState(CONFIG.STATE.ANALYSIS, {}),
    research: await loadState(CONFIG.STATE.RESEARCH, {}),
    verifications: await loadState(CONFIG.STATE.VERIFICATIONS, {}),
    linksV2: await loadState(CONFIG.STATE.LINKS_V2, {}),
  };
  const records = buildSearchRecords(states);
  const db = openSearchDb(options.dbPath ?? CONFIG.STATE.SEARCH_DB);
  try {
    const embedder = options.embedder ?? (await defaultEmbedder());
    await indexRecords(db, records, embedder, CONFIG.EMBEDDING_MODEL);
  } finally {
    db.close();
  }
}

if (process.argv[1]?.endsWith("indexer.js")) {
  runSearchIndexer().catch((err) => {
    console.error("Search indexer failed:", err);
    process.exit(1);
  });
}
```

- [ ] **Step 5.4: Run tests + typecheck** — full `npx vitest run && npx tsc --noEmit`.
- [ ] **Step 5.5: Commit** — `git commit -m "feat(search): incremental hybrid search indexer over pipeline state"`

---

### Task 6: Query engine (`src/search/query.ts`)

**Files:**
- Create: `src/search/query.ts`
- Test: `src/__tests__/search-query.test.ts`

- [ ] **Step 6.1: Failing test** — seed a temp db via `openSearchDb` + `indexRecords` with a fake embedder over 3 videos (distinct transcripts: "bot detection cloudflare bypass", "terminal remote access", "kitchen renovation"), fake 3-dim vectors chosen so video A is closest to a fixed query vector. Assert:
  - `toFtsQuery('cloudflare "bypass" OR')` → every term quoted, no raw operators.
  - keyword-only (`queryVector: null`): searching "cloudflare" returns A first, `mode === "fts_only"`.
  - hybrid: query vector near A's vector keeps A first even when FTS ties, `mode === "hybrid"`.
  - `category` filter drops non-matching hits; `limit` respected.
  - `getVideo(db, "a")` returns transcript and tools; unknown id → `null`.
  - `searchTools(db, "cloak")` matches name substring case-insensitively.
  - `stats(db)` returns totals, per-category counts, embedding coverage 3/3.

- [ ] **Step 6.2: Verify failure**, then implement `src/search/query.ts`:

```ts
import type { DatabaseSync } from "node:sqlite";
import { blobToVector } from "./db.js";
import { cosineSim, rrfMerge } from "./rank.js";

const CANDIDATE_POOL = 50;

export interface SearchHit {
  id: string;
  title: string;
  category: string;
  creator: string;
  takeaways: string[];
  topTools: string[];
  verification: string;
  sourceUrl: string;
  score: number;
}

export interface SearchResult {
  mode: "hybrid" | "fts_only";
  hits: SearchHit[];
}

/** Neutralise FTS5 operators by quoting every term; OR them for recall (bm25 ranks). */
export function toFtsQuery(raw: string): string {
  const terms = raw
    .split(/\s+/)
    .map((t) => t.replace(/["']/g, ""))
    .filter((t) => t !== "" && t.toUpperCase() !== "OR" && t.toUpperCase() !== "AND" && t.toUpperCase() !== "NOT");
  if (terms.length === 0) return '""';
  return terms.map((t) => `"${t}"`).join(" OR ");
}

interface VideoRow {
  id: string;
  title: string;
  category: string;
  creator: string;
  taken_at: string;
  source_url: string;
  verification: string;
  implementability: number;
  usefulness: string;
  takeaways_json: string;
  topics_json: string;
}

function hydrateHit(db: DatabaseSync, id: string, score: number): SearchHit | null {
  const row = db.prepare("SELECT * FROM videos WHERE id = ?").get(id) as VideoRow | undefined;
  if (!row) return null;
  const toolRows = db
    .prepare("SELECT name FROM tools WHERE video_id = ? LIMIT 3")
    .all(id) as { name: string }[];
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    creator: row.creator,
    takeaways: JSON.parse(row.takeaways_json) as string[],
    topTools: toolRows.map((t) => t.name),
    verification: row.verification,
    sourceUrl: row.source_url,
    score,
  };
}

export function hybridSearch(
  db: DatabaseSync,
  queryText: string,
  queryVector: ArrayLike<number> | null,
  opts: { category?: string; limit?: number } = {},
): SearchResult {
  const limit = opts.limit ?? 10;

  const ftsIds = (
    db
      .prepare("SELECT id FROM videos_fts WHERE videos_fts MATCH ? ORDER BY bm25(videos_fts) LIMIT ?")
      .all(toFtsQuery(queryText), CANDIDATE_POOL) as { id: string }[]
  ).map((r) => r.id);

  let semanticIds: string[] = [];
  if (queryVector !== null) {
    const embRows = db.prepare("SELECT video_id, vector FROM embeddings").all() as {
      video_id: string;
      vector: Uint8Array;
    }[];
    semanticIds = embRows
      .map((r) => ({ id: r.video_id, sim: cosineSim(queryVector, blobToVector(r.vector)) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, CANDIDATE_POOL)
      .map((r) => r.id);
  }

  const merged = rrfMerge(queryVector !== null ? [ftsIds, semanticIds] : [ftsIds]);

  const hits: SearchHit[] = [];
  for (const { id, score } of merged) {
    const hit = hydrateHit(db, id, score);
    if (!hit) continue;
    if (opts.category && hit.category !== opts.category) continue;
    hits.push(hit);
    if (hits.length >= limit) break;
  }
  return { mode: queryVector !== null ? "hybrid" : "fts_only", hits };
}

export interface VideoDetail extends Omit<SearchHit, "score" | "topTools"> {
  takenAt: string;
  implementability: number;
  usefulness: string;
  topics: string[];
  transcript: string;
  visualDescription: string;
  caption: string;
  tools: { name: string; type: string; url: string; urlStatus: string; description: string }[];
}

export function getVideo(db: DatabaseSync, id: string): VideoDetail | null {
  const row = db.prepare("SELECT * FROM videos WHERE id = ?").get(id) as VideoRow | undefined;
  if (!row) return null;
  const fts = db
    .prepare("SELECT transcript, visual_description, caption FROM videos_fts WHERE id = ?")
    .get(id) as { transcript: string; visual_description: string; caption: string } | undefined;
  const tools = db
    .prepare("SELECT name, type, url, url_status, description FROM tools WHERE video_id = ?")
    .all(id) as { name: string; type: string; url: string; url_status: string; description: string }[];
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    creator: row.creator,
    takenAt: row.taken_at,
    sourceUrl: row.source_url,
    verification: row.verification,
    implementability: row.implementability,
    usefulness: row.usefulness,
    takeaways: JSON.parse(row.takeaways_json) as string[],
    topics: JSON.parse(row.topics_json) as string[],
    transcript: fts?.transcript ?? "",
    visualDescription: fts?.visual_description ?? "",
    caption: fts?.caption ?? "",
    tools: tools.map((t) => ({ name: t.name, type: t.type, url: t.url, urlStatus: t.url_status, description: t.description })),
  };
}

export interface ToolHit {
  name: string;
  type: string;
  url: string;
  urlStatus: string;
  description: string;
  videoId: string;
  videoTitle: string;
}

export function searchTools(db: DatabaseSync, query: string, type?: string, limit = 15): ToolHit[] {
  const like = `%${query.toLowerCase()}%`;
  const rows = db
    .prepare(`
      SELECT t.name, t.type, t.url, t.url_status, t.description, t.video_id, v.title AS video_title
      FROM tools t JOIN videos v ON v.id = t.video_id
      WHERE (LOWER(t.name) LIKE ? OR LOWER(t.description) LIKE ?)
        AND (? = '' OR t.type = ?)
      ORDER BY CASE WHEN t.url_status = 'live' THEN 0 ELSE 1 END, t.name
      LIMIT ?
    `)
    .all(like, like, type ?? "", type ?? "", limit) as {
    name: string; type: string; url: string; url_status: string; description: string;
    video_id: string; video_title: string;
  }[];
  return rows.map((r) => ({
    name: r.name, type: r.type, url: r.url, urlStatus: r.url_status,
    description: r.description, videoId: r.video_id, videoTitle: r.video_title,
  }));
}

export interface CorpusStats {
  totalVideos: number;
  totalTools: number;
  categories: { name: string; count: number }[];
  embeddedVideos: number;
  builtAt: string;
  model: string;
}

export function stats(db: DatabaseSync): CorpusStats {
  const total = (db.prepare("SELECT COUNT(*) AS n FROM videos").get() as { n: number }).n;
  const tools = (db.prepare("SELECT COUNT(*) AS n FROM tools").get() as { n: number }).n;
  const embedded = (db.prepare("SELECT COUNT(*) AS n FROM embeddings").get() as { n: number }).n;
  const categories = db
    .prepare("SELECT category AS name, COUNT(*) AS count FROM videos GROUP BY category ORDER BY count DESC")
    .all() as { name: string; count: number }[];
  const metaRows = db.prepare("SELECT key, value FROM index_meta").all() as { key: string; value: string }[];
  const meta = new Map(metaRows.map((m) => [m.key, m.value]));
  return {
    totalVideos: total,
    totalTools: tools,
    categories,
    embeddedVideos: embedded,
    builtAt: meta.get("built_at") ?? "",
    model: meta.get("model") ?? "",
  };
}
```

- [ ] **Step 6.3: Run tests + typecheck**, **Step 6.4: Commit** — `git commit -m "feat(search): hybrid query engine with RRF and graceful keyword-only mode"`

---

### Task 7: MCP server (`src/mcp/server.ts`)

**Files:**
- Create: `src/mcp/server.ts`

Uses the SDK's **low-level `Server` API with hand-written JSON Schemas** (no zod coupling — repo zod major may differ from the SDK peer). CRITICAL: stdout is the MCP transport; every log goes to `console.error`.

- [ ] **Step 7.1: Implement `src/mcp/server.ts`**

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { DatabaseSync } from "node:sqlite";

// Resolve the repo root from this module's location (dist/mcp/server.js → ../../)
// so the server works no matter which project's session spawns it, then load
// the repo .env for Vertex credentials BEFORE importing anything that reads env.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(repoRoot, ".env") });
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(repoRoot, process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

const { openSearchDb } = await import("../search/db.js");
const { getVideo, hybridSearch, searchTools, stats } = await import("../search/query.js");

const DB_PATH = path.join(repoRoot, "videos", "search.db");
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
const QUERY_EMBED_TIMEOUT_MS = 4000;

let db: DatabaseSync | null = null;
function getDb(): DatabaseSync {
  if (db === null) {
    db = openSearchDb(DB_PATH, { readonly: true });
  }
  return db;
}

type EmbedFn = (text: string) => Promise<number[]>;
let embedFn: EmbedFn | null | undefined; // undefined = not tried, null = unavailable

async function getQueryVector(text: string): Promise<number[] | null> {
  try {
    if (embedFn === undefined) {
      const { createAIProvider } = await import("@juspay/neurolink");
      const provider = await createAIProvider("vertex");
      embedFn = (t: string) => provider.embed(t, EMBEDDING_MODEL);
    }
    if (embedFn === null) return null;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("query embedding timed out")), QUERY_EMBED_TIMEOUT_MS),
    );
    return await Promise.race([embedFn(text), timeout]);
  } catch (err) {
    console.error(`dopamine-kb: embedding unavailable, degrading to keyword-only: ${String(err).slice(0, 200)}`);
    embedFn = null; // don't retry provider construction on every call
    return null;
  }
}

function jsonContent(value: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorContent(message: string): { content: { type: "text"; text: string }[]; isError: true } {
  return { content: [{ type: "text", text: message }], isError: true };
}

const MISSING_DB_HELP =
  "The search index (videos/search.db) does not exist yet. Build it from the dopamine repo with: npm run build && npm run search:index";

const TOOLS = [
  {
    name: "search_corpus",
    description:
      "Hybrid semantic + keyword search over the saved-video knowledge corpus. Returns ranked videos with key takeaways, top tools, verification status, and source URL. Use for questions like 'what did I save about X?'.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural-language search query" },
        category: { type: "string", description: "Optional exact category filter, e.g. 'Tech & Coding'" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_video",
    description:
      "Full detail for one video by id: transcript, visual description, takeaways, topics, tools with URLs, verification.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Video id from search_corpus results" } },
      required: ["id"],
    },
  },
  {
    name: "search_tools",
    description:
      "Search the extracted tools/techniques catalogue by name or description substring. Returns tool records with live-checked URLs and the source video.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Substring to match against tool name/description" },
        type: { type: "string", description: "Optional type filter: tool_install | workflow | technique | api_setup | code_snippet | link" },
        limit: { type: "number", description: "Max results (default 15)" },
      },
      required: ["query"],
    },
  },
  {
    name: "corpus_stats",
    description: "Corpus overview: totals, per-category counts, embedding coverage, index freshness.",
    inputSchema: { type: "object", properties: {} },
  },
] as const;

const server = new Server(
  { name: "dopamine-kb", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [...TOOLS] }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  let database: DatabaseSync;
  try {
    database = getDb();
  } catch {
    return errorContent(MISSING_DB_HELP);
  }

  try {
    switch (name) {
      case "search_corpus": {
        const query = String(args.query ?? "");
        if (query === "") return errorContent("query is required");
        const vector = await getQueryVector(query);
        const result = hybridSearch(database, query, vector, {
          category: typeof args.category === "string" ? args.category : undefined,
          limit: typeof args.limit === "number" ? args.limit : undefined,
        });
        return jsonContent(result);
      }
      case "get_video": {
        const detail = getVideo(database, String(args.id ?? ""));
        return detail === null ? errorContent(`No video with id: ${String(args.id)}`) : jsonContent(detail);
      }
      case "search_tools": {
        const query = String(args.query ?? "");
        if (query === "") return errorContent("query is required");
        return jsonContent(
          searchTools(
            database,
            query,
            typeof args.type === "string" && args.type !== "" ? args.type : undefined,
            typeof args.limit === "number" ? args.limit : undefined,
          ),
        );
      }
      case "corpus_stats":
        return jsonContent(stats(database));
      default:
        return errorContent(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return errorContent(`dopamine-kb error: ${String(err).slice(0, 300)}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`dopamine-kb MCP server ready (db: ${DB_PATH})`);
```

- [ ] **Step 7.2: Build + handshake smoke test**

```bash
npm run build
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","method":"notifications/initialized"}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node dist/mcp/server.js
```
Expected: JSON responses on stdout listing 4 tools; readiness line on stderr only.

- [ ] **Step 7.3: Commit** — `git commit -m "feat(mcp): dopamine-kb stdio server exposing hybrid corpus search"`

---

### Task 8: Pipeline wiring + npm scripts

**Files:**
- Modify: `src/pipeline/runner.ts` (import, step 16, both step-map comments/help)
- Modify: `package.json` (scripts)

- [ ] **Step 8.1:** In `runner.ts` add `import { runSearchIndexer } from "../search/indexer.js";` and append to `steps`:

```ts
    // Search index runs after dashboard build so the MCP corpus reflects this run
    { name: "Search index", run: () => runSearchIndexer() }, // 16
```
Update the two step maps (comment block at ~line 93 and `--help` text) with `16  Search index` and the "END_STEP=16 → 17" guidance line.

- [ ] **Step 8.2:** Add scripts: `"search:index": "node dist/search/indexer.js",` and `"mcp:serve": "node dist/mcp/server.js",`

- [ ] **Step 8.3:** `npx vitest run && npx tsc --noEmit` → pass. Commit: `git commit -m "feat(pipeline): run search indexer as final step; add search/mcp scripts"`

---

### Task 9: Engines + CI matrix (Node ≥24)

**Files:**
- Modify: `package.json` — `"engines": { "node": ">=24" }`
- Modify: `.github/workflows/ci.yml` — `node-version: [24]` (matrix line 19)
- Modify: spec `docs/superpowers/specs/2026-07-18-dopamine-kb-mcp-design.md` Compatibility section: node:sqlite is flag-gated on Node 22 (`--experimental-sqlite`, unflagged only in 23.4+), so target Node ≥24 / matrix [24] instead of ≥22.5 / [22, 24].

- [ ] **Step 9.1:** Apply the three edits.
- [ ] **Step 9.2:** Commit — `git commit -m "chore: require Node >=24 for node:sqlite; CI matrix 24"`

**⚠ At merge time:** branch protection requires "Build & Test (Node 20)"/"(Node 22)" — the required-status-check contexts must be updated to "Build & Test (Node 24)" (repo admin, one-time).

---

### Task 10: Docs + .env.example

**Files:**
- Create: `docs/mcp-server.md` — what the server is, the 4 tools, `claude mcp add --scope user dopamine-kb -- node <repo>/dist/mcp/server.js`, rebuild (`npm run search:index`), degraded keyword-only mode, privacy note (`search.db` gitignored under `videos/`). `<repo>` placeholders only.
- Modify: `.env.example` — add `# Embedding model for the search index / MCP server (optional)` + `# EMBEDDING_MODEL=gemini-embedding-001`
- Modify: `README.md` — one line + link under features/docs list.

- [ ] **Step 10.1:** Write the three files. **Step 10.2:** `npm run lint:md` passes. Commit: `git commit -m "docs: dopamine-kb MCP server setup and usage"`

---

### Task 11: Real-corpus verification (not committed)

The worktree has no corpus data (`videos/` is gitignored). Run the worktree build against the main checkout's data:

- [ ] **Step 11.1: Build index on real data** — `cd <main-checkout> && node <worktree>/dist/search/indexer.js` (cwd gives CONFIG the real state files + .env). Expected: ~413 videos, ~413 embedded on first run; re-run → `0 needed embedding`.
- [ ] **Step 11.2: Query smoke** — small node script against the built `search.db`: `hybridSearch(db, "bypass bot detection cloudflare scraping", vector, {limit: 5})` must surface the CloakBrowser video top-3; `searchTools(db, "vibetunnel")` returns the VibeTunnel entry.
- [ ] **Step 11.3: MCP end-to-end** — handshake script from Step 7.2 with a `tools/call` of `corpus_stats`, run from an unrelated cwd, against real db. Expected: real totals, no stdout pollution.
- [ ] **Step 11.4:** Squash all task commits into one (`git reset --soft $(git merge-base HEAD main)` + single `feat: ...` commit including the spec/plan docs), push branch (ask first), open PR.

---

## Self-review checklist (run after writing code)

- Spec coverage: indexer ✓ (T5), query engine ✓ (T6), MCP server ✓ (T7), pipeline wiring ✓ (T8), engines/CI ✓ (T9), docs/privacy ✓ (T10), degradation ✓ (T7), incremental embedding ✓ (T5), title reuse ✓ (T1).
- No placeholder steps; all code complete.
- Type consistency: `SearchStates`/`SearchRecord`/`Embedder` (T5) match usage in T6 tests; `openSearchDb`/`vectorToBlob`/`blobToVector` signatures consistent across T3/T5/T6/T7.
