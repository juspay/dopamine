# Project Mapping

Connect each learning to the projects it applies to, and surface those mappings
where you work: a `find_for_project` MCP tool, project chips + a filter in the
dashboard, and high-confidence idea drops into each target repo's `IDEAS.md`.

## Setup

Create `projects.json` at the repo root (gitignored; see
[`projects.example.json`](../projects.example.json) for the shape):

```json
[
  {
    "name": "My App",
    "description": "What it is and does, the stack, and the problems it solves.",
    "keywords": ["typescript", "payments"],
    "path": "/absolute/path/to/my-app"
  }
]
```

- `description` + `keywords` are embedded and shown to the judge — be specific.
- `path` is optional; **only** projects with a `path` that exists on disk get
  `IDEAS.md` drops. Omit it for chip/query-only projects.

## How it works (hybrid embed-prefilter → LLM judge)

1. Each project's doc is embedded once (Vertex), cached in `search.db` and
   re-embedded only when the project's own text changes.
2. For every video, cosine similarity against each project vector keeps the top
   `MAP_PREFILTER_TOPK` (default 4) that clear `MAP_PREFILTER_MIN` (default 0.55).
   Most pairs are dropped here with no LLM call.
3. A text-only Gemini call judges only the prefiltered candidates per video,
   returning applies / confidence (high|medium|low) / a why-it-applies reason.
4. Verdicts are stored in `videos/project_mappings.json` and a `project_mappings`
   table in `search.db`.

Incremental: a `portfolioHash` of `projects.json` gates the work. Editing the
file re-maps everything, but the prefilter keeps the LLM cost proportional to
*plausible* pairs, not the full N×M grid.

## Surfaces

- **MCP** — `find_for_project(project, minConfidence?)` on `dopamine-kb`: every
  learning mapped to a project, best confidence first, with reasons + source links.
- **Dashboard** — `→ project` chips on cards and detail pages (medium+
  confidence), a project filter on the Library page, and a `/project/<name>`
  route. Chips reflect the previous run's mappings (the mapper runs after the
  dashboard build); the MCP tool and IDEAS.md are always current.
- **IDEAS.md** — for **high-confidence** mappings whose project `path` exists, an
  idea block is appended once to `<path>/IDEAS.md` (idempotent per video+project;
  atomic writes; never runs git in the target repo).

## Manual run

```bash
npm run build && npm run search:index && npm run map:projects
```

## Configuration

| Env | Default | Purpose |
|---|---|---|
| `MAP_PREFILTER_TOPK` | `4` | Max candidate projects per video sent to the judge |
| `MAP_PREFILTER_MIN` | `0.55` | Cosine floor for a candidate |
| `MAP_MODEL` | `gemini-2.5-flash` | Text-only judgement model |

## Privacy

`projects.json`, `project_mappings.json`, and `ideas_state.json` are all
gitignored. Only `projects.example.json` (placeholder paths) is committed.
`IDEAS.md` drops write into your own configured repos, never anything networked.
