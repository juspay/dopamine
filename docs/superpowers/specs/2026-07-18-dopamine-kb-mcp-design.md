# Dopamine Knowledge-Base MCP Server — Design

**Date:** 2026-07-18
**Status:** Approved
**Stage:** 1 of 3 (retrieval layer → daily digest → project mapping)

## Problem

The pipeline extracts rich, verified knowledge from every saved video — transcripts,
key takeaways, typed actionable items with install commands, live-checked links,
sandbox-tested installs, implementability scores — and then every path terminates at
the local dashboard and static markdown files. There is no way to *apply* the
learnings where work actually happens. Nothing can query the corpus: no search API,
no embeddings, no MCP server. The corpus (~400 videos, ~800 distinct tools) is
effectively write-only.

## Goal

Expose the corpus as a queryable MCP server (`dopamine-kb`) registered user-scoped
in Claude Code, so any session in any repository can ask "what did I save about X?"
and get ranked, verified answers with source links. Retrieval is hybrid: semantic
(Gemini embeddings) + keyword (SQLite FTS5/BM25), merged with reciprocal-rank
fusion.

## Non-Goals (later stages)

- Daily digest delivery (stage 2 — will query the same index for "new since last run").
- Mapping learnings to specific external projects / backlog filing (stage 3 — will
  reuse the same embeddings).
- Re-ranking with an LLM, multi-corpus federation, remote hosting.

## Architecture

```
pipeline runner (final step)                 any Claude Code session
┌──────────────────────────┐                 ┌─────────────────────┐
│ search indexer           │                 │ MCP client          │
│ src/search/indexer.ts    │                 └──────────┬──────────┘
│  reads videos/*.json     │                            │ stdio
│  embeds new/changed docs │                 ┌──────────▼──────────┐
│  writes videos/search.db │◄────────────────│ dopamine-kb server  │
└──────────────────────────┘   read-only     │ src/mcp/server.ts   │
                                             └─────────────────────┘
```

Two new modules plus one shared library:

| Module | Responsibility |
|---|---|
| `src/search/indexer.ts` | Build/refresh `videos/search.db` from pipeline state files; generate embeddings incrementally |
| `src/search/query.ts` | Hybrid query engine (FTS5 + cosine + RRF) used by the MCP server (and stages 2/3 later) |
| `src/mcp/server.ts` | stdio MCP server exposing the query engine as tools |

## Indexer (`src/search/indexer.ts`)

Runs as the **final pipeline step** (after dashboard build) and via a manual
`npm run search:index`. Reads the same canonical state files the dashboard
data-builder reads: `knowledge_base.json`, `classifications.json`, `catalog.json`,
`analysis.json`, `links_v2.json`, `verifications.json`, `metadata.json`.
Video titles are derived exactly as the dashboard data-builder derives them — the
title helper is extracted from `data-builder.ts` into a shared module and reused,
not duplicated.

### Database: `videos/search.db` (gitignored, rebuildable)

Created with `node:sqlite` (`DatabaseSync`). Schema:

```sql
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,            -- filename stem, e.g. "creator_1234567890"
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  creator TEXT NOT NULL,
  taken_at TEXT,                  -- ISO date
  source_url TEXT,                -- instagram permalink
  verification TEXT,              -- verified_useful | partially_verified | ...
  implementability REAL,
  usefulness TEXT,
  takeaways_json TEXT NOT NULL,   -- JSON array of takeaway strings
  topics_json TEXT NOT NULL       -- JSON array
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
  vector BLOB NOT NULL,           -- Float32Array bytes
  text_hash TEXT NOT NULL         -- sha256(model + composed_doc)
);

CREATE TABLE IF NOT EXISTS tools (
  name TEXT NOT NULL,
  type TEXT NOT NULL,             -- tool_install | workflow | technique | ...
  url TEXT,
  url_status TEXT,
  description TEXT,
  video_id TEXT NOT NULL REFERENCES videos(id)
);

CREATE TABLE IF NOT EXISTS index_meta (
  key TEXT PRIMARY KEY, value TEXT NOT NULL   -- built_at, corpus_generated_at, model
);
```

### Composed document (what gets embedded and FTS-indexed)

Per video, in priority order, truncated to ~4,000 chars total:
title, category, tags, topics, key takeaways, tool names + descriptions,
classification description, transcript (truncated last).

### Incremental embedding

- `text_hash = sha256(embedding_model + composed_doc)`; unchanged hash → skip.
  Changing the embedding model therefore re-embeds everything by construction.
- Embeddings via the NeuroLink Google Vertex provider
  (`ProviderFactory.createProvider("vertex")` → `embedMany(texts)`), which uses the
  same Vertex credentials the rest of the pipeline already uses. Batches of 32 with
  the pipeline's existing retry/backoff helper.
- Steady state after the one-time backfill is a handful of new videos per day.
- Embedding failures **do not fail the pipeline step**: rows missing embeddings are
  logged and picked up on the next run; FTS rows are still written.

## Query engine (`src/search/query.ts`)

Pure functions over an open database handle; no MCP dependency (stages 2/3 reuse it).

- `hybridSearch(db, queryText, queryVector | null, {category?, limit})`:
  - FTS5 `bm25()` ranking for the keyword list (top 50).
  - Brute-force cosine over all embedding rows for the semantic list (top 50) —
    ~400 vectors, sub-millisecond; no vector extension needed.
  - Merge with reciprocal-rank fusion (k = 60), then apply category filter and limit.
  - `queryVector === null` → keyword-only mode (degraded), flagged in the result.
- `getVideo(db, id)`, `searchTools(db, query, type?)`, `stats(db)`.

## MCP server (`src/mcp/server.ts`)

- `@modelcontextprotocol/sdk` (new runtime dependency), stdio transport,
  server name `dopamine-kb`.
- Resolves the repository root from its own module path (`import.meta.url`), loads
  the repo `.env` from there — so it works no matter which project's session spawns
  it — and opens `videos/search.db` read-only.
- Query embedding at request time via the same Vertex provider; on any failure
  (missing creds, offline, quota) it degrades to keyword-only and sets
  `mode: "fts_only"` in the response instead of erroring.
- Missing/empty `search.db` → tool responses explain how to build it
  (`npm run search:index`), never a crash.

### Tools

| Tool | Input | Output |
|---|---|---|
| `search_corpus` | `query` (string), `category?`, `limit?` (default 10) | ranked `{id, title, category, creator, takeaways[], top_tools[], verification, source_url, score}` + `mode` |
| `get_video` | `id` | full record: transcript, visual description, takeaways, links, actionable items, verification summary |
| `search_tools` | `query`, `type?`, `limit?` (default 15) | `{name, type, url, url_status, description, video_id, video_title}` |
| `corpus_stats` | — | totals by category, tool count, `corpus_generated_at`, `index_built_at`, embedding coverage |

### Registration (documented in `docs/mcp-server.md`)

```
claude mcp add --scope user dopamine-kb -- node <repo>/dist/mcp/server.js
```

User-scoped so the corpus is queryable from every project, not just this repo.

## Pipeline wiring

- New final step "search index" in `src/pipeline/runner.ts` (after dashboard build,
  same error-isolation pattern as other steps).
- npm scripts: `search:index` (build/refresh), `mcp:serve` (run server manually for
  debugging).

## Compatibility

- `node:sqlite` is flag-gated (`--experimental-sqlite`) before Node 23.4, so the
  supported floor is Node 24: bump `engines.node` to `>=24` and move the CI
  build/test matrix from 20/22 to 24. Branch protection pins the Node-20/22 check
  names; update the required-checks list once when the PR lands (repo admin).
- `node:sqlite` still emits an ExperimentalWarning on Node 24 — harmless; suppressed
  in the launcher context only if it pollutes MCP stdio (stderr is safe; stdout is
  the transport and must stay clean — the server never writes to stdout outside the
  protocol).

## Privacy

`videos/search.db` lives under the already-gitignored `videos/` state directory.
Nothing new is committed; the repository stays free of personal corpus data. Docs
use `<repo>` placeholders, never machine-specific paths.

## Testing

Vitest, following existing test layout in `src/__tests__/`:

- composed-doc builder: field priority, truncation, stable output for stable input
- incremental logic: unchanged hash skipped, changed hash re-embedded, model change
  re-embeds all (pure functions, no live API — provider mocked)
- RRF merge: known ranked lists → expected fusion order; category filter; limit
- cosine: known vectors → known similarity; Float32Array round-trip through BLOB
- end-to-end smoke: build `search.db` from a 3-video fixture into a temp dir, run
  `hybridSearch` in keyword-only mode, assert ranked hit + degraded-mode flag

MCP transport layer is thin glue over `query.ts` and is exercised manually
(`mcp:serve` + Claude Code) rather than unit-tested.
