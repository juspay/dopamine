# Project Mapping — Design

**Date:** 2026-07-19
**Status:** Approved
**Stage:** 3 of 3 (retrieval layer → daily digest → **project mapping**)

## Problem

Stages 1–2 made the corpus queryable (MCP) and pushed a daily digest, but a
learning still doesn't connect to the *work it applies to*. "CloakBrowser bypasses
Cloudflare" is only actionable if you know it belongs in Dopamine's scraper.
Nothing maps learnings onto the operator's actual projects.

## Goal

Map each learning to the projects it applies to, and surface those mappings where
work happens: a `find_for_project` MCP tool, project chips + a filter facet in the
dashboard, and high-confidence "idea" drops into each target repo's `IDEAS.md`.

## Portfolio config

`projects.json` at repo root — **gitignored** (personal; may reference private
repo paths). A committed `projects.example.json` documents the shape.

```json
[
  {
    "name": "Dopamine",
    "description": "AI video retrieval + knowledge-extraction pipeline over saved Instagram/YouTube content; Gemini/Vertex via neurolink; TypeScript ESM + Python scrapers.",
    "keywords": ["scraping", "instagram", "gemini", "knowledge extraction", "sqlite", "mcp"],
    "path": "/absolute/path/to/repo"
  }
]
```

- `name` — display + chip label + `find_for_project` key (case-insensitive match).
- `description` + `keywords` — the text embedded and shown to the judge.
- `path` (optional) — absolute repo path; **only** projects with a `path` that
  exists get `IDEAS.md` drops. Omit for query/chip-only projects.

A starter `projects.json` is generated from the operator's known portfolio for
them to edit; only `projects.example.json` is committed.

## Mapping — hybrid (embed-prefilter → LLM judge)

Runs over the **whole corpus** (not just new videos), incrementally.

1. **Project vectors** — embed each project's doc (`name + description +
   keywords`) once via the Vertex provider (`createAIProvider("vertex").embed`),
   the same one the search index uses. Cached in `search.db` (`project_vectors`
   table) keyed by a per-project content hash, so unchanged projects aren't
   re-embedded.
2. **Prefilter (cheap, deterministic)** — for every video with a stored embedding
   in `search.db`, cosine-similarity against each project vector. Keep the top
   `MAP_PREFILTER_TOPK` projects per video (default 4) that clear
   `MAP_PREFILTER_MIN` (default 0.55). Most (video, project) pairs are dropped
   here without an LLM call.
3. **Judge (precise)** — one text-only `gemini-2.5-flash` call per video judging
   *only its prefiltered projects*: given the video's title/takeaways/tools and
   each candidate project's description, return per project
   `{ applies: boolean, confidence: high|medium|low, reason: string(≤140) }`.
   Zod-schema'd with the tolerant-parse + backoff wrapper the other agents use;
   a failed/unparseable call drops that video's mappings for this run (retried
   next run) — never crashes the step.
4. **Store** — `applies:true` results → `videos/project_mappings.json`
   (`{ portfolioHash, mappings: { [videoId]: [{project, confidence, reason}] } }`)
   **and** a `project_mappings` table in `search.db`.

**Incrementality:** a `portfolioHash` (sha256 of the normalized `projects.json`)
gates everything. A video is re-judged only if it has no mapping under the current
hash. Editing `projects.json` bumps the hash → full re-map, but the prefilter keeps
the LLM cost proportional to *plausible* pairs, not the full N×M grid.

## Surfaces

### MCP tool `find_for_project`
`dopamine-kb` gains `find_for_project(project, minConfidence?)` → learnings mapped
to `project` (case-insensitive), each `{videoId, title, confidence, reason,
takeaways, topTools, sourceUrl}`, ordered by confidence then existing rankScore.
Unknown project → error listing the known project names.

### Dashboard (per web/ reconnaissance)
- `appliesTo: string[]` (projects at **medium+** confidence) added to
  `IndexRecord` in **both** type mirrors (`web/src/lib/types.ts` +
  `src/dashboard/data-builder.ts`), populated from `project_mappings.json`.
- New `web/src/lib/components/ProjectChip.svelte` (clone of `TagChip.svelte`).
- Chips on `VideoCard` (sliced to 5) and the video detail page (unsliced),
  matching the existing tag-row placement.
- `Facets.projects: {name,count}[]` (both mirrors) + a `project/[name]` route
  (clone of `tag/[tag]`) + the Library-page `?project=` filter (clone of the
  `?cat=` handling).
- **Known tradeoff:** dashboard chips lag one pipeline run (data-builder runs
  before the mapper in step order). The MCP tool and IDEAS.md — the actual apply
  surfaces — are always current. Documented, accepted; browse-only surface.

### IDEAS.md drops
- **high-confidence only**, and only for projects whose `path` is set and exists.
- Append an idempotent block to `<path>/IDEAS.md` per (video, project) pair:
  title, why-it-applies (the judge's reason), first takeaway, tools, reel link,
  a stable `<!-- dopamine:<videoId> -->` marker.
- Tracked in `videos/ideas_state.json` (per video+project) so a block is written
  once; atomic tmp+rename writes; **never** runs git or any command in those repos.
- Creates `IDEAS.md` with a header if absent. Never rewrites existing content.

## Pipeline wiring

Insert **after** the search index (needs its embeddings), **before** the digest:

```
14 enrichment → 15 dashboard build → 16 search index → 17 project mapper → 18 digest
```

`npm run map:projects` for manual runs. Each step is error-isolated like the
others; a mapper failure never fails the run. No change to stage-1
`corpus_generated_at` behavior (search index ordering is untouched).

## Config additions

`MAP_PREFILTER_TOPK` (4), `MAP_PREFILTER_MIN` (0.55), `MAP_MODEL`
(`gemini-2.5-flash`), `STATE.PROJECT_MAPPINGS`, `STATE.IDEAS_STATE`,
`PROJECTS_CONFIG` (`projects.json`). `.env.example` documents the tunables.

## Privacy

`projects.json`, `project_mappings.json`, `ideas_state.json` all live under
gitignored paths (`projects.json` explicitly added; the rest match `videos/*.json`).
Committed code carries only `projects.example.json` with placeholder paths.
IDEAS.md drops write into the operator's *own* configured repos, never anything
networked.

## Testing

Pure, dependency-injected functions (house pattern):
- portfolio hashing + normalization; project-doc composition
- prefilter: cosine top-K + floor; empty-embeddings and no-project cases
- judge orchestration with a fake generate: applies/confidence parsing, malformed
  output dropped, batching per video
- incremental gate: unchanged hash skips, changed hash re-maps
- `find_for_project` query: ordering, minConfidence filter, unknown project
- IDEAS.md: first write creates with header, second write idempotent (marker
  present → skip), path-missing → skip, atomic (no `.tmp` remnant)
- data-builder `appliesTo`/`projects` facet population from mappings
- MCP handler dispatch for the new tool
Web UI (chips/facet/route) verified by build + manual load (no web test rig).
