# Dopamine Dashboard — Full Audit Report
**Date:** 2026-06-01  
**Scope:** 378 videos, 824 tools, 6 auditor areas (pipeline root-cause, data-integrity, media-assets, routes-A, routes-B, cross-links)  
**Server:** http://localhost:8890 — HTTP 200, all /data/* endpoints healthy

---

## Executive Summary

The app is **functionally healthy** — all routes return HTTP 200, all 378 thumbnails and video files serve correctly, and the vast majority of video detail pages render complete, accurate data. The "missing data in a lot of places" complaint has a single root cause: **the May 31 launchd pipeline run (03:03 UTC) executed Step 5 (Vertex AI knowledge extraction) while the host had no internet connectivity, causing a DNS failure for `oauth2.googleapis.com` that wrote empty error entries for the 2 newest videos; a separate pre-existing verifier code filter then permanently skips 21 more videos that have zero actionable items, leaving 23/378 videos (6%) with `verification=unknown` and empty scoring fields.**

The 2 fully-blank videos are disproportionately damaging because they are sorted first in the home "Recent" rail — every new visitor sees them before any healthy content.

---

## Severity-Ranked Defect Table

| # | Issue | Area | Severity | Affected | Root Cause | Fix | Effort |
|---|-------|------|----------|----------|------------|-----|--------|
| 1 | 2 newest videos fully blank — top of home Recent rail | pipeline, data-integrity | **Critical** | 2/378 videos | May 31 pipeline ran Step 5 while host had no internet; Vertex AI OAuth2 DNS (`oauth2.googleapis.com`) failed all 5 retries; `knowledge.ts:186-197` wrote `{error: "...", transcript: "", key_takeaways: []}` entries, overwriting the successful May 30 extraction | Restore internet, then: `npm run build && node dist/pipeline/runner.js --start=4 --end=16` (~8-12 Vertex AI calls; all other 376 videos skipped by resume logic) | Low — single command once internet is available |
| 2 | 21 videos permanently stuck at `verification=unknown` — verifier hard-filters them out | pipeline | **High** | 21/378 videos | `src/agents/verifier.ts:197-199` requires `actionable_items.length > 0`; these 21 have valid KB+analysis data but 0 actionable items (food, lifestyle, entertainment, one misclassified dog video) — so they are never passed to the verifier and get no score ever | Code change in `src/agents/verifier.ts:197-199`: widen filter to include `actionable_items.length === 0` entries and write a baseline entry (`overall_score='not_verifiable'`, `confidence=0`, `summary='No actionable items to verify.'`). Then: `npm run build && node dist/pipeline/runner.js --start=14 --end=16` | Medium — requires code change + targeted partial re-run |
| 3 | 9 videos have `visualDescription='[object Object]\n[object Object]...'` — renders as garbage | data-integrity | **High** | 9/378 videos | `data-builder.ts` or the analysis agent coerces an array of scene-description objects to string via implicit `.toString()` instead of joining their `.text`/`.description` properties | Fix pipeline serialisation: extract `.text` or `.description` from each scene object and join with `\n` before writing `visualDescription`. Affected file: `src/dashboard/data-builder.ts` (find the `visualDescription` assignment). | Medium |
| 4 | 6 videos have raw JSON objects embedded in `transcript` field | data-integrity | **High** | 6/378 videos | Analysis agent returned a structured JSON object for `transcript`; pipeline accepted it without flattening | Pipeline should detect if `transcript` is an object and flatten: join `{timestamp, text}` pairs with `\n`. Fix in the knowledge/analysis agent before `knowledge_base.json` is written. | Medium |
| 5 | 5 videos with empty `username` — invisible to `/creator` route, facets, and render broken `@` link | data-integrity, routes-A, routes-B, cross-links | **High** | 5/378 videos | Pipeline failed to extract Instagram username for these videos (opaque base64 IDs = reels with no captured handle) | Pipeline: reject/quarantine records with empty `username` before writing `index.json`. Frontend mitigation: `web/src/lib/components/CreatorLink.svelte:17` — wrap in `{#if name}` guard, render plain `<span>` otherwise | Low (frontend guard); Medium (pipeline fix + metadata backfill) |
| 6 | 33 videos have empty `topics` array — invisible to KB topics filter | data-integrity | **Medium** | 33/378 (8.7%) | Topics extraction sub-step returned nothing or was omitted for these videos | Re-run topics extraction step for the 33 affected IDs; includes the 2 blank IDs (will be fixed by fix #1) and 31 others | Medium |
| 7 | Double-hash tags: 3 videos render `##ClaudeCode`-style labels | routes-B | **Medium** | 3 videos, 18 tag instances | Pipeline stored tags with `#` prefix; `TagChip.svelte:23` unconditionally prepends another `#` | Fix in `web/src/lib/components/TagChip.svelte:23`: change to `label={tag.startsWith('#') ? tag : '#' + tag}` | Low — one-line frontend fix |
| 8 | 23 videos with `verification='unknown'` are hidden by all specific filter pills on `/videos` | routes-A | **Medium** | 23/378 videos | `/videos` filter at `web/src/routes/videos/+page.svelte:95` uses exact-match against 4 canonical values; `'unknown'` matches none | Add `'Unknown / Pending'` option to `VERIF_OPTIONS` const (lines 56-62), or map `'unknown'` → `'not_verified'` in the filter comparison | Low — frontend-only |
| 9 | `usefulness='unknown'` renders visible raw "Unknown" text in detail sidebar | routes-A, routes-B | **Medium** | 2/378 (the blank videos) | `{#if detail.usefulness}` is truthy for the string `'unknown'`; CSS `text-transform: capitalize` shows it as "Unknown" | Change guard at `web/src/routes/video/[id]/+page.svelte:248` to `{#if detail.usefulness && detail.usefulness !== 'unknown'}` | Low — one-line frontend fix |
| 10 | `'unknown'` not in `VERIF_LABEL`/`VERIF_COLOR` maps — badge displays raw "unknown" text | routes-B | **Medium** | 23/378 videos | `web/src/lib/format.ts:107-118` has no `'unknown'` key; `verifLabel('unknown')` returns the raw string | Add `'unknown': 'Not analysed'` to `VERIF_LABEL` and a neutral color entry to `VERIF_COLOR` in `web/src/lib/format.ts` | Low |
| 11 | 22 videos have empty `fullName`; 21 also have empty `date` — sorting/display broken | data-integrity, cross-links | **Medium** | 22/378 fullName; 21/378 date | Pipeline metadata extraction failed for these accounts (a single aggregator account = 11/22); Instagram display name/timestamp not available at ingest time | Re-run metadata extraction for 22 affected IDs; add pipeline validation guard blocking records with empty `fullName` or `date` | Medium |
| 12 | 11 videos have non-integer `confidence` scores (e.g. 3.0028751532029516) | data-integrity | **Medium** | 11/378 videos | Pipeline averages sub-scores without applying `Math.round()` before writing | Add `Math.round()` to confidence calculation in `src/dashboard/data-builder.ts` before serialisation | Low |
| 13 | 60 videos have empty `links` array — blank Links section in detail view | data-integrity | **Medium** | 60/378 (15.9%) | Links extraction prompt found no URLs (expected for food/travel; suspicious for some Tech/AI videos) | Review the 60 IDs; re-run links extraction for Tech/AI videos among them; non-tech categories are expected to have no links | Medium |
| 14 | 26 `tools.json` entries have non-URL strings in the `url` field | data-integrity | **Medium** | 26/824 tools | Pipeline inserted free-text (search instructions, bare hostnames, `N/A: macOS...`) into `url` field when no canonical URL was available | For bare hostnames prepend `https://`; for search/concept strings clear `url` and keep `urlStatus='no_url'` only | Low |
| 15 | Redundant `decodeURIComponent` on SvelteKit route params — fragile for future `%`-containing IDs | routes-A, routes-B | **Low** | `video/[id]`, `category/[cat]`, `tag/[tag]` pages | SvelteKit already decodes `$page.params` before exposing them; double-decode is a no-op today but will throw `URIError` on any future ID/tag/category containing `%` | Remove `decodeURIComponent()` wrappers: `video/[id]/+page.svelte:19`, `category/[cat]/+page.svelte:11`, `tag/[tag]/+page.svelte:8` | Low |
| 16 | 21 videos with empty `date` render blank date in `VideoCard` footer | routes-A, routes-B | **Low** | 21/378 | Pipeline could not extract post date (base64-ID reels, an aggregator account) | Pipeline-side: default or reject dateless records. Frontend already guards correctly with `{#if record.date}` — optionally show `'Unknown date'` fallback | Low |
| 17 | 158 dead + 27 error tool URLs (22.5% of 824 tools) | data-integrity, cross-links | **Low** | 185/824 tools | External URLs became dead after pipeline URL-check was run | Schedule periodic tool URL re-validation; surface dead/error tools with a visual indicator in `/tools` view | Low |
| 18 | 7 videos have fewer than 8 `relatedIds` (min=3) — thin Related rail | cross-links | **Low** | 7/378 | Similarity algorithm could not find 8 peers (Finance has only 4 total videos) | Fall back to cross-category similarity by shared tags/topics to pad to 8; acceptable as-is for tiny categories | Low |
| 19 | 11 videos have empty `visualDescription` (outside `[object Object]` corruption) | pipeline | **Low** | 11/378 | Frame-extraction path returned <10 frames or thumbnail fallback; model returned no visual description; resume logic considers these "done" | Manually clear KB entries for these 11 IDs and re-run step 4 to re-extract | Medium |

---

## Recommended Fix Order

### Priority 1 — Fix now (unblocks the headline complaint)

**Fix the 2 blank newest videos** — they are the first cards every new visitor sees.

1. Confirm internet connectivity: `curl -s https://oauth2.googleapis.com/token -o /dev/null -w "%{http_code}"` should return non-000.
2. Rebuild if dist/ is stale: `npm run build`
3. Re-run the partial pipeline: `node dist/pipeline/runner.js --start=4 --end=16`
   - Step 4 (knowledge): sees `error` set on the 2 IDs → logs "RETRY (previous error)" → re-runs Vertex AI → overwrites with full transcript+takeaways.
   - Steps 5-9 skip already-processed entries (< 1 min each).
   - Step 10 (dashboard build): regenerates `dashboard/data/video/<id>.json` for the 2 IDs.
   - Steps 11-14 (analysis → verification): pick up the 2 newly-populated IDs.
   - Cost: ~8-12 Vertex AI (Gemini) calls + URL checks for 2 videos.

**Affected IDs:** `demo_video_1`, `demo_video_2`

---

### Priority 2 — Code fix required (21 permanently-stuck videos)

**Widen the verifier filter in `src/agents/verifier.ts:197-199`:**

Current code:
```ts
Object.entries(analysisState).filter(([, entry]) => !entry.error && entry.actionable_items.length > 0)
```

Required change: add a separate pass (or widen the filter) to assign baseline entries for `actionable_items.length === 0` videos:
```ts
// After the main verification loop, write baseline entries for non-actionable videos:
const nonActionable = Object.entries(analysisState).filter(
  ([id, entry]) => !entry.error && entry.actionable_items.length === 0 && !verificationState[id]
);
for (const [id] of nonActionable) {
  verificationState[id] = {
    overall_score: 'not_verifiable',
    confidence: 0,
    summary: 'No actionable items to verify.',
    item_results: [],
  };
}
```

Then: `npm run build && node dist/pipeline/runner.js --start=14 --end=16`

**Affected:** 21 IDs listed in the data-integrity audit (specific accounts omitted)

---

### Priority 3 — Quick frontend fixes (low effort, high polish)

These are all single-line or two-line changes and can be batched into one commit:

| File | Line | Change |
|------|------|--------|
| `web/src/lib/components/TagChip.svelte` | 23 | `label={tag.startsWith('#') ? tag : '#' + tag}` |
| `web/src/lib/components/CreatorLink.svelte` | 17 | Wrap entire `<a>` in `{#if name}` guard |
| `web/src/routes/video/[id]/+page.svelte` | 248 | `{#if detail.usefulness && detail.usefulness !== 'unknown'}` |
| `web/src/routes/videos/+page.svelte` | 56-62 | Add `{ label: 'Unknown / Pending', value: 'unknown' }` to `VERIF_OPTIONS` |
| `web/src/lib/format.ts` | 107-118 | Add `'unknown': 'Not analysed'` to `VERIF_LABEL`; `'unknown': 'var(--neutral)'` to `VERIF_COLOR` |
| `web/src/routes/video/[id]/+page.svelte` | 19 | Remove `decodeURIComponent()` wrapper |
| `web/src/routes/category/[cat]/+page.svelte` | 11 | Remove `decodeURIComponent()` wrapper |
| `web/src/routes/tag/[tag]/+page.svelte` | 8 | Remove `decodeURIComponent()` wrapper |

After changes: rebuild SPA and copy to `dashboard/`.

---

### Priority 4 — Pipeline data-quality fixes (medium effort)

1. **`[object Object]` visualDescription (9 videos):** Fix serialisation in `src/dashboard/data-builder.ts` — find the `visualDescription` assignment and extract `.text`/`.description` from scene objects before joining.
2. **Raw JSON transcripts (6 videos):** In the knowledge/analysis agent, detect if `transcript` is an object and flatten `{timestamp, text}` pairs with `\n` joins.
3. **Non-integer confidence (11 videos):** Add `Math.round()` to confidence calculation in `src/dashboard/data-builder.ts` before writing the field.
4. **26 non-URL strings in tools.json `url` field:** Post-process in `src/dashboard/data-builder.ts` — prepend `https://` for bare hostnames; clear `url` for search-string/concept entries.
5. **Pipeline validation gate:** Add pre-write validation in `src/dashboard/data-builder.ts` that warns/blocks on: empty `username`, empty `date`, empty `fullName`, non-integer `confidence`.

---

### Priority 5 — Backfill and maintenance (low urgency)

- Re-run metadata extraction for the 22 videos with empty `fullName` (dominated by an aggregator account — 11 videos).
- Re-run date extraction for the 21 dateless videos.
- Periodically re-validate tool URLs and surface dead/error status in `/tools` view.
- For 7 videos with <8 `relatedIds`: broaden similarity to cross-category tag/topic matching.

---

## What Is Actually Fine

The following areas were audited and found **fully healthy** — no action needed:

| Area | Status | Evidence |
|------|--------|----------|
| **Media assets** | Healthy | All 378 thumbnails (42.4 MB total) and 378 video files (2.96 GB total) present on disk, non-zero, HTTP 200 with correct content-types. Zero broken images, zero broken video players. |
| **Server / routing** | Healthy | All SPA routes return HTTP 200. All `/data/*` endpoints serve correct JSON shapes. Express static mounts for `/videos` and `/data` are correctly configured in `src/server/dashboard-server.ts:51-54`. |
| **Facet consistency** | Healthy | All 12 category facets sum to exactly 378. All category colors/bg values match `format.ts` exactly. Tags and topics are bidirectionally consistent between facets.json and video detail files. Zero count mismatches. |
| **relatedIds integrity** | Healthy | All 3,000 `relatedIds` cross-references resolve to valid video IDs. Zero orphaned references. 371/378 videos have exactly 8 related IDs. |
| **tools.json referential integrity** | Healthy | All 824 tool entries have a `videoId` that resolves to an existing detail file. Zero duplicate tool rows. Zero tools with empty name. |
| **index ↔ detail consistency** | Healthy | All 378 detail files exist and are non-zero. Zero orphan detail files. Zero index/detail field disagreements across all audited fields. |
| **Frontend field bindings** | Healthy | No absent or renamed field references found across any route. Zero JS runtime crashes. All cross-links between routes resolve correctly. |
| **Healthy video majority** | Healthy | 355/378 videos (94%) have complete AI analysis (keyTakeaways, transcript, visualDescription, actionableItems populated). 353/378 have a non-unknown verification status. |

---

## Metrics Summary

| Metric | Count | % of 378 |
|--------|-------|----------|
| Fully blank videos (critical, top of feed) | 2 | 0.5% |
| Videos with `verification=unknown` (total) | 23 | 6.1% |
| `[object Object]` visualDescription corruption | 9 | 2.4% |
| Raw JSON embedded in transcript | 6 | 1.6% |
| Empty `topics` array | 33 | 8.7% |
| Empty `links` array | 60 | 15.9% |
| Empty `date` | 21 | 5.6% |
| Empty `username` (ghost videos) | 5 | 1.3% |
| Non-integer `confidence` scores | 11 | 2.9% |
| Dead/error tool URLs | 185/824 | 22.5% |
| **Videos with complete, healthy data** | **~340** | **~90%** |
