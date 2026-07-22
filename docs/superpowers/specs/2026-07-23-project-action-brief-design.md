# Per-Project Action Brief — Design

## Goal

Turn the learnings mapped to each project from a **list** into a **synthesized,
prioritized set of concrete actions** — "here is what to actually try in
*project*." Surface it two places: the dashboard `/project/<name>` page, and the
`IDEAS.md` files dropped into configured repos (replacing the per-learning
blocks with the brief).

## Why

Stage 3 maps learnings to projects and lists them (`/project/<name>`) and drops
per-learning idea blocks into repos. But a reader still has to synthesize "given
these 12 learnings, what do I do?" themselves. The Action Brief does that
synthesis with the LLM, so the capture→apply loop produces *actions*, not just a
filtered feed.

## Architecture

A new agent computes one brief per project from the existing mappings +
knowledge base, caches it incrementally, and writes it to a state file. The data
builder folds briefs into the dashboard data; the web project page renders them;
the ideas-writer emits the brief into each project's `IDEAS.md`.

```
project_mappings.json ─┐
knowledge_base.json  ──┼─▶ project-brief agent ──▶ videos/project_briefs.json
projects.json        ─┘        (LLM synth, hashed)         │
                                                           ├─▶ data-builder ─▶ dashboard/data/briefs.json ─▶ /project/<name> "Actions to try"
                                                           └─▶ ideas-writer ─▶ <repo>/IDEAS.md  (marked brief section)
```

## Components

### 1. Schema — `src/schemas/brief.ts`
```ts
export interface BriefAction { title: string; detail: string; basedOn: string[] } // basedOn = videoIds
export interface ProjectBrief { hash: string; generatedAt: string; actions: BriefAction[] }
export type ProjectBriefs = Record<string, ProjectBrief>; // keyed by project name
```
Plus a NeuroLink structured-output schema `BriefLLMSchema = { actions: [{ title, detail, basedOn }] }`
(no `hash`/`generatedAt` — those are added by the agent).

### 2. Agent — `src/agents/project-brief.ts`
- `runProjectBriefAgent(neurolink)`:
  1. Load `project_mappings.json` (the `MappingSet`), `knowledge_base.json`, and `projects.json`.
  2. For each project, collect its mapped learnings (medium+ confidence, matching the
     dashboard `appliesToFor`), resolving each to `{ id, title, takeaways, toolNames, reason }`.
  3. Skip projects with 0 mapped learnings.
  4. Compute `briefHash = sha256(project.hash + sorted(videoId + docHash + confidence) + MODEL)`.
     If the stored brief's hash matches, keep it (incremental — no LLM call).
  5. Otherwise call `neurolink.generate({ provider:"vertex", model: CONFIG.BRIEF_MODEL,
     schema: BriefLLMSchema, output:{format:"json"}, disableTools:true })` with `briefPrompt`.
  6. Validate/clamp: keep 3–5 actions (fewer if the project has few learnings; a 1-learning
     project yields 1 focused action), clamp title/detail length, filter `basedOn` to known videoIds.
  7. Atomic write to `videos/project_briefs.json`. Prune briefs for projects no longer present.
- `briefPrompt(project, learnings)`: instructs the model to output 3–5 concrete, prioritized
  actions phrased as "do X in <project>", each grounded in specific learnings (`basedOn`), not a
  restatement. Deterministic, `disableTools:true`.
- Pure helpers exported for tests: `collectProjectLearnings`, `briefHash`, `parseBrief`
  (dedupe/clamp/validate the LLM output), `briefPrompt`.

### 3. Config — `src/pipeline/config.ts`
- `BRIEF_MODEL` (default `gemini-2.5-flash`, env `BRIEF_MODEL`).
- `BRIEF_MIN_MAPPINGS` (default `1`) — projects below this get no brief.
- `STATE.PROJECT_BRIEFS = videos/project_briefs.json`.

### 4. Pipeline — `src/pipeline/runner.ts`
New step **after Project mapping, before Digest**: `{ name: "Project brief", run: () => runProjectBriefAgent(neurolink) }`.
Digest shifts by one index. (Briefs read the fresh mappings; digest can later read briefs.)

### 5. Data builder — `src/dashboard/data-builder.ts`
Read `project_briefs.json`; emit `dashboard/data/briefs.json` =
`Record<project, { actions: BriefAction[] }>` (drop the internal hash/generatedAt).
No change to `index.json`.

### 6. Web — `/project/[name]` + data loader
- `web/src/lib/types.ts`: add `BriefAction` + `Briefs` types (mirror).
- `web/src/lib/data.svelte.ts`: `loadBriefs()` / `getBriefs()` fetching `briefs.json` (same pattern as facets/tools).
- `web/src/routes/project/[name]/+page.svelte`: an **"Actions to try"** section above the learnings
  grid — each action shows title + detail; `basedOn` renders as small links to the source learnings
  (`/video/<id>`). Section hidden when the project has no brief.

### 7. IDEAS.md — `src/agents/ideas-writer.ts`
Replace the per-learning append with a **marked, replaceable brief section** per project:
- `writeBriefIdeas(briefs, projects, opts)`: for each project with a `path` that exists, write a
  section delimited by `<!-- dopamine:brief:start:<hash> -->` … `<!-- dopamine:brief:end -->`.
- Idempotent + current: if a brief block with the **same hash** is already present, skip; if a brief
  block with a **different** hash exists, replace that delimited region; else append. Never accumulates
  stale briefs. `mdSafe()` still neutralises `<!--`/`-->` in model text.
- The old per-`(video,project)` marker path and `ideas_state.json` are removed (superseded).

## Data flow (incremental)

Only projects whose mapped-learning set changed (new `briefHash`) are re-synthesized; unchanged
projects reuse the cached brief with **no LLM call**. This mirrors the mapper's `videoHashes` gate.
With the current corpus, only Dopamine has ≥2 mappings (rich brief); other mapped projects get a
single-action brief; unmapped projects get nothing.

## Error handling

- LLM returns malformed/empty → `parseBrief` yields `[]`; the agent writes an empty-action brief and
  logs a warning (the project page then simply omits the section). One bad project never aborts the run.
- Corrupt `project_briefs.json` → treated as empty (regenerate all), same tolerance as digest/mapper state.
- `basedOn` ids not in the corpus are dropped; an action with all-invalid `basedOn` still renders (no links).
- IDEAS.md target path missing → skip that project (matches existing behaviour).

## Testing (vitest, colocated + `__tests__`)

- `briefHash` stable & order-independent; changes when a learning's docHash/confidence/model changes.
- `parseBrief`: clamps to ≤5 actions, drops unknown `basedOn`, trims lengths, tolerates junk shapes.
- `collectProjectLearnings`: picks medium+ mappings, resolves titles/takeaways, skips 0-mapping projects.
- `writeBriefIdeas`: appends when absent; skips when same hash present; **replaces** when a different
  hash present (no accumulation); neutralises marker-forgery in action text; skips missing paths.
- data-builder emits `briefs.json` with the public shape (no hash/generatedAt).

## Out of scope (YAGNI)

- Digest integration (weaving the top action into the push) — deferred; the surface question chose
  project page + IDEAS.md.
- Regenerating/committing the built SPA snapshot — that is piece 2, a separate follow-up.
- Per-action status tracking / "done" state.
