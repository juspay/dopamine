# Dopamine

**AI-powered Instagram saved-videos pipeline** -- automatically downloads, classifies, extracts knowledge, and verifies content from your Instagram saved collection using Gemini on Vertex AI.

[![semantic-release](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green?logo=node.js)](https://nodejs.org/)
[![NeuroLink](https://img.shields.io/badge/NeuroLink-9.x-purple)](https://www.npmjs.com/package/@juspay/neurolink)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # then fill in your credentials

# 3. Build and run
npm run build && npm run pipeline
```

---

## What It Does

Dopamine processes your Instagram saved videos through a 16-step AI pipeline:

1. **Collect metadata** from Instagram via instagrapi (Python)
2. **Download videos** to local storage
3. **Extract properties** (duration, resolution, codec) via ffprobe
4. **Classify** each video into categories using Gemini vision
5. **Extract knowledge** -- transcripts, visual descriptions, takeaways
6. **Extract links** -- every URL, tool, and resource mentioned
7. **Resolve links** -- verify and expand shortened URLs
8. **Generate catalog** -- unified JSON + CSV with all metadata
9. **Organize folders** -- sort videos into category directories
10. **Generate markdown** -- per-video knowledge base files with INDEX.md
11. **Build dashboard** -- interactive HTML dashboard
12. **Analyze content** -- extract actionable items (tools, code, APIs)
13. **Research & verify** -- check URLs, verify claims via web search
14. **Test implementations** -- run install commands in sandboxed environments
15. **Synthesize verification** -- produce per-video verification reports
16. **Enrich knowledge base** -- merge verification data back into KB

---

## Architecture

```
src/
  agents/           16 specialized agents (one per pipeline step)
  pipeline/
    runner.ts       Orchestrator -- runs steps sequentially with resume support
    config.ts       Centralized configuration (paths, model, rate limits)
    state.ts        JSON state persistence (loadState / saveState)
  schemas/          Zod schemas for Gemini structured output
  server/
    webhook.ts      Express server with POST /trigger + daily 3am cron
    dashboard-server.ts   Static file server for the dashboard
  types/            TypeScript interfaces (MetadataEntry, VideoProperties)
  utils/
    rate-limit.ts   Exponential backoff with rate-limit detection
    video.ts        Video file helpers (list, pk extraction, thumbnails)
scripts/
  collect_metadata.py   Instagram metadata collection (instagrapi)
  download_videos.py    Video downloader (instagrapi)
  run-pipeline.sh       Shell wrapper for launchd / cron
dashboard/
  index.html        Interactive HTML dashboard (Videos + Knowledge Base tabs)
knowledge_base/     Generated markdown files (one per video)
videos/             Downloaded videos, thumbnails, and JSON state files
```

**Agent types:**

| Agent | AI? | Description |
|-------|-----|-------------|
| MetadataAgent | No | Shells out to Python instagrapi script |
| DownloadAgent | No | Shells out to Python instagrapi script |
| PropertiesAgent | No | Runs ffprobe on each video file |
| ClassifierAgent | Gemini | Vision-based video classification |
| KnowledgeAgent | Gemini | Full transcript + visual description extraction |
| LinkExtractAgent | Gemini | Extracts every URL/tool/resource from video |
| LinkResolverAgent | Gemini | Resolves and verifies URLs via web search grounding |
| CatalogAgent | No | Merges all data into catalog.json + catalog.csv |
| OrganizerAgent | No | Copies/symlinks videos into category folders |
| MarkdownAgent | No | Generates per-video markdown + INDEX.md |
| DashboardAgent | No | Builds interactive HTML dashboard |
| AnalyzerAgent | Gemini | Extracts actionable items from knowledge base |
| ResearchAgent | Gemini | Web-searches to verify claims and check URLs |
| ImplementerAgent | No | Runs install commands in sandbox to test them |
| VerifierAgent | Gemini | Produces final verification report per video |
| EnrichmentAgent | No | Merges verification data back into knowledge base |

---

## Usage

### Run the full pipeline

```bash
npm run build
npm run pipeline
```

### Run a subset of steps

```bash
# Run only classification (step 4) through link extraction (step 6)
START_STEP=3 END_STEP=6 npm run pipeline
```

Steps are 0-indexed internally, so `START_STEP=3` means step 4 (Classification).

### Start the webhook server

```bash
npm run start
# Listens on PORT (default 3000)
# POST /trigger  -- start a pipeline run
# GET  /status   -- check if pipeline is running
# Also runs a daily cron job at 3:00 AM
```

### Serve the dashboard

```bash
npm run serve
# Serves on DASHBOARD_PORT (default 3001)
# Open http://localhost:3001/dashboard/
```

### Development mode

```bash
npm run dev          # TypeScript watch mode (recompiles on save)
npm run commit       # Interactive Commitizen prompt
npm run release:dry  # Preview what semantic-release would do
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INSTAGRAM_USERNAME` | Yes | `user` | Instagram account to scrape saved videos from |
| `INSTAGRAM_PASSWORD` | Yes | -- | Instagram password (used by Python scripts) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes | -- | Path to GCP service account JSON for Vertex AI |
| `GOOGLE_CLOUD_PROJECT_ID` | No | -- | GCP project ID (used by `run-pipeline.sh`) |
| `GOOGLE_CLOUD_LOCATION` | No | -- | GCP region (used by `run-pipeline.sh`) |
| `VERTEX_PROJECT` | No | `your-gcp-project-id` | Vertex AI project ID (used by NeuroLink) |
| `VERTEX_LOCATION` | No | `global` | Vertex AI location (`global` for 3.x models, `us-central1` for 2.x) |
| `MODEL` | No | `gemini-3.1-flash-image-preview` | Gemini model ID for all AI agents |
| `KB_CATEGORIES` | No | `AI & Machine Learning,Tech & Coding,Business & Marketing,UI/UX Design` | Comma-separated categories for knowledge extraction |
| `START_STEP` | No | `0` | Pipeline start step (0-indexed) |
| `END_STEP` | No | `16` | Pipeline end step (exclusive, 0-indexed) |
| `PORT` | No | `3000` | Webhook + cron server port |
| `DASHBOARD_PORT` | No | `3001` | Dashboard static server port |
| `VIDEO_SIZE_THRESHOLD` | No | `0` | Bytes; videos larger than this use thumbnail instead. `0` = always use thumbnails |
| `LANGFUSE_PUBLIC_KEY` | No | -- | Langfuse observability public key |
| `LANGFUSE_SECRET_KEY` | No | -- | Langfuse observability secret key |
| `LANGFUSE_HOST` | No | `https://cloud.langfuse.com` | Langfuse server URL |

---

## API Documentation

### Webhook Server (`npm run start`)

#### `POST /trigger`

Starts a full pipeline run. Returns immediately; pipeline runs in the background.

**Response (200):**
```json
{ "status": "started", "message": "Pipeline triggered" }
```

**Response (409) -- pipeline already running:**
```json
{ "status": "running", "message": "Pipeline already running" }
```

#### `GET /status`

Returns the current pipeline status.

**Response (200):**
```json
{ "running": false }
```

#### Cron Schedule

The webhook server automatically triggers a full pipeline run every day at **3:00 AM** (server local time).

---

## Development Guide

### Adding a New Agent

1. **Create the agent file** in `src/agents/my-agent.ts`:

```typescript
import { type NeuroLink } from "@juspay/neurolink";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";

export async function runMyAgent(neurolink: NeuroLink): Promise<void> {
  // Load input state
  const input = await loadState<Record<string, unknown>>(CONFIG.STATE.SOME_INPUT, {});

  // Process items with resume support
  for (const [filename, data] of Object.entries(input)) {
    // Skip already-processed items (resume mode)
    if (filename in output) continue;

    // Call Gemini via NeuroLink
    const response = await neurolink.generate({
      input: { text: "your prompt", files: ["/path/to/video.mp4"] },
      provider: "vertex",
      model: CONFIG.MODEL,
      schema: YourZodSchema,       // Zod schema for structured output
      output: { format: "json" },
      disableTools: true,          // REQUIRED: Gemini rejects tools + JSON schema
      maxTokens: 4096,
      timeout: "120s",
    });

    // Save after every item for resume support
    await saveState(CONFIG.STATE.MY_OUTPUT, output);
  }
}
```

2. **Add a Zod schema** in `src/schemas/my-schema.ts` if the agent uses Gemini structured output. Keep schemas flat -- avoid `z.union()` (causes Gemini "Too many states" errors).

3. **Add a state path** in `src/pipeline/config.ts`:
```typescript
STATE: {
  // ...existing paths
  MY_OUTPUT: path.resolve("videos", "my_output.json"),
},
```

4. **Register the step** in `src/pipeline/runner.ts`:
```typescript
import { runMyAgent } from "../agents/my-agent.js";
// Add to the steps array:
{ name: "My new step", run: () => runMyAgent(neurolink) },
```

5. **Build and test:**
```bash
npm run build
START_STEP=<n> END_STEP=<n+1> npm run pipeline
```

### Key Patterns

- **Resume mode**: Every agent writes state after processing each item. If the pipeline crashes, re-running skips already-processed items.
- **Rate limiting**: Use `exponentialBackoff()` from `src/utils/rate-limit.ts` for all Gemini calls. It detects 429/RESOURCE_EXHAUSTED and backs off automatically.
- **Thumbnails**: Large videos use thumbnails instead of full video frames. Controlled by `VIDEO_SIZE_THRESHOLD` (default `0` = always use thumbnails).
- **State persistence**: All intermediate data lives in `videos/*.json`. Use `loadState()` / `saveState()` from `src/pipeline/state.js`.

---

## Troubleshooting

### Instagram Authentication

**Problem:** `LoginRequired` or `ChallengeRequired` errors from instagrapi.

**Solutions:**
1. Make sure `INSTAGRAM_USERNAME` and `INSTAGRAM_PASSWORD` are set in `.env`.
2. The download script includes a Chrome cookie auto-import fallback. Make sure you are logged into Instagram in Chrome.
3. Avoid running the metadata/download steps too frequently -- Instagram rate-limits API calls. The pipeline is designed to skip `login()` on repeated runs to prevent this.
4. If you get a challenge (2FA/captcha), log into Instagram manually in a browser first, then retry.

### Gemini Rate Limits

**Problem:** `429 RESOURCE_EXHAUSTED` errors from Vertex AI.

**Solutions:**
1. The pipeline has built-in exponential backoff (up to 5 retries with exponentially increasing delays starting at 10s).
2. If you consistently hit limits, increase `DELAY_BETWEEN_REQUESTS_MS` in `src/pipeline/config.ts` (default 2000ms).
3. Use `START_STEP` / `END_STEP` to run smaller batches.
4. Resume mode means you can stop and restart without losing progress.

### Gemini "Too Many States" Error

**Problem:** Gemini returns a "Too many states" error on structured output.

**Solution:** This happens when Zod schemas use `z.union()` or `z.enum()` inside nested arrays. Use `z.string().describe(...)` instead and validate the value in your agent code. See `src/schemas/analysis.ts` for the pattern.

### Pipeline Step Failures

The pipeline continues on step failure by default (as of commit `88b51c0`). Failed steps are logged and summarized at the end. Fix the issue and re-run -- resume mode will skip already-completed items.

### Build Errors

```bash
npm run build    # Check for TypeScript errors
npm run dev      # Watch mode for iterating
```

The pre-commit hook runs `npm run build` automatically, so commits will fail if the code does not compile.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for commit conventions, how to add pipeline steps, and testing guidelines.

---

## License

Released under the [MIT License](LICENSE).

The MIT License covers the **source code only**. It does not grant any rights to
media, transcripts, captions, or other content this pipeline retrieves from
third-party platforms (Instagram, YouTube, etc.) — that content belongs to its
respective creators. Do not commit or redistribute retrieved third-party content.
