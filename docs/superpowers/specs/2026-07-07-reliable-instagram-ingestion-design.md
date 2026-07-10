# Reliable Instagram Ingestion — Design

**Date:** 2026-07-07
**Status:** Approved architecture, pending spec review
**Goal:** Get new Instagram saved posts reliably flowing into the Dopamine dashboard again, resilient to Instagram's account-level soft-block on the saved-feed endpoint.

---

## Problem

Every scraping approach tried so far (instagrapi private API, gallery-dl web endpoints) fails the same way: it authenticates as the user and reads the **entire** saved feed. Instagram soft-blocks `feed/saved/posts/` based on that **access pattern** — an authenticated client paginating hundreds of saves like a bot — not based on which library sent the request. Swapping libraries only changes the request signature; it does not remove the behaviour Instagram is punishing.

Reliability therefore comes from changing the *pattern*, along two independent axes:

1. **Volume** — stop re-paginating all 442 saves every run. Fetch only what is new.
2. **Transport** — capture from Instagram's *own* web client (which it cannot block without blocking itself) rather than an automated private-API client.

This design implements both: **incremental fetch** (axis 1, headless daily driver) and **browser piggyback** (axis 2, block-resistant primary), feeding a single shared ingest layer.

---

## Grounding findings (verified against the live codebase)

These three facts, confirmed by reading the code and inspecting on-disk state, shape the design:

1. **The corpus is safe under incremental fetch.** The dashboard's video list is the union of the *filename-keyed* stores — `knowledge_base.json`, `classifications.json`, `catalog.json` (all 390 entries, and they **accumulate across runs**; `data-builder.ts:385` builds `allFilenames` from their union). `videos/metadata.json` is a transient per-run array (351 entries) used only for `pk`-keyed enrichment (`data-builder.ts:382`). A fetch that surfaces only *new* saves is correct: new items get classified and appended to the accumulating stores; old items persist. Incremental fetch does **not** shrink the dashboard.

2. **A latent enrichment bug exists and this design fixes it.** `runner.ts:114` (`runCollectionStep`) overwrites `videos/metadata.json` with the mapped `SourceItem[]` shape, which has no top-level `pk` (confirmed on disk: `metadata.json[0]` has `.ig`/`.source`, no `.pk`). But `data-builder.ts:350` reads it back as `MetadataEntry[]` and keys it by `m.pk` — every lookup resolves to `undefined`, so metadata enrichment (caption/username/likes on the dashboard) has silently done nothing since the `SourceItem` refactor. Making `metadata.json` an accumulating `MetadataEntry[]` store owned by the ingest layer fixes this.

3. **Both capture paths want the same primitive:** an idempotent **ingest** that merges a batch of `MetadataEntry` into the canonical store by `pk`. That is the shared foundation both paths plug into.

---

## Architecture

```
 Path 1: instagrapi (incremental, newest-first, stop-on-known)
     └─ writes videos/metadata.incoming.json  ─┐
                                               ├─► ingestMetadata(batch)
 Path 2: scheduled Chrome harvester (CDP)      │        │  (union by pk)
     └─ reads IG's own saved-feed responses ───┘        ▼
                                              videos/metadata.json   (canonical, accumulating MetadataEntry[])
                                                         │
                                                         ▼
                       pipeline processes NEW filenames ─► accumulating filename-keyed stores ─► dashboard
```

### Data contracts

| File | Shape | Owner | Lifecycle |
|------|-------|-------|-----------|
| `videos/metadata.json` | `MetadataEntry[]` | ingest layer | **canonical, accumulates by `pk`** |
| `videos/metadata.incoming.json` | `MetadataEntry[]` | `collect_metadata.py` | per-run batch (new items only); Python→TS handoff |
| `videos/ig_cooldown.json` | `{until: iso}` | Python | existing rate-limit backoff (unchanged) |
| `knowledge_base.json` / `classifications.json` / `catalog.json` | filename-keyed | agents | existing, accumulate (unchanged) |

The `metadata.incoming.json` staging file replaces today's "Python writes the whole `metadata.json`" contract with "Python writes only what it just fetched; the TS ingest layer unions it in." This is a small evolution of the existing file-based Python→TS handoff.

---

## Component design

### Shared foundation — `ingestMetadata` (`src/pipeline/ingest.ts`, new)

```ts
export async function ingestMetadata(
  batch: MetadataEntry[],
): Promise<{ added: number; updated: number; total: number }>;
```

- Loads existing `videos/metadata.json`. **Migration-safe:** if an entry lacks a top-level `pk` (the legacy `SourceItem[]` shape), read `pk` from its nested `.ig` field; entries with neither are dropped with a warning.
- Unions `batch` into the store keyed by `pk`. New batch entries **win** on conflict (refreshes captions/urls); existing entries absent from the batch are **preserved** (never clobbered).
- Writes back deterministically sorted by `taken_at` descending (nulls last), so diffs are stable.
- Returns counts for logging.
- Idempotent: re-ingesting a `pk` already present with identical data is a no-op (`added: 0`).

### Runner change — stop clobbering the canonical store (`src/pipeline/runner.ts`)

`runCollectionStep` must **no longer** `saveState(CONFIG.STATE.METADATA, items)` with `SourceItem[]`. The collector returns `SourceItem[]` in-memory for the pipeline; the persistent `MetadataEntry[]` store is written only by `ingestMetadata`. This fixes finding #2 and makes `metadata.json` durable across runs.

`runAcquisitionStep` (`runner.ts:119`) currently `loadState<SourceItem[]>(CONFIG.STATE.METADATA)` — it must instead consume the collector's in-memory `SourceItem[]` (passed via a shared variable, mirroring how `laneItems` is threaded), not re-read the file. This decouples the pipeline's in-memory item list from the persistent metadata store.

### Path 1 — incremental instagrapi (`scripts/collect_metadata.py`)

Replace the full-pagination `_fetch_all_saved_media` (`amount=0`) with a newest-first, stop-on-known walk:

```
known = load_known_pks()          # from videos/metadata.json (either shape; nested .ig.pk fallback)

if not known:                     # cold start / empty store
    batch = fetch_all()           # existing amount=0 behaviour, one-time full sync
else:
    batch = []
    for media in saved_feed_newest_first():     # bounded pages, lazy pagination
        if str(media.pk) in known:
            break                 # reached previously-synced territory → STOP (the volume win)
        batch.append(media)
        if len(batch) >= IG_INCREMENTAL_MAX:    # safety cap (default 200)
            break
```

- The saved feed is reverse-chronological, so the first known `pk` marks the boundary; everything before it is already ingested.
- Applies the same early-exit to each **named collection** (bounded first-page-then-stop-on-known), since a new save may be filed into a collection.
- Writes `batch` to `videos/metadata.incoming.json` (not the canonical file).
- Keeps all existing resilience: cooldown check/write, fetch watchdog (`IG_FETCH_TIMEOUT_SEC`), jitter delays, rate-limit abort.
- New env knobs: `IG_INCREMENTAL_PAGE` (page size, default 30), `IG_INCREMENTAL_MAX` (safety cap, default 200), `IG_FORCE_FULL` (bypass incremental for a manual full re-sync).
- **Exact instagrapi call** (generator vs `amount`+`last_media_pk`) is pinned during implementation against the installed 2.3.0 API — the plan includes a task to verify which paginating primitive accepts the `"saved"` alias.

### Path 1 download (`scripts/download_videos.py`)

Reads `videos/metadata.incoming.json` (new items) instead of the full store, and downloads only their mp4s (already skips files present on disk). Unchanged otherwise.

### Path 2 — scheduled Chrome harvester (`scripts/piggyback_harvest.mjs` or `src/pipeline/piggyback/harvester.ts`, new)

A Node process driven over the Chrome DevTools Protocol:

1. Launch Chrome (`--headless=new`, real UA) against a **dedicated user-data-dir logged into instagram.com** (one-time manual login; separate from the user's daily profile to avoid lock contention — mirrors the existing `~/.chrome-mcp-profile` pattern).
2. Enable the CDP `Network` domain, navigate to `https://www.instagram.com/<username>/saved/all-posts/`.
3. Instagram's own web client fetches `.../api/v1/feed/saved/posts/` to render the grid. Capture those responses via `Network.responseReceived` + `Network.getResponseBody` (genuine piggyback — **zero** API calls originate from us). Scroll once or twice for incremental depth.
4. Map each captured media object → `MetadataEntry` (a JS port of `extract_media` from `collect_metadata.py`; same field names).
5. Call `ingestMetadata(entries)` **directly** (same Node project — no HTTP endpoint, no CORS).
6. Detect a logged-out session (redirect to `/accounts/login` / no saved-feed response) and exit with a clear "re-login the harvester profile" message.
7. Downloads: fetch each new video's mp4 via its (fresh, signed) `video_url` with a plain HTTP GET — no Instagram API surface.

**Scheduling:** a launchd job (sibling of `com.dopamine.pipeline`) runs the harvester on the same Mon/Thu cadence. It requires an active GUI login session; documented in setup.

### Optional / not built now

A browser **userscript** that POSTs to a local `/ingest` route is a documented future backstop for on-demand capture in the user's daily browser. Not built (the user chose scheduled Chrome). If added later, the only new surface is a small `POST /ingest` route on the existing dashboard server that validates and calls the same `ingestMetadata`.

---

## Data flow (end to end)

1. **Capture** (either path) produces a batch of freshly-observed `MetadataEntry`.
2. **Ingest** unions the batch into `videos/metadata.json` by `pk` (accumulates).
3. **Collect step** maps the *new* items → `SourceItem[]` and hands them to the pipeline in-memory.
4. **Pipeline** acquires assets and runs classification/knowledge/etc. on the new filenames; agents merge results into the accumulating filename-keyed stores (they must skip already-processed filenames — verified in the plan).
5. **Dashboard build** reads the accumulating stores (list) + `metadata.json` (now correctly `pk`-keyed enrichment) and emits the dashboard JSON.

---

## Error handling

- **Idempotent ingest:** re-ingesting known `pk`s is a no-op; both paths can run in any order / overlap safely.
- **Stale/empty known set:** incremental falls back to a full fetch on cold start; a corrupt/legacy `metadata.json` degrades to "treat as empty → full fetch," never a crash.
- **Safety cap** (`IG_INCREMENTAL_MAX`) bounds a large backlog so one run can't accidentally re-trigger a full-volume pagination.
- **Harvester session expiry** is detected and surfaced as an actionable message; it does not corrupt the store (it simply ingests nothing).
- **Block resilience:** Path 1's early-exit cuts requests from hundreds to ~one page; Path 2 issues zero API calls of its own. Both drastically lower the block signature; Path 2 is the durable primary if Path 1 is throttled.

---

## Testing strategy

- **`ingestMetadata`** (unit): union/dedup by `pk`; new-wins-on-conflict; existing-preserved; legacy `.ig.pk` migration; deterministic sort; idempotent re-ingest.
- **Incremental walk** (unit, pure helper): given a `known` set and a newest-first media sequence, returns exactly the new prefix and stops at the first known `pk`; cold-start → full; safety-cap honoured.
- **`extract_media` JS port** (unit): a captured IG web response object maps to the same `MetadataEntry` as the Python `extract_media` for an equivalent input.
- **Harvester** (integration, gated/manual): against a recorded CDP response fixture, verify parse → ingest without a live Instagram call in CI.
- **Runner regression:** collect step no longer writes `SourceItem[]` to `metadata.json`; dashboard enrichment resolves real `pk`s.

---

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Headless Chrome served a login wall / challenge by IG | Real UA + persisted logged-in profile; detect + surface re-login; fall back to headed off-screen if needed (plan). |
| Scheduled browser itself accrues a block | Incremental depth only (first page, no deep pagination); genuine web-client fingerprint; low Mon/Thu cadence. |
| `video_url` signed-URL expiry before download | Download immediately after capture, same run, while the URL is fresh. |
| instagrapi generator API for `"saved"` differs across versions | Plan pins the exact call against installed 2.3.0; cold-start path reuses today's known-good `amount=0`. |
| Agents re-process the whole corpus each run (cost) | Verify skip-existing behaviour in the plan; collector returns only-new items to the pipeline. |

---

## Decisions locked

- Two paths: incremental instagrapi (headless daily) + scheduled-Chrome piggyback (block-resistant primary).
- Single `ingestMetadata` union point; `metadata.json` becomes canonical accumulating `MetadataEntry[]`.
- Path 2 = CDP-driven headless Chrome on a dedicated logged-in profile, launchd Mon/Thu; **no** HTTP ingest endpoint.
- Ship order: **Plan 1 (foundation + incremental)** then **Plan 2 (piggyback)**.

## Open items (resolved during planning, not blocking)

- Exact instagrapi paginating primitive for `"saved"`.
- Whether the existing agents already skip already-processed filenames (determines only-new vs all-items into the pipeline).
- Headless vs headed-off-screen for the harvester if IG resists headless.

---

## Build sequence

1. **Plan 1 — foundation + incremental** (headless, no browser, testable in CI): `ingestMetadata`, runner de-clobber + in-memory item threading, `collect_metadata.py` incremental walk + staging file, `download_videos.py` staging read, tests. Ships the volume win and fixes the enrichment bug.
2. **Plan 2 — scheduled-Chrome piggyback** (on the same ingest layer): CDP harvester, `extract_media` JS port, dedicated-profile setup docs, launchd job, tests. Ships the durable block-resistant primary.
