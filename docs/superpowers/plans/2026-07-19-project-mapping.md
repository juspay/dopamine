# Project Mapping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Map corpus learnings to the operator's projects (hybrid embed-prefilter → LLM judge) and surface them via a `find_for_project` MCP tool, dashboard chips + facet, and high-confidence IDEAS.md drops.

**Architecture:** New `src/agents/project-mapper.ts` (pure, DI'd layers) reads `search.db` embeddings + `projects.json`, prefilters by cosine, judges with `gemini-2.5-flash`, writes `videos/project_mappings.json` + a `project_mappings` table. Consumers: `src/mcp/handlers.ts` (new tool), `src/dashboard/data-builder.ts` (`appliesTo` + `projects` facet), the web SPA (chips/facet/route), and an IDEAS.md writer.

**Tech Stack:** TS ESM strict, `node:sqlite`, neurolink Vertex `embed` + `generate`, zod, vitest; SvelteKit web (Svelte 5 runes).

**Spec:** `docs/superpowers/specs/2026-07-19-project-mapping-design.md`

**Conventions:** conventional commits; single-commit PR (squash before opening); public repo hygiene.

---

### Task 1: Portfolio config + schema

**Files:** `src/schemas/projects.ts`, `projects.example.json`, `.gitignore`, test `src/__tests__/projects-config.test.ts`

- [ ] Zod `ProjectSchema { name, description, keywords: string[], path?: string }`, `ProjectsSchema = array`. Export `Project` type.
- [ ] `loadProjects(readFile): Project[]` — parse + validate; missing/invalid file → `[]` with a warning.
- [ ] `projectDoc(p): string` = `${name}\n${description}\nKeywords: ${keywords.join(", ")}`.
- [ ] `portfolioHash(projects): string` = sha256 of normalized JSON (sorted by name, trimmed).
- [ ] `.gitignore`: add `projects.json`.
- [ ] `projects.example.json`: 2–3 placeholder projects with `/absolute/path/...`.
- [ ] Tests: valid parse, invalid dropped, hash stable + order-insensitive, doc composition.
- [ ] Commit `feat(map): projects config schema + portfolio hashing`.

### Task 2: search.db tables

**Files:** `src/search/db.ts` (extend `SCHEMA`), test in `src/__tests__/search-db.test.ts`

- [ ] Add to `SCHEMA`:
  ```sql
  CREATE TABLE IF NOT EXISTS project_vectors (
    project TEXT PRIMARY KEY, hash TEXT NOT NULL, dims INTEGER NOT NULL, vector BLOB NOT NULL
  );
  CREATE TABLE IF NOT EXISTS project_mappings (
    video_id TEXT NOT NULL REFERENCES videos(id), project TEXT NOT NULL,
    confidence TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (video_id, project)
  );
  CREATE INDEX IF NOT EXISTS project_mappings_project ON project_mappings(project);
  ```
- [ ] Test: tables exist after `openSearchDb`; `project_mappings` FK + PK enforced.
- [ ] Commit `feat(map): project vector + mapping tables`.

### Task 3: Mapper core (pure)

**Files:** `src/agents/project-mapper.ts`, test `src/__tests__/project-mapper.test.ts`

Exported pure pieces:
- [ ] `interface ProjectMapping { project; confidence: "high"|"medium"|"low"; reason }`
- [ ] `prefilter(videoVec, projects: {name; vector: Float32Array}[], topK, min): string[]` — cosine (reuse `search/rank.ts` `cosineSim`), sort desc, filter ≥min, take topK project names.
- [ ] `MapJudgeSchema` (zod): `{ results: [{ project, applies, confidence, reason }] }`.
- [ ] `judgePrompt(video, candidateProjects): string`.
- [ ] `parseJudgement(raw, candidateNames): ProjectMapping[]` — keep `applies:true`, clamp confidence to enum, only known candidate names, reason ≤140.
- [ ] Tests: prefilter top-K + floor + empty; parse keeps only applies+known, clamps, truncates reason.
- [ ] Commit `feat(map): prefilter + judgement parsing`.

### Task 4: Mapper orchestration

**Files:** `src/agents/project-mapper.ts` (continue), `src/pipeline/config.ts`, test continues

- [ ] Config: `MAP_PREFILTER_TOPK` (4), `MAP_PREFILTER_MIN` (0.55), `MAP_MODEL` (`gemini-2.5-flash`), `STATE.PROJECT_MAPPINGS`, `STATE.IDEAS_STATE`, `PROJECTS_CONFIG: path.resolve("projects.json")`.
- [ ] `embedProjects(db, projects, embed)` — per project: compute hash; if `project_vectors` row hash matches, reuse; else `embed(projectDoc)` + upsert. Returns `{name, vector}[]`. Prune vectors for removed projects.
- [ ] `runProjectMapper(neurolink, overrides?)`:
  - open `search.db` (readonly? — needs WRITE for vectors/mappings, so writable via `openSearchDb`); guard `hasSearchSchema`.
  - load projects; empty → log + return.
  - `hash = portfolioHash`; load `project_mappings.json` (`{portfolioHash, mappings}`); if stored hash ≠ current → clear `project_mappings` table + start fresh mapping set.
  - embed projects (cached).
  - for each video in `videos` with an embedding not yet mapped under `hash`: prefilter → if candidates, one judge call → parse → collect.
  - write `project_mappings.json` (merged) + upsert `project_mappings` table rows.
  - DI seams: `dbPath, projectsPath, embed, generate, now`.
- [ ] CLI guard for `npm run map:projects`.
- [ ] Tests (temp db via `indexRecords` + fake embedder): end-to-end with fake embed/generate — mappings written to json + table; unchanged hash re-run judges 0; changed hash re-maps; video with no candidates skipped.
- [ ] Commit `feat(map): hybrid project mapper pipeline step`.

### Task 5: IDEAS.md writer

**Files:** `src/agents/ideas-writer.ts`, test `src/__tests__/ideas-writer.test.ts`

- [ ] `ideaBlock(video, project, reason): string` — markdown block with `<!-- dopamine:<videoId> -->` marker, title, why, first takeaway, tools, reel link.
- [ ] `writeIdeas(mappings, videosById, projects, overrides)` — for high-confidence mappings whose project has an existing `path`: read/create `<path>/IDEAS.md` (header if new), skip if marker present, else append atomically; record (video,project) in `ideas_state.json`. DI: `readFile, writeFile, exists`.
- [ ] Tests: first write creates+header, second idempotent (marker), missing path skipped, non-high skipped, atomic (no `.tmp`).
- [ ] Wire `writeIdeas` into `runProjectMapper` (after mappings computed).
- [ ] Commit `feat(map): high-confidence IDEAS.md drops`.

### Task 6: MCP `find_for_project`

**Files:** `src/mcp/handlers.ts`, `src/search/query.ts`, test `src/__tests__/mcp-handlers.test.ts` + `search-query.test.ts`

- [ ] `query.ts`: `findForProject(db, project, minConfidence): ProjectHit[]` — join `project_mappings` + `videos` (+ top tools), case-insensitive project match, filter by confidence rank (high>medium>low), order by confidence then rankScore-equivalent (verification/implementability). `listProjects(db): string[]` for the unknown-project error.
- [ ] `handlers.ts`: add `find_for_project` tool (schema: `project` required, `minConfidence?`), dispatch → `findForProject`; unknown project → error listing known names.
- [ ] Tests: mapping seeded → tool returns hits ordered; minConfidence filter; unknown project errors with names; TOOLS list now length 5.
- [ ] Commit `feat(map): find_for_project MCP tool`.

### Task 7: Dashboard data (`appliesTo` + `projects` facet)

**Files:** `src/dashboard/data-builder.ts`, `web/src/lib/types.ts`, test `src/__tests__/*` (data-builder has tests? add focused one)

- [ ] `data-builder.ts`: read `project_mappings.json`; add `appliesTo: string[]` (medium+ confidence, deduped) to local `IndexRecord`/`VideoDetail` + populate; add `projects: {name,count}[]` to `Facets` (mirror the `tagCountMap`/`facetTags` block, source `v.appliesTo`).
- [ ] `web/src/lib/types.ts`: add `appliesTo: string[]` to `IndexRecord`, `projects` to `Facets`.
- [ ] Test: builder emits `appliesTo` + `projects` facet from a seeded mappings file (extend existing data-builder test path or add one).
- [ ] Commit `feat(map): appliesTo + projects facet in dashboard data`.

### Task 8: Dashboard UI (chips + facet + route)

**Files:** `web/src/lib/components/ProjectChip.svelte`, `VideoCard.svelte`, `video/[id]/+page.svelte`, `project/[name]/+page.svelte`, `videos/+page.svelte`

- [ ] `ProjectChip.svelte` — clone `TagChip.svelte`, nav `/project/<name>`.
- [ ] `VideoCard.svelte` — project chips row (`.slice(0,5)`).
- [ ] `video/[id]/+page.svelte` — unsliced project chips row.
- [ ] `project/[name]/+page.svelte` — clone `tag/[tag]`, filter `appliesTo.includes(name)`.
- [ ] `videos/+page.svelte` — `?project=` filter (clone `?cat=` state/chips/`syncUrl`/predicate).
- [ ] Verify: `npm --prefix web run build` succeeds.
- [ ] Commit `feat(map): project chips, facet filter, and route`.

### Task 9: Wiring + docs

**Files:** `src/pipeline/runner.ts`, `package.json`, `.env.example`, `docs/project-mapping.md`, `README.md`, starter `projects.json` (uncommitted, for the operator)

- [ ] `runner.ts`: import + `{ name: "Project mapping", run: () => runProjectMapper(neurolink) }` at step 17 (after Search index 16, before Digest which becomes 18); update both step maps + END_STEP note.
- [ ] `package.json`: `"map:projects": "node dist/agents/project-mapper.js"`.
- [ ] `.env.example`: MAP_PREFILTER_TOPK / MAP_PREFILTER_MIN / MAP_MODEL block.
- [ ] `docs/project-mapping.md`: portfolio setup, hybrid flow, surfaces, IDEAS.md semantics, privacy; `<repo>` placeholders.
- [ ] `README.md`: one line + link.
- [ ] Generate a starter `projects.json` locally (NOT committed) from the operator's portfolio for them to edit.
- [ ] Commit `feat(pipeline): run project mapper; docs + scripts`.

### Task 10: Verification (not committed)

- [ ] Full suite + `tsc --noEmit` + `biome check` clean; `npm --prefix web run build` clean.
- [ ] Real run (main checkout data): seed a real `projects.json`, `npm run build && npm run search:index && npm run map:projects` → mappings written; `find_for_project` via MCP returns sane results; spot-check IDEAS.md drop into a scratch path.
- [ ] Adversarial review workflow; fix confirmed findings.
- [ ] Squash → one commit, push (with lease), PR, hold for merge word.

## Self-review

Spec coverage: config ✓T1, tables ✓T2, prefilter+judge ✓T3-4, incrementality ✓T4, IDEAS ✓T5, MCP ✓T6, dashboard data ✓T7, UI ✓T8, wiring/docs/privacy ✓T9. Types: `Project`/`ProjectMapping`/`ProjectHit` defined once, reused. Ordering: search(16)→mapper(17)→digest(18), dashboard(15) reads prior-run mappings (documented lag).
