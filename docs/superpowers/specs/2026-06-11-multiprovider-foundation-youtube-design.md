# Multi-Provider Ingestion — Phase 1: Source-Agnostic Foundation + YouTube

**Date:** 2026-06-11
**Status:** Design approved, ready for implementation plan
**Phase:** 1 of 3 (Phase 2 = Instagram→TS migration · Phase 3 = X/Twitter)

---

## Goal

Make the Dopamine pipeline ingest content from **multiple sources** and route **different content kinds** to different extraction paths — delivering YouTube liked-videos with **real transcripts** as the first new source, without regressing the existing Instagram pipeline.

## Background — current state (all Instagram-hardcoded)

The pipeline is a 16-step run (`src/pipeline/runner.ts`). Today every item is assumed to be a downloadable vertical `.mp4` reel from one Instagram "saved" collection. There is **no** `source` / `provider` / `content_type` concept anywhere in the schema chain.

The 16 steps split cleanly into two halves:

- **Front-end (steps 0–5): source/asset-specific.** Metadata collection (Python `instagrapi`), video download (Python), properties (ffprobe), classification, knowledge extraction, link extraction.
- **Tail (steps 6–15): already type-agnostic.** Link resolution → catalog → organize → markdown → analysis → research → implement → verify → enrich → dashboard. These consume `knowledge_base.json` and don't care where an item came from (the only coupling is the `instagram_user` field in catalog/dashboard).

Key facts that shape the design (verified against the code):

- **Knowledge extraction is frames-only** (`src/agents/knowledge.ts`): ffmpeg pulls ≤10 frames → Gemini vision. There is **no audio/transcript path** — the prompt explicitly tells the model "Audio/speech is not available." This is the quality ceiling YouTube captions will lift.
- **Processing source-of-truth is a filesystem scan.** `runClassifierAgent` and `runPropertiesAgent` iterate `getVideoFiles(CONFIG.VIDEOS_DIR)` — a hard `.mp4`-suffix filter (`src/utils/video.ts`). `runKnowledgeAgent` iterates the resulting `classifications.json`. So "what gets processed" = "what `.mp4` files exist on disk."
- **Keys are filenames.** `classifications.json` and `knowledge_base.json` are keyed by the on-disk filename `{username}_{pk}.mp4`. The pk is recovered via `extractPkFromFilename()` (a numeric-only regex). The dashboard per-video JSON is named from that id.
- **The model calls already branch on input shape.** Both `classifier.ts` and `knowledge.ts` already choose between `{ text, images }` and `{ text, files }` / `{ text, images:[thumb] }`. Adding a `{ text }`-only (transcript) branch is a natural extension of an existing pattern (the `useThumbnail` boolean).
- **One shared Vertex rate limiter.** The runner comment explicitly forbids parallelizing classification/knowledge/link-extraction because they share the NeuroLink instance + rate limiter.

## Non-goals (explicitly out of scope for Phase 1)

- **Instagram→TS migration.** IG stays on the existing Python `instagrapi` scripts, wrapped behind the new TS `SourceCollector` interface. Migration is Phase 2 (risk-managed, parity-tested).
- **X / Twitter.** Phase 3.
- **`text_post`, `image_post`, `article_link`.** Reserved in the type enums; not implemented. IG remains `short_video`-only (no carousel-image handling).
- **Named YouTube playlists / Watch Later.** v1 = **liked videos only**. (Watch Later is permanently API-inaccessible; named playlists are a trivial future add — same `playlistItems.list` call.)
- **No model-throughput change.** See "Honest concurrency boundary" below.

---

## Locked decisions (with rationale)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Phase 1 = Foundation + YouTube.** IG wrapped, not rewritten. | Deliver the new capability + transcript quality win first; isolate the risky IG swap. |
| D2 | **Pure TypeScript for all new code.** `yt-dlp`/`ffmpeg` are external **binaries** (invoked via `child_process`, like `ffprobe` already is), not Python in our repo. | End-to-end strict types on the unified model, shared rate-limiter/state/logger, vitest-testable, matches project TS preference. |
| D3 | **YouTube auth = hybrid:** Data API v3 (OAuth refresh token) for enumeration + `yt-dlp` for captions/download. | API enumeration is reliable, ToS-clean, cheap (~11 quota units / 500 likes; 10k/day free), and the owner can read their own private likes. yt-dlp is the robust path for captions + media. |
| D4 | **Smart download:** transcript **always**; download mp4 **only** when `duration ≤ YT_DOWNLOAD_MAX_SECONDS` (default 300). | Liked videos can be hour-long; never store huge files. Keeps frame-analysis capability for short/caption-less clips. |
| D5 | **Architecture = parallel per-type acquisition lanes → shared extraction core → shared tail.** | User-selected. Structural per-type separation + concurrent I/O, without duplicating the Gemini logic. |
| D6 | **Processing source-of-truth shifts** from `getVideoFiles()` filesystem scan → the unified item list in `metadata.json`. | Long videos (and future text posts) have **no mp4**; the pipeline must iterate items, not files. The lane decides how to produce the AI input. |
| D7 | **IG keeps its legacy id/key format** (`{username}_{pk}.mp4`); YouTube uses `youtube_{videoId}`. | The committed 384-video `knowledge_base.json` / dashboard are keyed by the IG filenames. Changing them is a massive regression. The id is treated as an opaque stable key. |

---

## Architecture

```
STEP 0  Collect (SourceCollector per source, run concurrently)
        ├ instagram.collect()  → SourceItem{ source:"instagram", content_type:"short_video" }   (wraps Python)
        └ youtube.collect()    → SourceItem{ source:"youtube",   content_type:"short|long_video" } (pure TS)
                    ↓  unified metadata.json  (array of SourceItem, tagged by source + content_type)

STEP 1–5  Per-type ACQUISITION LANES  (src/pipeline/lanes.ts; concurrent I/O)
        ├ short_video lane → mp4 (igrapi / yt-dlp) + captions → AcquiredAssets{ videoPath (+ transcriptText) }
        └ long_video  lane → captions (yt-dlp → VTT→text)     → AcquiredAssets{ transcriptText, videoPath:null }
                    ↓  each item carries AcquiredAssets (or is skipped if acquire() → null)

        SHARED EXTRACTION CORE  (one code path per agent, globally Vertex-rate-limited)
        classify · knowledge · link-extract — each builds its model input from AcquiredAssets
                    ↓  merged classifications.json · knowledge_base.json · links_v2.json

STEP 6–15  SHARED TAIL  (UNCHANGED)
        link-resolve → catalog → organize → markdown
        → analysis → research → implement → verify → enrich → dashboard
```

**Core idea:** a *lane* owns **acquisition** (resolving the mp4 and/or captions per item). Each Gemini agent then builds its model input from a uniform `AcquiredAssets` — frames from `videoPath`, the real `transcriptText`, or the thumbnail. This gives the parallel per-type structure **without duplicating the model logic** (each agent has one small branch, exactly like today's `useThumbnail`), and the `long_video` lane feeds real transcripts into the core via a transcript-specific prompt.

### Honest concurrency boundary ⚠️

The lanes run **acquisition I/O concurrently** (IG downloads while YouTube captions fetch). But the **model calls remain governed by one shared Vertex rate limiter** — classification/knowledge/link-extraction interleave at the model layer; they do **not** run N× faster. The wins are: concurrent downloads, structural clarity, and dramatically better input quality (real transcripts), **not** raw model throughput. The spec states this plainly rather than implying a speedup that does not exist.

---

## Data model

### New shared types (`src/types/index.ts`)

```ts
export type SourceKind  = "instagram" | "youtube";          // reserved: "twitter" | "article"
export type ContentType = "short_video" | "long_video";     // reserved: "text_post" | "image_post" | "article_link"

/** Source-agnostic assets the lane resolves per item. Each agent builds its OWN model
 *  input from whatever is present — so the classifier keeps its 3-frame count and knowledge
 *  its 10-frame count (no regression), while a real transcript is an ADDITIONAL signal that
 *  can coexist with frames (short YouTube clips carry both). */
export interface AcquiredAssets {
  videoPath: string | null;       // local mp4 (IG reel, or short YouTube clip) → frames; null for transcript-only items
  thumbnailPath: string | null;   // fallback image when no/over-threshold video
  transcriptText: string | null;  // real captions (YouTube) → authoritative `transcript`; null for IG (frames-only)
}

/** Source-agnostic item record — the unified entry written to metadata.json. */
export interface SourceItem {
  id: string;                 // opaque stable key + knowledge_base key. IG: "{username}_{pk}.mp4" (legacy); YT: "youtube_{videoId}"
  source: SourceKind;
  content_type: ContentType;
  title: string | null;       // YT title; IG null (uses caption)
  author: string | null;      // YT channel / IG username — replaces hardcoded instagram_user downstream
  caption_text: string | null;
  url: string | null;         // canonical permalink (YT watch URL / IG permalink)
  thumbnail_url: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  // source-specific extras retained for downstream compatibility:
  ig?: MetadataEntry;         // full legacy IG record (so existing IG-coupled code keeps working unchanged)
  yt?: { videoId: string; channelId: string | null; caption_file: string | null };
}
```

`MetadataEntry` (the existing IG shape) is **unchanged** and nested under `SourceItem.ig` so every Instagram-coupled consumer keeps reading exactly what it reads today.

### Schema deltas (additive, no breaking changes)

- `ClassificationEntry` (`src/agents/classifier.ts`): add `source`, `content_type` (propagated, not model-derived).
- `KnowledgeEntry` (`src/agents/knowledge.ts`): add `source`, `content_type`. **`KnowledgeSchema` (Zod) is unchanged** — its 5 fields (`transcript`, `visual_description`, `links_and_resources`, `key_takeaways`, `topics`) are already universal; for `long_video`, `transcript` simply carries the real caption text.
- `CatalogRecord` (`src/agents/catalog.ts`): add `source`, `content_type`, generic `author`. **Keep** `instagram_user` populated for IG items (dashboard back-compat); set it to `""` for non-IG.
- `dashboard/data-builder.ts`: surface `source`/`content_type`/`author` in the per-video JSON; fall back to `author` when `instagram_user` is empty.

### Id / filename / asset layout

| Source | `id` (knowledge_base key) | Asset(s) on disk |
|--------|---------------------------|------------------|
| Instagram (legacy, unchanged) | `{username}_{pk}.mp4` | `videos/{user}_saved/{username}_{pk}.mp4` |
| YouTube `short_video` | `youtube_{videoId}` | `videos/youtube/youtube_{videoId}.mp4` + `videos/youtube/youtube_{videoId}.txt` (transcript) |
| YouTube `long_video` | `youtube_{videoId}` | `videos/youtube/youtube_{videoId}.txt` (transcript only; **no mp4**) |

`extractPkFromFilename()`'s numeric-only assumption is bypassed for non-IG items: the YouTube collector sets `id` directly, so no filename parsing is needed.

---

## Components (all TypeScript; `yt-dlp` + `ffmpeg` are external binaries)

| File | New/Edit | Responsibility |
|------|----------|----------------|
| `src/types/index.ts` | edit | Add `SourceKind`, `ContentType`, `AcquiredAssets`, `SourceItem`. |
| `src/sources/types.ts` | new | `SourceCollector` contract (functional): `collect(): Promise<SourceItem[]>` and `acquire(item): Promise<AcquiredAssets \| null>` (null ⇒ skip). |
| `src/sources/registry.ts` | new | Map `SourceKind → SourceCollector`; the metadata step iterates enabled sources. Sources toggled via env (`SOURCES=instagram,youtube`). |
| `src/sources/instagram/collector.ts` | new | Implements `SourceCollector` by **wrapping the existing Python scripts** via `child_process` (collect + download), mapping `MetadataEntry → SourceItem` (`content_type:"short_video"`, nest `ig`). `acquire()` returns `{ videoPath:<mp4>, thumbnailPath, transcriptText:null }`, or `null` if no mp4 on disk (preserves today's "video files only" filter). |
| `src/sources/youtube/auth.ts` (+ `npm run youtube:auth`) | new | One-time OAuth 2.0 installed-app consent flow (`googleapis`); writes `YOUTUBE_REFRESH_TOKEN` to `.env`. Idempotent: no-op if a valid token already present. |
| `src/sources/youtube/collector.ts` | new | `googleapis`: refresh access token → `videos.list(myRating="like")` (paginated) → `SourceItem[]`. Sets `content_type` by `duration_seconds` vs `YT_DOWNLOAD_MAX_SECONDS`. Incremental dedup via a `youtube_known_ids.json` state file. |
| `src/sources/youtube/download.ts` | new | Per item: `yt-dlp --write-subs --write-auto-subs --sub-langs en --skip-download` → `.vtt`; `vttToText()` → `.txt`. If `content_type==="short_video"`, also `yt-dlp -f mp4` the video. `youtube-transcript`/`youtubei.js` is the secondary fallback when no subs file is produced. `acquire()` returns `{ videoPath:<mp4 or null>, thumbnailPath, transcriptText:<captions> }` — short clips carry **both** (frames + real transcript); long videos carry transcript only. |
| `src/utils/vtt.ts` | new | Pure `vttToText(vtt: string): string` (strip cue timings/tags, dedupe rolling-caption lines). Unit-tested in isolation. |
| `src/pipeline/lanes.ts` | new | Load `SourceItem[]`; partition by `content_type`; for each lane call the source's `acquire()` concurrently (bounded); yield `(item, AcquiredAssets)` pairs. Skips items whose `acquire()` returns `null`. |
| `src/agents/classifier.ts` | edit | Iterate the **item list** (not `getVideoFiles`); take `AcquiredAssets` from the lane. Build input as today (3 frames from `videoPath`, else thumbnail); when `videoPath` is null, classify from a text prompt built from `transcriptText`. Propagate `source`/`content_type`. |
| `src/agents/knowledge.ts` | edit | Take `AcquiredAssets`. When `transcriptText` is present it is **authoritative** for the `transcript` field (injected directly, not model-echoed); still extract 10 frames from `videoPath` for `visual_description` when an mp4 exists (short YT = frames **+** transcript). Transcript-only items (long YT) skip frames and use a "you have the full transcript" prompt. IG (no `transcriptText`, mp4 present) = unchanged frames-only path → **byte-identical**. |
| `src/agents/link-extractor.ts` | edit | Take `AcquiredAssets`; when `videoPath` is null, parse links from `transcriptText`/caption instead of frames. |
| `src/agents/catalog.ts` · `src/dashboard/data-builder.ts` | edit | Add `source`/`content_type`/`author`; keep `instagram_user` for IG. |
| `src/pipeline/config.ts` | edit | Add `YT_DOWNLOAD_MAX_SECONDS` (300), `SOURCES`, `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN`, `YOUTUBE_VIDEOS_DIR` (`videos/youtube`). |
| `src/pipeline/runner.ts` | edit | Step 0 → run all enabled collectors (concurrent). Steps 1–5 → driven by `lanes.ts`. Steps 6–15 unchanged. Update the 0-indexed step doc comment. |

---

## Data flow (end to end)

**YouTube long video (e.g., a 40-min talk):**
1. `collect()`: Data API lists it as a like → `SourceItem{ source:"youtube", content_type:"long_video", duration_seconds:2400, id:"youtube_abc123" }`.
2. `long_video` lane `acquire()`: `yt-dlp` fetches `en` captions → `.vtt` → `vttToText()` → `.txt`; **no mp4**. Returns `AcquiredAssets{ videoPath:null, transcriptText:<captions> }`.
3. Shared core: classifier (text prompt from captions) → category; knowledge → `transcript`=real captions (injected), `visual_description`=description, takeaways/topics/links from the real spoken content; link-extractor → links from caption text.
4. Tail (unchanged): resolve links → catalog (`author`=channel) → analysis/research/verify → dashboard (links to the YouTube player via `url`; thumbnail from `thumbnail_url`).

**YouTube short clip (≤300s):** same, but `acquire()` also downloads the mp4 → `AcquiredAssets{ videoPath:<mp4>, transcriptText:<captions> }`. Knowledge uses the real captions for `transcript` **and** 10 frames for `visual_description`.

**Instagram reel (unchanged):** `collect()` wraps the Python scripts → `SourceItem` (nest `ig`); `acquire()` returns `AcquiredAssets{ videoPath:<mp4>, transcriptText:null }` → byte-identical frames path downstream.

---

## Error handling & edge cases

- **OAuth token expired/revoked:** collector throws a clear, actionable error ("run `npm run youtube:auth`"); the runner records the step failure (existing visible-warning machinery) and the rest of the pipeline proceeds on existing state. Never silently produces empty data.
- **`yt-dlp` missing:** preflight check with an install hint (`brew install yt-dlp`); fail the YouTube lane only, not the IG lane.
- **Video has no captions at all:** `short_video` → falls back to frames (mp4 was downloaded). `long_video` (no mp4) → extract from title + description + thumbnail; if still thin, mark `low_content` (the existing thin-content mechanism), so it doesn't re-extract forever. Logged honestly; expected to be rare for saved/educational content.
- **yt-dlp transient failure / bot-check:** retries with `--extractor-retries`; on persistent failure the item is skipped (no partial/corrupt record) and re-attempted next run.
- **Vertex rate limit:** unchanged — the shared limiter + `exponentialBackoff` already handle it; lanes don't increase model concurrency.
- **Private/age-restricted likes:** yt-dlp uses `--cookies-from-browser` (same browser-session pattern as IG) when needed.

## No-regression strategy (Instagram)

The IG path must be **behavior-preserving**. Guarantees:
- IG items expose `AcquiredAssets{ videoPath:<mp4>, transcriptText:null }`; with `transcriptText` null, every Gemini agent runs its existing frames branch unchanged (same 3-frame classify / 10-frame knowledge counts, same thumbnail fallback, same `VIDEO_SIZE_THRESHOLD`).
- IG ids/keys stay `{username}_{pk}.mp4`.
- IG `acquire()→null` (no mp4 on disk) reproduces today's `getVideoFiles()` "videos only" filter.

**Verification:** re-run steps 3–5 over the existing 384 videos and **diff `knowledge_base.json`** against the committed `d19c90b`/`5f2597c` baseline — must be empty (modulo intended new `source`/`content_type` fields). This diff is a required gate before the PR.

## Testing strategy (TDD)

- **Unit (pure, fast):** `vttToText()` (timing/tag strip, rolling-caption dedupe) · duration→`content_type` boundary (`≤300`/`>300`) · `id`/asset-path derivation per source · `SourceItem` mapping from a YT API fixture and an IG `MetadataEntry` fixture · each agent builds the correct NeuroLink input from `AcquiredAssets` — frames when `videoPath` set, text-only when only `transcriptText`, both for short YT, thumbnail fallback (model mocked).
- **Contract:** each `SourceCollector` returns records conforming to `SourceItem` (zod-validated in tests).
- **Regression:** the IG `knowledge_base.json` diff gate above.
- **Live smoke (manual, documented):** `npm run youtube:auth` once, then ingest ~3 real liked videos end-to-end; confirm transcript-based knowledge + dashboard render + console clean.

## Configuration / new env vars

```
SOURCES=instagram,youtube           # which collectors to run (default: instagram only, until YT auth is set up)
YT_DOWNLOAD_MAX_SECONDS=300         # download mp4 only for clips at/under this; longer = transcript-only
YOUTUBE_CLIENT_ID=...               # Google Cloud OAuth 2.0 client (Desktop app)
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...           # written by `npm run youtube:auth`
```

One-time manual setup (documented in the plan): create a Google Cloud project, enable **YouTube Data API v3**, create an **OAuth 2.0 Client ID (Desktop app)**, put client id/secret in `.env`, run `npm run youtube:auth` and consent with the Google account that owns the liked videos.

---

## Risks & future phases

- **yt-dlp fragility:** YouTube-side changes break extractors periodically → mitigation: `yt-dlp -U` reminder in docs + the `youtube-transcript`/`youtubei.js` fallback + skip-and-retry-next-run semantics.
- **`instagram-private-api` maturity (Phase 2):** the IG→TS migration is deferred precisely because it's risky; it will be parity-tested against the Phase-1 known-good output before the Python scripts are retired.
- **Phase 2:** Instagram→TS migration (parity-gated). **Phase 3:** X/Twitter (`twitter-api-v2` official, or `agent-twitter-client`/`rettiwt-api` cookie scraping) + the `text_post` lane. `image_post` / `article_link` lanes land alongside whichever phase first needs them; their types are already reserved here.
