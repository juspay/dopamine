# Daily Learnings Digest — Design

**Date:** 2026-07-19
**Status:** Approved
**Stage:** 2 of 3 (retrieval layer → **daily digest** → project mapping)

## Problem

Stage 1 made the corpus queryable (search index + `dopamine-kb` MCP server), but
retrieval is still pull-based: learnings only surface when someone asks. The
daily pipeline runs unattended at 08:30; nothing tells the operator what new,
actionable knowledge arrived. The loop needs a push side.

## Goal

A final pipeline step that, after each run, selects the top new learnings since
the last digest, composes a short AI-written summary, and pushes it to a local
push-notification service (Shooter's `/api/notify`, or any compatible endpoint)
so the digest lands on the operator's phone. Reading it takes ~15 seconds.

## Non-Goals

- Mapping learnings to specific projects (stage 3).
- Multi-channel delivery, digest history UI, weekly rollups.
- A "nothing new today" ping — zero new videos means **no push at all**.

## Behavior

### Selection (`videos/search.db` + `videos/digest_state.json`)

- Candidates: rows in `videos` whose id is **not** in `digest_state.digestedIds`.
- **Bootstrap:** if the state file does not exist, seed `digestedIds` with every
  current id and send nothing — the digest covers videos that arrive *after*
  the feature lands, never the 400+ backlog.
- Rank: `score = verifWeight * 2 + (implementability / 10) * 2 + useWeight`
  - `verifWeight`: verified_useful 3 · partially_verified 2 · unknown 1 · else 0
  - `useWeight`: highly_useful 3 · useful 2 · somewhat_useful 1 · else 0
  - tie-break: newer `taken_at` first
- Take top `DIGEST_TOP_N` (default 5). Unsent candidates stay undigested and
  compete again tomorrow (ranked, so stale weak items naturally sink).

### Composition

- One NeuroLink/Vertex `generate` call (same pattern as other agents, zod schema
  `src/schemas/digest.ts`): input is the selected records (title, takeaways,
  tools, category); output is `{ headline, lines[] }` — a ≤80-char headline and
  exactly one ≤110-char line per item. **URLs are attached mechanically by
  index**, never trusted from the model.
- On any LLM failure: mechanical fallback — headline `"N new learnings"`, each
  line `"{title} — {first takeaway}"` truncated. The digest never dies from a
  model hiccup.

### Delivery

- `POST {DIGEST_PUSH_URL}` (default `http://localhost:${SHOOTER_LOCAL_PORT:-54006}/api/notify`)
  with `Authorization: Bearer {key}`; key from `DIGEST_PUSH_KEY`, else parsed
  from `~/.shooter/.env` (`API_KEY=`). 10s timeout.
- Body (Shooter fire-and-forget shape):
  `{ title: "Dopamine — N new learnings", subtitle: headline, message: numbered lines each followed by its reel URL, data: { category: "digest", project: "dopamine", requestId, timestamp, source: "dopamine-digest" } }`
- **Mark digested only after a 2xx response.** Unreachable/non-2xx → state
  untouched; today's items roll into tomorrow's digest.
- No push service configured/running is a logged skip, not an error.

### Wiring

- Pipeline step 18 (0-indexed 17), "Digest", after "Search index"; step failure
  is isolated like every other step (never fails the run).
- `npm run digest` for manual/on-demand runs (CLI entry guard, own NeuroLink
  instance).
- Config: `CONFIG.DIGEST_TOP_N`, `CONFIG.DIGEST_PUSH_URL`, `CONFIG.STATE.DIGEST_STATE`.
- `.env.example` documents `DIGEST_TOP_N`, `DIGEST_PUSH_URL`, `DIGEST_PUSH_KEY`.

## Privacy

`videos/digest_state.json` is under the gitignored `videos/*.json` rule. The
committed code contains only localhost defaults and env names — no keys, no
machine-specific paths beyond the conventional `~/.shooter/.env` lookup.

## Testing

Pure functions with injected deps (repo pattern from stage 1):

- ranking weights + tie-break; selection filters digested ids and limits
- bootstrap seeds all ids and returns no candidates
- fallback composition; line/headline truncation
- payload builder shape; URL-by-index attachment
- delivery: fake fetch — 2xx marks digested, non-2xx/network error leaves state
  untouched (roll-forward)
- live check against the real Shooter server once, manually, before the PR
