# Triage Gate — Design

## Goal

Stop treating every saved video as a "learning." Add an early **triage** stage
that assigns each video an **actionability tier**, and gate the expensive
apply-loop (analysis → verification → mapping → brief) to only the actionable
tiers — so recipes, cafes, and comedy never reach project mapping.

## Why

Audit finding (systemic root cause #1): no stage asks "is this actionable for my
work?", and prompts actively forbid returning "no signal." Result: 39% personal/
lifestyle content is force-scored and rationalized onto products (comic-cafe →
Breeze; baby-cries → Dopamine). Triage is the foundational fix that cleans the
input for every downstream precision fix.

## Taxonomy — actionability tiers

Per video, one tier + a reason + confidence:

| Tier | Meaning |
|---|---|
| `apply-now` | Concrete tool/technique to adopt or implement in a project now |
| `evaluate-later` | Promising but needs assessment — a trend, a tool to pilot |
| `reference-only` | Real knowledge worth keeping/searching, nothing to *do* for products |
| `skip` | Saved to enjoy — no learning intent (comedy, anime, aesthetics) |

`APPLY_TIERS = { apply-now, evaluate-later }` feed the apply-loop.

## Architecture

New stage after **Classification**, before **Knowledge extraction**, so it can
gate cheaply (it decides from the classifier's output, before expensive work).

```
classification.json ─▶ triage agent ─▶ videos/triage.json { id: {tier, confidence, reason, hash} }
                                            │
        analysis / verification / mapping / brief  ──gate on tier∈APPLY_TIERS──┐
        knowledge extraction ──skip only 'skip' tier; relax "never empty" prompt┘
        data-builder ──▶ tier on each IndexRecord ──▶ dashboard buckets
```

### Components

1. **`src/schemas/triage.ts`** — `Tier` union, `APPLY_TIERS` set, `feedsApplyLoop(tier)`,
   `TriageLLMSchema` (Zod: `{ tier, confidence, reason }`), `TriageEntry`/`TriageFile` types.
2. **`src/agents/triage.ts`** —
   - Pure: `triageInput(cls, caption)` (builds the text the model judges), `triagePrompt(inputs)`,
     `parseTriage(raw)` (validate/clamp/default to `reference-only` on junk), `triageHash(input, model)`.
   - `runTriageAgent(neurolink)`: load classifications + metadata (caption), incremental hash-gate
     (recompute only changed), one LLM call/video (`gemini-2.5-flash`, structured), atomic write
     `videos/triage.json`. Exported `loadTriageTiers(): Promise<Map<id,Tier>>` for gates.
3. **`src/pipeline/config.ts`** — `TRIAGE_MODEL`, `STATE.TRIAGE`.
4. **`src/pipeline/runner.ts`** — insert `{ name: "Triage", run: () => runTriageAgent(neurolink) }`
   after Classification (step 3), before Knowledge extraction; renumber comments.
5. **Gates:**
   - `src/agents/analyzer.ts`: its knowledgeBase `.filter(...)` also requires `feedsApplyLoop(tierOf(id))`.
   - `src/agents/project-mapper.ts`: `loadJudgeVideos` (or the candidate set) filtered to apply-tier ids.
   - `src/agents/knowledge.ts`: skip extraction for `skip` tier; relax the "ALWAYS ≥3 takeaways / never
     empty list" lines so reference/skip may legitimately return low signal.
   - Verifier + brief are already downstream (auto-gated once analysis/mapping are gated).
6. **`src/dashboard/data-builder.ts`** — read triage.json, add `tier: Tier` to IndexRecord/VideoDetail,
   add a `tiers` facet.
7. **Web** — `web/src/lib/types.ts` mirror `tier`; `videos/+page.svelte` add a tier filter
   (Apply now · Evaluate later · Reference · Saved); project pages/briefs already draw from mapped set.

## Incremental & id convention

`triageHash = sha256(model + category + subcategory + tags + caption)` — re-triage only when the
classifier's signal changes. Ids are the `makeId(filename)` stem (matches mappings/index).

## Error handling

- Malformed LLM output → `parseTriage` defaults to `reference-only` (conservative: keeps it searchable,
  keeps it OUT of the apply-loop). One bad video never aborts the run (per-video try/catch, keep prior).
- Missing triage.json (first run / not-yet-triaged video) → gates treat unknown as **apply-loop-eligible**
  is WRONG (would leak noise); treat unknown as **NOT apply-eligible** only once triage has run, else
  fall through so the pipeline still works pre-triage. Concretely: gates use `feedsApplyLoop(tiers.get(id) ?? "apply-now")`
  when triage.json is ABSENT entirely (backwards-compatible), but `?? "reference-only"` when it exists but
  lacks this id (a genuinely un-triaged item shouldn't leak). Implemented as: if the triage map is empty, gates are no-ops.

## Testing

- `parseTriage`: valid tiers pass; junk/unknown → `reference-only`; confidence clamped.
- `feedsApplyLoop`: only apply-now/evaluate-later true.
- `triageHash`: stable, order-independent over tags, changes on model/caption/category change.
- `runTriage` (injected deps): incremental cache-hit (unchanged → no LLM call), per-video failure
  isolation, prior carried forward on a transient classification error, id-collision keeps first-seen.
- `makeApplyGate`: empty-map no-op admits everything; a populated map admits only apply-tiers and
  excludes reference/skip/un-triaged ids. `loadTriageTiers` round-trips a file end-to-end into the gate.

## Authoritative gate

The gate is not merely additive: on each run, `analyzer` and `project-mapper` prune analysis /
mapping entries for ids the gate now excludes (re-triaged to skip/reference-only, or predating
triage), so a re-triage retires the spurious mappings this feature targets instead of leaving them
in the dashboard/briefs. This is a no-op until triage has run.

## Out of scope (later phases)

Coverage, audio routing, trust-signal grounding, and the deeper mapping-judge rewrite are separate
roadmap phases.
