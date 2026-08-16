# Mapping Evaluation Harness

Five scripts that **measure** the project mapper rather than run it. They score
precision/recall/F1 against the human labels in `videos/labels.json`, so a
tuning change can be judged on evidence instead of on how the output reads.

They are research instruments, not tests. **Nothing here runs in CI** — the
suite in `src/__tests__/` covers the mapper by injecting fake `judge`/`embed`
functions and never touches the network, which is what keeps it fast and
deterministic. These scripts do the opposite on purpose: they call the real
model, because the question they answer is how good the real judge is.

## The scripts

| Script | Measures | Paid calls |
|---|---|---|
| `npm run eval:judge` | End-to-end P/R/F1 by running the real judge over every labelled video | ~1 judge call per labelled video, plus one embed per project facet |
| `npm run eval:facets` | Derives a project's facets from its confirmed videos (k-means centroids → one sentence per cluster) | 1 generate per cluster |
| `npm run eval:portfolio` | Prefilter reach and threshold fit — the ceiling the judge works under | embeds only |
| `npm run eval:triage` | Whether the triage gate is discarding videos the mapper would have wanted | embeds only |
| `npm run eval:relabel` | The human's self-agreement, by re-serving old videos blind | none |

Each npm script rebuilds first. The harnesses import from `dist/`, so a stale
build silently measures old mapper logic.

## What they need

None of it is in the repo, and none of it can be — this is private corpus and
portfolio data, gitignored by design:

- `videos/search.db` — the indexed corpus with embeddings
- `videos/labels.json` — human ground truth; the denominator of every number
- `videos/triage.json` — the gate that decides which videos are eligible
- `projects.json` — your portfolio (`projects.example.json` is the template)
- Live Vertex credentials for `@juspay/neurolink`

A fresh clone has none of these, so the harnesses will not run there. That is
the intended state, not a gap to close.

## Running an A/B

The pattern is one process per arm, with `TAG` naming the output:

```bash
PROJECTS=videos/projects.candidate.json TAG=cand npm run eval:judge
TAG=baseline npm run eval:judge
```

Results land in `videos/judge-eval.<TAG>.bak.json` alongside a printed summary.
`videos/` is gitignored, so runs accumulate locally without touching the repo.

Split the labels when an arm consumes them — `SPLIT=train` to derive, `SPLIT=test`
to score — or the number measures memorisation rather than generalisation.

## Configuration

| Env | Default | Used by | Purpose |
|---|---|---|---|
| `PROJECTS` | `projects.json` | judge, portfolio | Portfolio file to score — the main A/B lever |
| `TAG` | value of `ARM` | judge | Names the output file |
| `ARM` | `baseline` | judge | Selects the judge prompt variant |
| `LIMIT` | `0` (all) | judge | Cap videos judged, for a cheap smoke run |
| `SPLIT` | `all` | facets, portfolio | `train` / `test` / `all` fold selection |
| `MAP_MODEL` | `gemini-2.5-flash` | judge, facets | Judge model, matching `CONFIG.MAP_MODEL` |
| `TOPK` | `6` | portfolio | Prefilter candidates per video |
| `FLOOR` | `0.5` | portfolio | Similarity floor |
| `MIN_LABELS` | `8` | facets | Confirmed videos a project needs before facets are derived |
| `ONLY` | all | facets | Restrict to named projects |
| `OUT` | `videos/facets.bak.json` | facets | Where derived facets are written |
| `N` | `30` | relabel | Videos in the re-review sheet |
| `BEFORE` | `2026-08-05` | relabel | Sample only labels older than this |

## A measured caution

Adding facets to a project is not automatically an improvement. Both known
attempts made things worse:

- Extending Shooter/Dopamine/Yama raised prefilter reach 94% → 96% while
  end-to-end F1 **fell** 68% → 64%.
- Auto-deriving facets for Breeze raised its false positives from 1 to **17**,
  the worst count of any project in that session, and cost 4 points of surfaced
  F1 against the portfolio it started from.

Reach is a ceiling, not a result — the judge can only reject candidates, never
add them, so widening the prefilter reliably buys recall at the cost of
precision. Anything these scripts propose needs confirming with `eval:judge`
before it reaches `projects.json`.

Note also that arm-to-arm differences of a point or two sit inside the
run-to-run spread of a nondeterministic judge over ~144 videos. Run both folds
and prefer results that hold in the same direction twice.
