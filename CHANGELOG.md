## 1.0.0 (2026-06-26)

### Features

*  add auto-implementation and verification pipeline (Steps 12-16) ([66fa631](https://github.com/juspay/dopamine/commit/66fa631cdd23d092030fd65b6bf5d7cdecec1013))
*  add Chrome cookie auto-import as auth fallback ([bc77bc2](https://github.com/juspay/dopamine/commit/bc77bc2739900bf9b26dea18ec7986af25376167))
*  agent swarm improvements — 10 parallel teams ([97a8ec6](https://github.com/juspay/dopamine/commit/97a8ec652c693cd5438a012b05eb7dac5d4fb979))
*  switch to gemini-3.1-flash-image-preview ([7fee055](https://github.com/juspay/dopamine/commit/7fee05570683c461b5e98ba26590259d8f660b7d))
*  upgrade default model to gemini-2.5-flash ([4bf2316](https://github.com/juspay/dopamine/commit/4bf23166de0905c6dff0691cdf08dfc3972a6086))
*  upgrade to Gemini 3.1 Flash and make model configurable ([39fdeaa](https://github.com/juspay/dopamine/commit/39fdeaae1037203d0a59165539c7a2e7d2c5b575))
*  upgrade to Gemini 3.1 Pro on global Vertex endpoint ([91a461d](https://github.com/juspay/dopamine/commit/91a461d40201f7d795aba88886645cb8ba113d85))
* **(agents):**  add buildClassifyRequest + buildLinkRequest; route inputs through AcquiredAssets ([bac4877](https://github.com/juspay/dopamine/commit/bac48778f85225a9445069a7df9b5a03c38ed7c8))
* **(catalog):**  add source/content_type/author; surface in dashboard data ([dc84417](https://github.com/juspay/dopamine/commit/dc8441710bd533a94d0cea228fece9d97a2a4741))
* **(config):**  add SOURCES, YT_DOWNLOAD_MAX_SECONDS, YOUTUBE creds, youtube dirs/state ([234d987](https://github.com/juspay/dopamine/commit/234d98774e2729b11450c5872c1136951e732010))
* **(instagram):**  add SourceItem mapper + collector wrapping the Python scrapers ([ce52ab0](https://github.com/juspay/dopamine/commit/ce52ab0e13b8fa6a279f9828b11b5e4afc17e78d))
* **(knowledge):**  export buildKnowledgeRequest; wire transcriptOverride + lane assets ([4fd30fc](https://github.com/juspay/dopamine/commit/4fd30fcf9ae79f59bdb01a91d5e66d3a04eb4c3d))
* **(pipeline):**  add LaneItem + acquireAll with bounded concurrency ([4d2a0e4](https://github.com/juspay/dopamine/commit/4d2a0e4a1fd6c5c7af75c57b4c2e1f1e2d9d6fcd))
* **(runner):**  wire collection + acquisition lanes; process YouTube via laneItems ([b7bb0ff](https://github.com/juspay/dopamine/commit/b7bb0fff265654c3b20db6993011a31ff83f51f4))
* **(sources):**  add registry (getEnabledCollectors) over SOURCES env ([920bba4](https://github.com/juspay/dopamine/commit/920bba41d07edaf4b93f866fc2c949aeeb95af9f))
* **(sources):**  add SourceCollector contract (collect + acquire) ([662453c](https://github.com/juspay/dopamine/commit/662453c72ba3c73f679c6959c92f2413ba66ebf5))
* **(types):**  add SourceKind, ContentType, AcquiredAssets, SourceItem ([6519ce6](https://github.com/juspay/dopamine/commit/6519ce623ce53330495b814578f0846d332d26ae))
* **(utils):**  add vttToText WebVTT-to-plain-text converter ([780f844](https://github.com/juspay/dopamine/commit/780f844fa8e0f23ca7198f985ffbaf60751f0172))
* **(web):**  9 routes + SPA-fallback server + compression (Phases 3-4) ([3113c21](https://github.com/juspay/dopamine/commit/3113c2115064f9a374556fde19d3cec344195528))
* **(web):**  add /creators index; strict-TS route params + line-clamp compat ([89f2ce6](https://github.com/juspay/dopamine/commit/89f2ce6a249237c7858ee1467a7c4bce68111295))
* **(web):**  adopt @juspay/svelte-ui-components — theme bridge + design-system audit ([4ea7d67](https://github.com/juspay/dopamine/commit/4ea7d67a0f5ec280b699521e5d0c4e664728d21d))
* **(web):**  data builder + shell + shared components (Phases 1-2) ([2f5f2f4](https://github.com/juspay/dopamine/commit/2f5f2f473983d7cbf56917391289d2e73bf95b11))
* **(web):**  reuse svelte-ui-components; fix thumbnails + search box ([f9d6f57](https://github.com/juspay/dopamine/commit/f9d6f571fba8370aae30723b5162e72909150f86))
* **(web):**  scaffold SvelteKit static app (Phase 0) ([a583600](https://github.com/juspay/dopamine/commit/a583600fbb986594d2bc656abd576c9b82b55f66))
* **(youtube):**  add collector (with known-id dedup) + per-item download/acquire ([6ccd534](https://github.com/juspay/dopamine/commit/6ccd534ac6a8d57f84e517d46333dd6343ba7b39))
* **(youtube):**  add pure mappers deriveContentType, youtubeId, mapYtVideo ([201e499](https://github.com/juspay/dopamine/commit/201e4996aa2529db1e3bfc67fbdb296cef12bf33))
* **(youtube):**  add yt-dlp arg builders + OAuth client (writes refresh token to .env) ([bcdae8c](https://github.com/juspay/dopamine/commit/bcdae8c6ad05f8ad48bbdef104a962ce5e4ea271))

### Bug Fixes

*  launchd PATH missing pnpm dir + add react dependency ([911c238](https://github.com/juspay/dopamine/commit/911c238837605e6df5569cf565ec0c258c9b10d1))
*  launchd pipeline now builds before running ([bec420d](https://github.com/juspay/dopamine/commit/bec420dfb4475d21c860053b9a3e7be5cf9baab8))
*  pipeline continues on step failure instead of crashing ([acb954c](https://github.com/juspay/dopamine/commit/acb954c7a31231b3265ffd08a0916c9abbd5a62a))
*  recover 64 missing videos and fix download bugs ([1531967](https://github.com/juspay/dopamine/commit/1531967ef1f1d2f41fbd564bd9a06184f1f0bdea))
*  resolve all pipeline silent failures ([4701998](https://github.com/juspay/dopamine/commit/47019981488bb70efb1a751f4b2e4b5b41011023))
*  revert to gemini-2.0-flash and add Vertex AI env config ([76d913a](https://github.com/juspay/dopamine/commit/76d913a8345ffed5bac501ce4bf2c713d1c27bea))
*  stop calling login() on every run to prevent Instagram rate limits ([ee67b75](https://github.com/juspay/dopamine/commit/ee67b7593dfbbc49a69b6160563c4819582bb5ca))
*  web-grounded research, dashboard UX, launchd reliability ([f980977](https://github.com/juspay/dopamine/commit/f98097789aea9375b58328a50d00afcf635aa99d))
* **(analyzer):**  stronger prompt + temp 0.1 recovers dropped items ([726dc0d](https://github.com/juspay/dopamine/commit/726dc0d3a8c485e5fb01a8a196351602bcaf9669))
* **(classifier):**  canonical 12-category enum stops sprawl ([fd374f2](https://github.com/juspay/dopamine/commit/fd374f2298e71e772cb87f9e1eae7a3a22959627))
* **(dashboard):**  clean per-video Links URLs, not just tools ([b145364](https://github.com/juspay/dopamine/commit/b145364e243f52af2e8b6e9ea7e2c9758925aae7))
* **(dashboard):**  clean rendering for unscored + corrupt video records ([68c1c30](https://github.com/juspay/dopamine/commit/68c1c30e74f5e9ba1ca538c336add07ddcbdb126))
* **(knowledge):**  extract frames for lane IG items; thumbnail no longer suppresses frames ([5ac3f0d](https://github.com/juspay/dopamine/commit/5ac3f0d1f050415db8b35674ef192ec78850dec3))
* **(link-resolver):**  add resume mode with incremental state saves ([ce1f60f](https://github.com/juspay/dopamine/commit/ce1f60f02450d6c04607ed0d7bb547cd9202991c))
* **(link-resolver):**  resolve Instagram handles + remove garbage extractions ([d0e24d3](https://github.com/juspay/dopamine/commit/d0e24d3cda2774b81b7f8d90bdbb7616fa540ed6))
* **(pipeline):**  coerce markdown table cells to string (numeric timestamp crashed step 10) ([e4c1ca0](https://github.com/juspay/dopamine/commit/e4c1ca019b0a0e518fdf32cc54e9c57c38061671))
* **(pipeline):**  collapse 34→12 canonical categories, parallel re-verify ([a8ac76c](https://github.com/juspay/dopamine/commit/a8ac76c085d2404d9844dfb9ba03d9aa17c0e260))
* **(pipeline):**  harden URL checks, link extraction, knowledge/runner/IG resilience ([e6cf88d](https://github.com/juspay/dopamine/commit/e6cf88de0de34facc467b579a3c2fc93bccfb71e))
* **(pipeline):**  re-extract thin/empty knowledge via frames + non-regressing merge ([005f387](https://github.com/juspay/dopamine/commit/005f387ab26d458d3ffe2e1a882a695696a082ec))
* **(server):**  SPA fallback asset-extension guard; no media redirect (fixes /videos and dotted routes) ([a0b9b0f](https://github.com/juspay/dopamine/commit/a0b9b0f2cfa829208e9da932a31610ba41bfe279))
* **(verification):**  add registry APIs, fix confidence caps, stop hallucinations ([3c15cf0](https://github.com/juspay/dopamine/commit/3c15cf005c9400e70ff92c38fc79304c240a3c52))
* **(web):**  add favicon (removes /favicon.ico 404 console error) ([98ed818](https://github.com/juspay/dopamine/commit/98ed818a11da40e0bb72fd085fa07d42a1ac88b7))
* **(web):**  data layer as reactive runes module (data.svelte.ts) ([08b9647](https://github.com/juspay/dopamine/commit/08b9647d17146178117fe8583a551ee2bb6a88b8))
* **(web):**  entity page mobile overflow via minmax(0,1fr) grid ([9f20615](https://github.com/juspay/dopamine/commit/9f2061520a8d7b6098757c968b309d5abb212547))
* **(web):**  related rail thumbnail sizing via --image-* vars ([1aa98a7](https://github.com/juspay/dopamine/commit/1aa98a7feb19e2b3dc23c3d772f5eba29519febc))

# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Features

* **auth:** add Chrome cookie auto-import as auth fallback ([89b40db](https://github.com/juspay/dopamine/commit/89b40db))
* **pipeline:** complete verification pipeline -- 106 videos analyzed, researched, and verified ([9d4f62d](https://github.com/juspay/dopamine/commit/9d4f62d))
* **agents:** add auto-implementation and verification pipeline Steps 12-16 ([26b45cd](https://github.com/juspay/dopamine/commit/26b45cd))
* **model:** switch to gemini-3.1-flash-image-preview ([5fe8579](https://github.com/juspay/dopamine/commit/5fe8579))
* **model:** upgrade to Gemini 3.1 Pro on global Vertex endpoint ([62a86b4](https://github.com/juspay/dopamine/commit/62a86b4))
* **model:** upgrade default model to gemini-2.5-flash ([b61af6c](https://github.com/juspay/dopamine/commit/b61af6c))
* **config:** upgrade to Gemini 3.1 Flash and make model configurable via MODEL env var ([987d7fd](https://github.com/juspay/dopamine/commit/987d7fd))

### Bug Fixes

* **auth:** stop calling login() on every run to prevent Instagram rate limits ([17150b6](https://github.com/juspay/dopamine/commit/17150b6))
* **pipeline:** pipeline continues on step failure instead of crashing ([88b51c0](https://github.com/juspay/dopamine/commit/88b51c0))
* **scripts:** launchd pipeline now builds before running ([3ee383d](https://github.com/juspay/dopamine/commit/3ee383d))
* **download:** recover 64 missing videos and fix download bugs ([b9648af](https://github.com/juspay/dopamine/commit/b9648af))
* **config:** revert to gemini-2.0-flash and add Vertex AI env config ([439b838](https://github.com/juspay/dopamine/commit/439b838))

## [2.1.0](https://github.com/juspay/dopamine/compare/v2.0.1...v2.1.0) (2026-03-22)

### Refactoring

* remove 15 legacy Python scripts replaced by NeuroLink TypeScript agents ([3d34dcd](https://github.com/juspay/dopamine/commit/3d34dcd))

## [2.0.1](https://github.com/juspay/dopamine/compare/v2.0.0...v2.0.1) (2026-03-21)

### Documentation

* add PROJECT-OVERVIEW.md and visual overview.html with pipeline diagrams, stats, and milestone timeline ([7265a8e](https://github.com/juspay/dopamine/commit/7265a8e))

## [2.0.0](https://github.com/juspay/dopamine/compare/v1.2.0...v2.0.0) (2026-03-21)

### BREAKING CHANGES

* Pipeline is now TypeScript-first on NeuroLink. Python scripts moved to `scripts/`.

### Features

* **neurolink:** full TypeScript pipeline implementation with 11 agents ([8260392](https://github.com/juspay/dopamine/commit/8260392))
* **agents:** ClassifierAgent, KnowledgeAgent, LinkExtractAgent, LinkResolverAgent using NeuroLink + Gemini
* **agents:** CatalogAgent, OrganizerAgent, MarkdownAgent, DashboardAgent for data transforms
* **server:** Express webhook server with POST /trigger and daily 3am cron
* **server:** Dashboard static file server
* **pipeline:** runner.ts orchestrator with START_STEP/END_STEP support
* **schemas:** Zod schemas for classification, knowledge, and links

## [1.2.0](https://github.com/juspay/dopamine/compare/v1.1.0...v1.2.0) (2026-03-21)

### Features

* **sync:** fast incremental sync with known_pks.json tracking ([9107717](https://github.com/juspay/dopamine/commit/9107717))
* **docs:** NeuroLink pipeline architecture design document

### Bug Fixes

* **dashboard:** fix recurring classList.toggle quote escaping bug in build script

## [1.1.0](https://github.com/juspay/dopamine/compare/v1.0.0...v1.1.0) (2026-03-14)

### Features

* **sync:** download 59 additional videos including recovered failed downloads ([c657752](https://github.com/juspay/dopamine/commit/c657752))
* **knowledge:** extract knowledge for 32 new videos in target categories
* **links:** resolve 455 links to actual URLs (100% coverage)

## [1.0.0](https://github.com/juspay/dopamine/commit/f90b407) (2026-03-14)

### Features

* **download:** Instagram saved videos downloader using instagrapi ([f90b407](https://github.com/juspay/dopamine/commit/f90b407))
* **classify:** auto-discover 17 categories using Gemini 2.0 Flash on Vertex AI
* **knowledge:** extract transcripts, visual descriptions, links, and takeaways for 76 videos
* **links:** extract and resolve 313 URLs via Gemini with Google Search grounding
* **catalog:** searchable JSON + CSV catalog with all video metadata
* **dashboard:** interactive HTML dashboard with Videos tab and Knowledge Base tab
* **markdown:** 76 markdown knowledge base files with INDEX.md
