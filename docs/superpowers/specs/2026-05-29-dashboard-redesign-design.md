# Dopamine Dashboard Redesign — Design Spec

- **Date:** 2026-05-29
- **Status:** Approved (brainstorming complete)
- **Author:** Sachin Sharma (with Claude)
- **Branch:** `feat/dashboard-redesign`

## 1. Context & Problem

Dopamine ingests Instagram saved videos and runs a 16-step pipeline that produces a rich,
highly-related dataset (375 videos as of this spec): classifications, catalog, metadata,
knowledge-base extraction (transcript, visual description, takeaways, topics), analysis
(actionable items), research (URL status), verification (per-item + overall), and 5,063
extracted links.

The current dashboard (`src/agents/dashboard.ts`, ~1,400 lines) generates a single 2.2 MB
`dashboard/index.html` with gzip-embedded data and inline CSS/JS. It works, but:

- **Three disconnected tabs** (Videos / Knowledge Base / Verification) with **no cross-linking
  between items** — `@username`, tags, and category are display-only, not navigable.
- **No URL routing** — cannot deep-link or share a video/entry; refresh loses state.
- **Weak mobile** — only two breakpoints, sticky bar eats the viewport, category pills overflow
  into a tiny scroll box.
- **No scaling story** — all 300+ items in the DOM at once; single-expand re-renders the whole grid.
- **Stats don't update on filter; Verification tab has no category filter.**

## 2. Goals / Non-Goals

### Goals
- A connected, cross-linked experience: from any item, jump to its knowledge, creator, category,
  tags, related videos, and the tools it mentions.
- Aesthetic, calm, "refined dark control-room" visual design.
- Web-first, fully responsive down to mobile.
- Real, shareable URLs (deep-linking + back/forward).
- Preserve the operational reliability restored on 2026-05-29 (node_modules/npm, launchd server,
  daily cron) — the daily job must NOT depend on a frontend build.

### Non-Goals
- No change to the upstream ingestion/analysis pipeline (steps 1–10, 12–16).
- No re-running of AI classification/verification (data is current).
- No light theme in v1 (dark-only; revisit later).
- No auth / multi-user / write features — read-only browsing tool.

## 3. Decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| Architecture | **SvelteKit** app, `adapter-static` (SPA mode), built into `dashboard/` |
| Visual direction | **Refined dark control-room** |
| Home/default view | **Discover & browse** |
| Accent color | **Amber `#f0a868`** (category colors retained as secondary) |
| Theme | **Dark-only** in v1 |
| Data delivery | Static JSON (compact index + per-video detail), regenerated daily |
| Build cadence | App built on UI change (`dashboard:build`); data refreshed daily (build-free) |

## 4. Architecture — build/data split

The central principle: **separate "ship the app" from "refresh the data"** so the daily cron
stays a cheap, build-free data refresh and reliability is preserved.

- **App** — SvelteKit project at `web/`, built with `@sveltejs/adapter-static` (SPA fallback) into
  `dashboard/`. Built only when UI code changes (`npm run dashboard:build`). Output committed so the
  server always has a working app.
- **Data builder** — replaces the body of pipeline **step 11**. Reads `videos/*.json`, computes a
  normalized model + derived indexes + related links, writes static JSON to `dashboard/data/`.
  Pure Node, no `vite`, fast. Runs daily.
- **Server** — `src/server/dashboard-server.ts` serves the static app, `dashboard/data/*`,
  `videos/thumbnails/*`, and the video files, with **SPA fallback** (serve `index.html` for unknown
  client routes). launchd `com.dopamine.dashboard` job unchanged (still serving a static dir).

## 5. Information Architecture & Routes

| Route | Purpose |
|-------|---------|
| `/` | Discover & browse home: recent videos, category tiles, top creators, trending tags, verified-tools peek, global search |
| `/videos` | Full library grid — search, category/sort/verification filters |
| `/video/[id]` | Unified entity page — player, meta, takeaways, transcript, on-screen description, actionable items + verification, links, related rail |
| `/creator/[name]` | All videos by a creator |
| `/category/[cat]` | One category's videos |
| `/tag/[tag]` | All videos for a tag |
| `/tools` | Verified actionable items across the corpus, filter by what works |
| `/kb` | Reading-optimized knowledge browse |
| `/search?q=` | Global full-text search (transcripts, takeaways, tools, tags) |

`[id]` = the video filename stem (`{username}_{pk}`), URL-encoded. The three old tabs collapse:
Videos → `/videos` + `/video/[id]`; Knowledge Base → sections on `/video/[id]` + `/kb`;
Verification → per-item badges + `/tools`.

## 6. Cross-Linking Model

Everything currently display-only becomes navigable. On `/video/[id]`:

- Creator `@name` → `/creator/[name]`
- Category chip → `/category/[cat]`
- Each tag chip → `/tag/[tag]`
- Each actionable tool → external URL **and** back-link to other videos mentioning the same tool
- Related rail → 6–8 similar videos (build-time computed)
- Knowledge + verification are sections on the same page (in-page tabs/anchors) — no context loss

Reverse links: creator/category/tag pages link to member videos; `/tools` links each tool back to
its source video and that video's KB.

## 7. Data Model & Derived Indexes

Join key across all state files: filename `{username}_{pk}.mp4` (4 hash-only exceptions handled).

### Outputs (written by the data builder to `dashboard/data/`)
- `index.json` (gzipped): compact records for list/grid/search — `id, title, username, fullName,
  category, subcategory, tags[], thumb, date, likes, durationSec, verification, implementability,
  usefulness`.
- `video/<id>.json`: full detail — transcript, visualDescription, keyTakeaways[], topics[],
  actionableItems[] (with research/verification merged per item), links[], relatedIds[], videoPath.
- `facets.json`: precomputed `categories[]` (name,count,color), `creators[]` (name,count),
  `tags[]` (name,count) for browse pages.
- `tools.json`: corpus-wide verified actionable items with source video id + url_status.
- `meta.json`: totals, generatedAt, counts.

### Related-videos algorithm (deterministic, build-time)
For each video, score every other video:
`score = 3*sharedTags + 2*sharedTopics + 2*(sameCategory) + 1*(sameCreator) + 1*sharedToolUrls`
(sharedTags/topics = set intersection size). Take top 8 by score (ties broken by recency).
Store as `relatedIds` in the detail JSON. No external calls.

### Video file path
Resolve actual media dir at build time (do NOT hardcode `<username>_saved/`). Emit `videoPath`
per entry relative to the server media root; gracefully omit if the file is missing.

## 8. Visual System — Refined Dark Control-Room

### Tokens
- Background base `#0b0d10`, surface `#14171c`, elevated `#1c2026`, hairline border `#262b33`.
- Text primary `#e8ebef`, muted `#9aa3ad`, faint `#6b7480`.
- Accent (interactive/active) amber `#f0a868`; accent-press `#e0945a`.
- Category colors: keep existing 12-color map as quiet secondary accents (chips/badges only).
- Verification: useful `#3fb950`, partial `#d29922`, not-verified `#8b949e`, outdated `#f85149`.
- Radius: 10px cards, 999px chips. Shadows: subtle, low-opacity. Motion: 120–180ms ease.

### Type
- Inter (or system UI stack fallback). Modular scale (e.g. 12/14/16/20/26/34). Tight headings,
  comfortable transcript body (line-height ~1.6, measure ~70ch).

### Components
- Top bar (logo + global search + nav), cards (border + hover lift), clickable chips,
  verification badges, breadcrumbs, related rail, collapsible sections, empty/loading states.

## 9. Responsive Strategy

- Web-first; content max-width ~1200–1320px.
- Breakpoints ~640 / ~900 / ~1200. Library grid 1→2→3→4 cols. Detail page: main + related sidebar
  (desktop) → stacked (mobile).
- Mobile: condensed top bar (logo + search icon + menu), 44px touch targets, inline video playback,
  facets as collapsible sections.
- Fluid type/spacing via `clamp()`.

## 10. Performance
- Compact `index.json` powers all lists/search (instant, no heavy payload).
- Per-video detail fetched on demand.
- Windowed/virtualized long lists (no 300+ DOM nodes at once).
- Gzip data assets; lazy-load thumbnails; route-level code splitting (SvelteKit default).

## 11. Project Structure
```
web/                      # SvelteKit app (source)
  src/routes/…            # pages per §5
  src/lib/components/…    # shared components
  src/lib/data.ts         # client data access (fetch index/detail)
  src/lib/theme.css       # tokens
  svelte.config.js        # adapter-static, SPA fallback
dashboard/                # BUILT app output (served) + data/
  data/…                  # JSON written by data builder
src/agents/dashboard.ts   # replaced by data-builder (step 11)
src/server/dashboard-server.ts  # serve static app + data + media, SPA fallback
```

## 12. Build, Deploy & Reliability
- New script `dashboard:build` → `vite build` of `web/` into `dashboard/`.
- Step 11 → data builder only (no vite). Daily cron unaffected.
- Server serves built app + data + media with SPA fallback; launchd unchanged.
- New devDeps via npm (matches the standardized `package-lock.json`): `@sveltejs/kit`, `svelte`,
  `vite`, `@sveltejs/adapter-static`, `svelte-check`.

## 13. Migration
- Retire the monolithic HTML generator; keep git history.
- `dashboard/index.html` becomes the SvelteKit build artifact.
- Verify `/` (overview) still resolves (either redirect to the app home or fold overview into `/`).

## 14. Verification Plan (Chrome MCP)
Before verifying: clean single-instance browser reset (kill stale chrome-devtools-mcp Chrome +
clear profile lock). Then:
1. Desktop (1440×900) + mobile (390×844) screenshots of `/`, `/videos`, a `/video/[id]`,
   `/creator/[name]`, `/category/[cat]`, `/tools`.
2. Click-through: video → creator → back; video → tag → category; tool → source video.
3. Deep-link + refresh test (open `/video/[id]` directly; refresh keeps state).
4. Console-error check (no errors); network check (data assets load).
5. Responsive sanity at 390 / 768 / 1280.

## 15. Risks & Mitigations
- **Daily reliability regression** → data/app split; cron never builds.
- **Data payload size** → compact index + on-demand detail + gzip.
- **SPA fallback on the static server** → explicit fallback route in `dashboard-server.ts` + test.
- **Browser MCP contention** → single-instance reset before verification.
- **node_modules hygiene** → ensure `.gitignore` covers `node_modules/` and build caches.

## 16. Out of Scope / Future
- Light theme toggle; saved filters/bookmarks; tag normalization; precomputed embeddings-based
  similarity; serving the raw `.mp4`s behind auth.
