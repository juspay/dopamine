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
