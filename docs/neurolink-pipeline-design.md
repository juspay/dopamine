# NeuroLink Pipeline Design: Instagram Saved Videos Knowledge Engine

**Document status:** Architecture blueprint  
**Author:** Sachin Sharma  
**NeuroLink:** @juspay/neurolink (release branch, Q1 2026, github.com/juspay/neurolink)  
**Date:** March 2026  

---

## Table of Contents

1. [Current Pipeline Inventory](#1-current-pipeline-inventory)
2. [NeuroLink Capabilities That Apply](#2-neurolink-capabilities-that-apply)
3. [Architecture Decision](#3-architecture-decision)
4. [Agent Roster](#4-agent-roster)
5. [Component Design](#5-component-design)
6. [Data Flow](#6-data-flow)
7. [File Map](#7-file-map)
8. [Implementation Phases](#8-implementation-phases)
9. [Critical Details](#9-critical-details)
10. [Appendices](#10-appendices)

---

## 1. Current Pipeline Inventory

The existing pipeline is 15 Python scripts that run manually in sequence. Each script reads JSON
state from disk, skips already-processed items (resume mode), does work, and writes JSON back.
There is no orchestrator — the user runs them one by one.

| Step | Script | What it does | AI used | External deps |
|------|--------|-------------|---------|--------------|
| 1 | `collect_metadata.py` | Login to Instagram via instagrapi, fetch all saved posts, write `videos/metadata.json` | None | instagrapi |
| 2 | `download_videos.py` | Download new MP4s for video-type saved posts, track `known_pks.json` | None | instagrapi |
| 3 | `extract_properties.py` | ffprobe per MP4 (duration/resolution/FPS/codec), ffmpeg thumbnails | None | ffprobe, ffmpeg |
| 4 | `classify_videos.py` | Send each video (thumbnail if >50MB) to Gemini 2.0 Flash → category/subcategory/tags/description/language/mood | Gemini on Vertex AI | google-genai |
| 5 | `extract_knowledge.py` + `extract_knowledge_batch2.py` | Send AI/Tech-category videos → transcript/visual_description/links/takeaways/topics | Gemini on Vertex AI | google-genai |
| 6 | `extract_links_v2.py` | Re-watch all KB videos → extract every URL shown on screen or spoken | Gemini on Vertex AI | google-genai |
| 7 | `resolve_links.py` | Gemini + Google Search grounding → resolve product names to real HTTPS URLs | Gemini + Google Search | google-genai |
| 8 | `merge_links.py` / `rebuild_knowledge.py` | Merge resolved links back into knowledge base JSON | None | — |
| 9 | `generate_catalog.py` | Join all JSONs → `catalog.json` + `catalog.csv` | None | — |
| 10 | `organize_folders.py` | Symlinks under `videos/classified/{category}/` | None | — |
| 11 | `generate_markdown.py` | Per-video `.md` files + `INDEX.md` under `knowledge_base/` | None | — |
| 12 | `build_dashboard.py` | Self-contained `dashboard/index.html` with embedded catalog data | None | — |

**Resume mode (critical invariant):** Every AI script checks if each item exists in the output
JSON before processing and writes state after each successful item. This must be preserved exactly.

**Rate limiting:** All Gemini scripts use 2-3s delays between requests plus exponential backoff on
429/RESOURCE_EXHAUSTED with up to 5 retries.

**Large file fallback:** Videos >50MB use the thumbnail JPEG instead of video binary for Gemini.

---

## 2. NeuroLink Capabilities That Apply

### Confirmed from source (examples/, docs/)

**Core generation (`video-analysis.ts`, `basic-usage.ts`):**
```typescript
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "analyze this", files: ["/abs/path/to/video.mp4"] },
  provider: "vertex",
  model: "gemini-2.0-flash",
  maxTokens: 4000,
  disableTools: true,
});
// result.content is the text response
```

**Structured output with Zod (`structured-output-google-providers.ts`):**
```typescript
const Schema = z.object({ category: z.string(), tags: z.array(z.string()) });
const result = await neurolink.generate({
  input: { text: prompt, files: [videoPath] },
  provider: "vertex",
  model: "gemini-2.0-flash",
  schema: Schema,
  output: { format: "json" },
  disableTools: true,  // REQUIRED for Gemini + schema
});
const parsed = Schema.parse(JSON.parse(result.content));
```

**Web search grounding (built-in tool — equivalent of Python's `Tool(google_search=GoogleSearch())`):**
```typescript
// websearchGrounding is active when disableTools is NOT set
// Do NOT combine with schema + output.format:"json" — Gemini will reject
const result = await neurolink.generate({
  input: { text: `What is the official URL for "${toolName}"? Return only the URL.` },
  provider: "vertex",
  model: "gemini-2.0-flash",
  // No schema, no disableTools
});
const urlMatch = result.content.match(/https?:\/\/[^\s<>"')]+/);
```

**MCP server registration (`dynamic-mcp-servers.ts`):**
```typescript
await neurolink.addExternalMCPServer("filesystem", {
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()],
});
```

**Workflow configs (`workflow-integration-example.ts`):**
```typescript
import { CONSENSUS_3_WORKFLOW } from "../src/lib/workflow/index.js";
await neurolink.generate({ input: { text: prompt }, workflowConfig: CONSENSUS_3_WORKFLOW });
```
Multi-model ensemble voting — not needed for this pipeline (classification is deterministic enough).

**Vertex AI auth:** Uses `GOOGLE_APPLICATION_CREDENTIALS` env var (service account JSON) or ADC.
No special NeuroLink config needed.

### Confirmed constraints

| Constraint | Source |
|---|---|
| `disableTools: true` required when using `schema` + `output.format:"json"` with Gemini | `structured-output-google-providers.ts` |
| Cannot use tools (including websearchGrounding) AND JSON schema in the same call on Gemini | docs: "Function calling with a response mime type: 'application/json' is unsupported" |
| Avoid `z.union()` in schemas — triggers "Too many states" on Gemini | docs note in structured output guide |
| Video files must be absolute paths in `input.files` | `video-analysis.ts`: `path.resolve(VIDEO_PATH)` |
| `provider: "vertex"` auto-switches for video-mode output (Veo 3.1); we use text mode | troubleshooting docs |

### What NeuroLink does NOT do (handle ourselves)

- Instagram API (instagrapi is Python-only)
- ffprobe/ffmpeg (shell tools — use `execa`)
- Pipeline scheduling (add `node-cron`)
- Dashboard serving (add Express static server)
- Sequential pipeline orchestration (plain `await` chains)

---

## 3. Architecture Decision

**Single-process sequential pipeline, NeuroLink as the AI library.**

NeuroLink is a library — its `generate()` is the unit of composition. The pipeline is plain
TypeScript async/await with each step as an async function. The single `NeuroLink` instance is
created once in `runner.ts` and passed to all AI agents.

Python scripts for Instagram download are preserved as subprocess calls (instagrapi has no TS
equivalent). All other scripts are ported to TypeScript.

**Why not one "agent" per step communicating over queues?** The steps have hard sequential data
dependencies (classify before extract, extract before resolve), the workload is batch (not
real-time), and there is only one user. Queue-based multi-agent adds complexity with no benefit.

**Why not use NeuroLink's workflow system?** The `CONSENSUS_3_WORKFLOW` / `QUALITY_MAX_WORKFLOW`
patterns run multiple models in parallel for quality voting. Classification quality is not the
bottleneck; latency and cost are. Sequential single-model calls with resume mode is the right
approach.

---

## 4. Agent Roster

| Agent | Maps from | LLM? | NeuroLink role |
|---|---|---|---|
| `MetadataAgent` | `collect_metadata.py` | No | `execa` → Python subprocess |
| `DownloadAgent` | `download_videos.py` | No | `execa` → Python subprocess |
| `PropertiesAgent` | `extract_properties.py` | No | `execa` → ffprobe + ffmpeg |
| `ClassifierAgent` | `classify_videos.py` | Yes | `generate()` with Zod schema + `disableTools: true` |
| `KnowledgeAgent` | `extract_knowledge.py` + batch2 | Yes | `generate()` with Zod schema + `disableTools: true` |
| `LinkExtractAgent` | `extract_links_v2.py` | Yes | `generate()` with Zod schema + `disableTools: true` |
| `LinkResolverAgent` | `resolve_links.py` | Yes | `generate()` with websearchGrounding (no schema) |
| `CatalogAgent` | `generate_catalog.py` | No | TypeScript data join |
| `OrganizerAgent` | `organize_folders.py` | No | `fs.symlink` |
| `MarkdownAgent` | `generate_markdown.py` | No | Template rendering |
| `DashboardAgent` | `build_dashboard.py` | No | HTML generation |

---

## 5. Component Design

### Directory structure

```
dopamine/
├── src/
│   ├── pipeline/
│   │   ├── runner.ts          # Top-level orchestrator — iterates all steps
│   │   ├── config.ts          # All paths, constants, rate limits
│   │   └── state.ts           # loadState / saveState helpers
│   ├── agents/
│   │   ├── metadata.ts        # MetadataAgent (execa → Python)
│   │   ├── download.ts        # DownloadAgent (execa → Python)
│   │   ├── properties.ts      # PropertiesAgent (ffprobe/ffmpeg via execa)
│   │   ├── classifier.ts      # ClassifierAgent (NeuroLink + schema)
│   │   ├── knowledge.ts       # KnowledgeAgent (NeuroLink + schema)
│   │   ├── link-extractor.ts  # LinkExtractAgent (NeuroLink + schema)
│   │   ├── link-resolver.ts   # LinkResolverAgent (NeuroLink + websearch)
│   │   ├── catalog.ts         # CatalogAgent (pure TS — port of generate_catalog.py)
│   │   ├── organizer.ts       # OrganizerAgent (fs.symlink)
│   │   ├── markdown.ts        # MarkdownAgent (template rendering)
│   │   └── dashboard.ts       # DashboardAgent (HTML generation)
│   ├── schemas/
│   │   ├── classification.ts  # Zod schema for ClassifierAgent
│   │   ├── knowledge.ts       # Zod schema for KnowledgeAgent
│   │   └── links.ts           # Zod schema for LinkExtractAgent
│   ├── types/
│   │   └── index.ts           # MetadataEntry, VideoProperties, etc.
│   ├── utils/
│   │   ├── rate-limit.ts      # sleep(), exponentialBackoff()
│   │   └── video.ts           # getVideoFiles(), extractPkFromFilename(), getThumbnailPath()
│   └── server/
│       ├── webhook.ts         # POST /trigger → runs pipeline; daily cron
│       └── dashboard-server.ts # Express static server for dashboard/index.html
├── scripts/
│   ├── collect_metadata.py    # Preserved (instagrapi — no TS equivalent)
│   └── download_videos.py     # Preserved (instagrapi — no TS equivalent)
├── docs/
│   └── neurolink-pipeline-design.md
├── package.json
├── tsconfig.json
└── .env
```

### `src/pipeline/config.ts`

```typescript
import path from "node:path";

export const CONFIG = {
  INSTAGRAM_USERNAME: process.env.INSTAGRAM_USERNAME ?? "user",

  // Paths — mirrors the Python scripts exactly
  VIDEOS_DIR: path.resolve(
    "videos",
    `${process.env.INSTAGRAM_USERNAME ?? "user"}_saved`
  ),
  THUMB_DIR: path.resolve("videos", "thumbnails"),

  STATE: {
    METADATA:        path.resolve("videos", "metadata.json"),
    KNOWN_PKS:       path.resolve("videos", "known_pks.json"),
    PROPERTIES:      path.resolve("videos", "video_properties.json"),
    CLASSIFICATIONS: path.resolve("videos", "classifications.json"),
    KNOWLEDGE_BASE:  path.resolve("videos", "knowledge_base.json"),
    LINKS_V2:        path.resolve("videos", "links_v2.json"),
    CATALOG:         path.resolve("videos", "catalog.json"),
    CATALOG_CSV:     path.resolve("videos", "catalog.csv"),
  },

  OUTPUT: {
    CLASSIFIED:     path.resolve("videos", "classified"),
    KNOWLEDGE_BASE: path.resolve("knowledge_base"),
    DASHBOARD:      path.resolve("dashboard", "index.html"),
  },

  // AI
  MODEL: "gemini-2.0-flash",
  VERTEX_PROJECT:  process.env.VERTEX_PROJECT  ?? "your-gcp-project-id",
  VERTEX_LOCATION: process.env.VERTEX_LOCATION ?? "us-central1",

  // Categories that get full knowledge extraction (same as Python)
  KNOWLEDGE_TARGET_CATEGORIES: new Set(["AI & Machine Learning", "Tech & Coding"]),

  // Rate limiting (mirrors Python constants)
  DELAY_BETWEEN_REQUESTS_MS: 2_000,
  MAX_RETRIES: 5,
  RETRY_BASE_DELAY_MS: 10_000,

  // Threshold above which thumbnail is used instead of full video
  VIDEO_SIZE_THRESHOLD_BYTES: 50 * 1024 * 1024,
} as const;
```

### `src/pipeline/state.ts`

```typescript
import fs from "node:fs/promises";
import path from "node:path";

export async function loadState<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export async function saveState<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}
```

### `src/utils/rate-limit.ts`

```typescript
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type BackoffResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number
): Promise<BackoffResult<T>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return { success: true, value: await fn() };
    } catch (err) {
      const msg = String(err);
      const isRateLimit =
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.toLowerCase().includes("quota");

      if (attempt < maxRetries - 1) {
        // Exponential for rate limits, linear for transient errors
        const delay = isRateLimit
          ? baseDelayMs * 2 ** attempt
          : baseDelayMs * (attempt + 1);
        console.warn(`  Attempt ${attempt + 1}/${maxRetries}: ${msg.slice(0, 100)}`);
        console.warn(`  Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        console.error(`  Failed after ${maxRetries} attempts: ${msg.slice(0, 200)}`);
        return { success: false, error: msg };
      }
    }
  }
  return { success: false, error: "Max retries exceeded" };
}
```

### `src/schemas/classification.ts`

```typescript
import { z } from "zod";

// NOTE: Gemini + disableTools + schema requires flat structures.
// Avoid z.union() — triggers "Too many states" error.
export const ClassificationSchema = z.object({
  category: z.string().describe(
    'Auto-discovered category e.g. "Tech & Coding", "AI & Machine Learning", ' +
    '"Interior Design", "Food & Cooking", "Business & Marketing", "Fitness & Health"'
  ),
  subcategory: z.string().describe("More specific subcategory"),
  tags: z.array(z.string()).describe("5-10 descriptive tags"),
  description: z.string().describe("1-2 sentence description of the video content"),
  language: z.string().describe("Primary language spoken or shown"),
  mood: z.string().describe(
    'Mood/tone: "educational", "entertaining", "inspirational", "tutorial", "promotional"'
  ),
});

export type Classification = z.infer<typeof ClassificationSchema>;
```

### `src/schemas/knowledge.ts`

```typescript
import { z } from "zod";

// visual_description is flattened to string — the original Python returned string|array,
// which is a union type that causes "Too many states" on Gemini.
// The LLM includes timestamps inline naturally (e.g., "[0:05] Slide shows...").
export const KnowledgeSchema = z.object({
  transcript: z.string().describe(
    "Full word-for-word transcript. Include speaker labels if multiple speakers. " +
    'If no speech, describe the audio. Be extremely thorough.'
  ),
  visual_description: z.string().describe(
    "Detailed description of what is shown on screen — slides, code, demos, websites, " +
    "apps, text overlays, diagrams. Include timestamps inline where content changes."
  ),
  links_and_resources: z.array(z.object({
    url: z.string().nullable().describe("Full URL or null if not determinable"),
    description: z.string(),
    timestamp: z.string(),
  })).describe("Every URL, website, tool, product, or resource mentioned or shown"),
  key_takeaways: z.array(z.string()).describe("3-7 bullet point takeaways"),
  topics: z.array(z.string()).describe("Specific topics and technologies discussed"),
});

export type Knowledge = z.infer<typeof KnowledgeSchema>;
```

### `src/schemas/links.ts`

```typescript
import { z } from "zod";

export const LinksSchema = z.object({
  links: z.array(z.object({
    name: z.string().describe("Tool/product/resource name"),
    url: z.string().nullable().describe(
      "Full https:// URL shown on screen or known. null if truly unknown."
    ),
    type: z.enum(["shown_on_screen", "mentioned_verbally", "inferred_from_context"]),
    description: z.string().describe("What it is and why mentioned"),
    timestamp: z.string().describe("Approximate timestamp in the video"),
  })),
});

export type Links = z.infer<typeof LinksSchema>;
```

### `src/agents/classifier.ts` — canonical AI agent pattern

All four AI agents follow this exact structure. This is the template:

```typescript
import { type NeuroLink } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { ClassificationSchema, type Classification } from "../schemas/classification.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { getVideoFiles, extractPkFromFilename, getThumbnailPath } from "../utils/video.js";
import type { MetadataEntry } from "../types/index.js";

interface ClassificationEntry extends Classification {
  pk: string | null;
  code: string | null;
  username: string | null;
  error?: string;
}

const CLASSIFY_PROMPT = (username: string, caption: string, hashtags: string) => `
Analyze this video and its Instagram metadata. Return a JSON object with the classification.

Instagram metadata:
- Username: ${username}
- Caption: ${caption}
- Hashtags: ${hashtags}

Return ONLY valid JSON matching the schema provided. No markdown fences.`;

export async function runClassifierAgent(neurolink: NeuroLink): Promise<void> {
  const classifications = await loadState<Record<string, ClassificationEntry>>(
    CONFIG.STATE.CLASSIFICATIONS, {}
  );
  const metadata = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);

  // Build pk → metadata lookup (mirrors classify_videos.py:load_metadata)
  const pkLookup = new Map(metadata.map(m => [String(m.pk), m]));

  const videoFiles = await getVideoFiles(CONFIG.VIDEOS_DIR);
  let classified = 0, skipped = 0, errors = 0;

  for (const [i, videoPath] of videoFiles.entries()) {
    const filename = path.basename(videoPath);
    const logPrefix = `[${i + 1}/${videoFiles.length}]`;

    // Resume mode — skip already classified
    if (filename in classifications) {
      skipped++;
      console.log(`${logPrefix} SKIP (already classified): ${filename}`);
      continue;
    }

    const pk = extractPkFromFilename(filename);
    const meta = pk ? pkLookup.get(pk) : undefined;

    const { size } = await fs.stat(videoPath);
    const useThumbnail = size > CONFIG.VIDEO_SIZE_THRESHOLD_BYTES;
    const inputFile = useThumbnail
      ? (await getThumbnailPath(filename) ?? videoPath)
      : videoPath;

    if (useThumbnail) {
      console.log(`${logPrefix} Large file (${(size / 1024 / 1024).toFixed(1)}MB), using thumbnail`);
    }

    const username  = meta?.username ?? "unknown";
    const caption   = meta?.caption_text ?? "";
    const hashtags  = (caption.match(/#\w+/g) ?? []).join(", ");

    console.log(`${logPrefix} Classifying: ${filename}`);
    console.log(`  User: ${username} | Caption: ${caption.slice(0, 60)}...`);

    const result = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: {
          text: CLASSIFY_PROMPT(username, caption, hashtags),
          files: [path.resolve(inputFile)],  // Must be absolute path
        },
        provider: "vertex",
        model:    CONFIG.MODEL,
        schema:   ClassificationSchema,
        output:   { format: "json" },
        disableTools: true,  // REQUIRED: Gemini rejects tools + JSON schema together
        maxTokens: 1024,
        timeout: "120s",
      });
      return ClassificationSchema.parse(JSON.parse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      classifications[filename] = {
        pk:       pk ?? null,
        code:     meta?.code ?? null,
        username: meta?.username ?? null,
        ...result.value,
      };
      classified++;
      console.log(`  -> ${result.value.category} / ${result.value.subcategory}`);
    } else {
      classifications[filename] = {
        pk: pk ?? null, code: meta?.code ?? null, username: meta?.username ?? null,
        category: "", subcategory: "", tags: [], description: "",
        language: "", mood: "",
        error: result.error,
      };
      errors++;
    }

    // Write after every item — this is the resume mode guarantee
    await saveState(CONFIG.STATE.CLASSIFICATIONS, classifications);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nClassifier done. Classified: ${classified}, Skipped: ${skipped}, Errors: ${errors}`);
}
```

### `src/agents/link-resolver.ts` — websearchGrounding pattern

This is the only agent that uses tools (no schema):

```typescript
export async function runLinkResolverAgent(neurolink: NeuroLink): Promise<void> {
  const links = await loadState<Record<string, { links: LinkEntry[] }>>(
    CONFIG.STATE.LINKS_V2, {}
  );

  // --- First pass: fix obvious partial URLs without API (mirrors resolve_links.py:try_fix_partial_url) ---
  let fixedLocally = 0;
  const needsApi: Array<{ fname: string; idx: number; link: LinkEntry }> = [];

  for (const [fname, entry] of Object.entries(links)) {
    for (const [idx, link] of (entry.links ?? []).entries()) {
      if (!needsResolution(link.url)) continue;
      const fixed = tryFixPartialUrl(link.url);
      if (fixed) {
        links[fname].links[idx].url = fixed;
        fixedLocally++;
        console.log(`Fixed locally: ${link.name} -> ${fixed}`);
      } else {
        needsApi.push({ fname, idx, link });
      }
    }
  }

  // Deduplicate by normalized name
  const uniqueNames = new Map<string, LinkEntry>();
  for (const { link } of needsApi) {
    const key = link.name.trim().toLowerCase();
    if (!uniqueNames.has(key)) uniqueNames.set(key, link);
  }

  console.log(`Fixed locally: ${fixedLocally}, Unique names for API: ${uniqueNames.size}`);

  const resolvedMap = new Map<string, string>();

  for (const [i, [nameKey, link]] of [...uniqueNames.entries()].entries()) {
    const context = [
      link.description ? `Description: ${link.description}` : "",
      link.url ? `Possible hint: ${link.url}` : "",
    ].filter(Boolean).join(". ");

    const prompt =
      `What is the official website URL for "${link.name}"? ${context}. ` +
      `Return ONLY the full URL starting with https://, nothing else. ` +
      `If it's a GitHub project return the GitHub URL. ` +
      `If you cannot find an exact URL return your best guess. One URL only.`;

    console.log(`\n[${i + 1}/${uniqueNames.size}] Resolving: ${link.name}`);

    // First attempt: with websearchGrounding (built-in tool, active when disableTools not set)
    let resolved: string | null = null;
    const r1 = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: { text: prompt },
        provider: "vertex",
        model:    CONFIG.MODEL,
        // No schema, no disableTools — websearchGrounding is available
        maxTokens: 256,
        timeout: "30s",
      });
      const match = response.content.match(/https?:\/\/[^\s<>"')]+/);
      return match?.[0]?.replace(/\.$/, "") ?? null;
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (r1.success && r1.value) {
      resolved = r1.value;
    } else {
      // Fallback: plain generation without tools (mirrors resolve_with_gemini_no_search)
      const r2 = await exponentialBackoff(async () => {
        const response = await neurolink.generate({
          input: { text: prompt },
          provider: "vertex",
          model:    CONFIG.MODEL,
          disableTools: true,
          maxTokens: 256,
          timeout: "30s",
        });
        const match = response.content.match(/https?:\/\/[^\s<>"')]+/);
        return match?.[0]?.replace(/\.$/, "") ?? null;
      }, 2, CONFIG.RETRY_BASE_DELAY_MS);
      if (r2.success && r2.value) resolved = r2.value;
    }

    if (resolved) {
      resolvedMap.set(nameKey, resolved);
      console.log(`  Resolved: ${resolved}`);
    } else {
      console.log(`  FAILED to resolve`);
    }

    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  // Apply resolved URLs back to all matching entries
  for (const { fname, idx, link } of needsApi) {
    const key = link.name.trim().toLowerCase();
    const url = resolvedMap.get(key);
    if (url) links[fname].links[idx].url = url;
  }

  await saveState(CONFIG.STATE.LINKS_V2, links);
  console.log("\nLink resolution complete.");
}
```

### `src/agents/metadata.ts` and `src/agents/download.ts` — subprocess wrappers

```typescript
import { execa } from "execa";

export async function runMetadataAgent(): Promise<void> {
  console.log("Running metadata collection (Python/instagrapi)...");
  await execa("python3", ["scripts/collect_metadata.py"], {
    cwd: process.cwd(),
    env: process.env as Record<string, string>,
    stdout: "inherit",
    stderr: "inherit",
  });
}

export async function runDownloadAgent(): Promise<void> {
  console.log("Running video download (Python/instagrapi)...");
  await execa("python3", ["scripts/download_videos.py"], {
    cwd: process.cwd(),
    env: process.env as Record<string, string>,
    stdout: "inherit",
    stderr: "inherit",
  });
}
```

### `src/agents/properties.ts` — ffprobe/ffmpeg via execa

```typescript
import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { getVideoFiles } from "../utils/video.js";
import type { VideoProperties } from "../types/index.js";

export async function runPropertiesAgent(): Promise<void> {
  await fs.mkdir(CONFIG.THUMB_DIR, { recursive: true });

  const properties = await loadState<Record<string, VideoProperties>>(
    CONFIG.STATE.PROPERTIES, {}
  );
  const videoFiles = await getVideoFiles(CONFIG.VIDEOS_DIR);
  let processed = 0, skipped = 0;

  for (const [i, videoPath] of videoFiles.entries()) {
    const filename = path.basename(videoPath);
    if (filename in properties) {
      skipped++;
      console.log(`[${i + 1}/${videoFiles.length}] SKIP: ${filename}`);
      continue;
    }

    try {
      // ffprobe
      const { stdout } = await execa("ffprobe", [
        "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", videoPath,
      ]);
      const probe = JSON.parse(stdout) as FfprobeOutput;
      properties[filename] = extractProperties(probe);

      // ffmpeg thumbnail
      const thumbPath = path.join(
        CONFIG.THUMB_DIR,
        filename.replace(/\.mp4$/i, ".jpg")
      );
      await execa("ffmpeg", [
        "-y", "-i", videoPath, "-ss", "1",
        "-vframes", "1", "-q:v", "2", thumbPath,
      ]).catch(() => {}); // Non-fatal

      processed++;
      console.log(`[${i + 1}/${videoFiles.length}] OK: ${filename}`);
      await saveState(CONFIG.STATE.PROPERTIES, properties);
    } catch (err) {
      console.error(`[${i + 1}/${videoFiles.length}] ERROR: ${filename}: ${err}`);
    }
  }

  console.log(`\nProperties done. Processed: ${processed}, Skipped: ${skipped}`);
}

function extractProperties(probe: FfprobeOutput): VideoProperties {
  const fmt = probe.format ?? {};
  const videoStream = probe.streams?.find(s => s.codec_type === "video");
  let fps = 0;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    fps = den !== 0 ? Math.round((num / den) * 100) / 100 : 0;
  }
  return {
    duration:  parseFloat(fmt.duration ?? "0"),
    width:     parseInt(videoStream?.width  ?? "0", 10),
    height:    parseInt(videoStream?.height ?? "0", 10),
    codec:     videoStream?.codec_name ?? "",
    file_size: parseInt(fmt.size ?? "0", 10),
    bitrate:   parseInt(fmt.bit_rate ?? "0", 10),
    fps,
  };
}
```

### `src/pipeline/runner.ts`

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { runMetadataAgent }     from "../agents/metadata.js";
import { runDownloadAgent }     from "../agents/download.js";
import { runPropertiesAgent }   from "../agents/properties.js";
import { runClassifierAgent }   from "../agents/classifier.js";
import { runKnowledgeAgent }    from "../agents/knowledge.js";
import { runLinkExtractAgent }  from "../agents/link-extractor.js";
import { runLinkResolverAgent } from "../agents/link-resolver.js";
import { runCatalogAgent }      from "../agents/catalog.js";
import { runOrganizerAgent }    from "../agents/organizer.js";
import { runMarkdownAgent }     from "../agents/markdown.js";
import { runDashboardAgent }    from "../agents/dashboard.js";

export async function runFullPipeline(options: { startStep?: number; endStep?: number } = {}): Promise<void> {
  const neurolink = new NeuroLink();

  const steps = [
    { name: "Metadata collection",   run: () => runMetadataAgent() },
    { name: "Video download",        run: () => runDownloadAgent() },
    { name: "Properties extraction", run: () => runPropertiesAgent() },
    { name: "Classification",        run: () => runClassifierAgent(neurolink) },
    { name: "Knowledge extraction",  run: () => runKnowledgeAgent(neurolink) },
    { name: "Link extraction",       run: () => runLinkExtractAgent(neurolink) },
    { name: "Link resolution",       run: () => runLinkResolverAgent(neurolink) },
    { name: "Catalog generation",    run: () => runCatalogAgent() },
    { name: "Folder organization",   run: () => runOrganizerAgent() },
    { name: "Markdown generation",   run: () => runMarkdownAgent() },
    { name: "Dashboard build",       run: () => runDashboardAgent() },
  ];

  const startStep = options.startStep ?? parseInt(process.env.START_STEP ?? "0", 10);
  const endStep   = options.endStep   ?? parseInt(process.env.END_STEP   ?? String(steps.length), 10);

  try {
    for (const [i, step] of steps.entries()) {
      if (i < startStep || i >= endStep) continue;
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Step ${i + 1}/${steps.length}: ${step.name}`);
      console.log("=".repeat(60));
      const t0 = Date.now();
      await step.run();
      console.log(`  Completed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    console.log("\nPipeline complete.");
  } finally {
    await neurolink.shutdown();
  }
}

// Direct execution: node dist/pipeline/runner.js
if (process.argv[1]?.endsWith("runner.js")) {
  runFullPipeline().catch(err => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
```

### `src/server/webhook.ts`

```typescript
import express from "express";
import cron from "node-cron";
import { runFullPipeline } from "../pipeline/runner.js";

const app  = express();
let running = false;

app.use(express.json());

app.post("/trigger", async (_req, res) => {
  if (running) {
    res.status(409).json({ status: "running", message: "Pipeline already running" });
    return;
  }
  res.json({ status: "started", message: "Pipeline triggered" });
  running = true;
  try {
    await runFullPipeline();
  } finally {
    running = false;
  }
});

app.get("/status", (_req, res) => {
  res.json({ running });
});

// Daily 3am cron
cron.schedule("0 3 * * *", async () => {
  if (running) { console.log("Cron: pipeline already running, skipping"); return; }
  console.log("Cron: triggering daily pipeline run");
  running = true;
  try {
    await runFullPipeline();
  } finally {
    running = false;
  }
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => console.log(`Webhook server on port ${PORT}`));
```

### `src/server/dashboard-server.ts`

```typescript
import express from "express";
import path from "node:path";

const app = express();

// Serve entire project root so relative paths in dashboard/index.html resolve:
// ../videos/thumbnails/*.jpg → /videos/thumbnails/*.jpg
// ../videos/<username>_saved/*.mp4 → /videos/<username>_saved/*.mp4
app.use(express.static(path.resolve(".")));

const PORT = parseInt(process.env.DASHBOARD_PORT ?? "3001", 10);
app.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}/dashboard/`);
  console.log(`Thumbnails: http://localhost:${PORT}/videos/thumbnails/`);
});
```

---

## 6. Data Flow

```
TRIGGER
  ├─ cron: daily 3am (node-cron in webhook.ts)
  ├─ manual: npm run pipeline
  └─ POST /trigger (webhook.ts)
         │
         ▼
  runner.ts  ──  new NeuroLink() (single instance, shared across all AI agents)
         │
         ├─ Step 1: MetadataAgent
         │     execa → python3 scripts/collect_metadata.py
         │     output: videos/metadata.json
         │
         ├─ Step 2: DownloadAgent
         │     execa → python3 scripts/download_videos.py
         │     output: videos/<username>_saved/*.mp4
         │             videos/known_pks.json
         │
         ├─ Step 3: PropertiesAgent
         │     execa → ffprobe per video (JSON stdout)
         │     execa → ffmpeg per video (thumbnail JPEG)
         │     output: videos/video_properties.json
         │             videos/thumbnails/*.jpg
         │
         ├─ Step 4: ClassifierAgent  ──────────────────────────── NeuroLink
         │     load: metadata.json, video_properties.json        provider: "vertex"
         │     for each *.mp4 (skip if in classifications.json): model: "gemini-2.0-flash"
         │       input.files: [absPath]  (thumbnail if >50MB)   schema: ClassificationSchema
         │       → category/subcategory/tags/description/        disableTools: true
         │         language/mood                                 output: { format: "json" }
         │       save after each video
         │     output: videos/classifications.json
         │
         ├─ Step 5: KnowledgeAgent  ───────────────────────────── NeuroLink
         │     load: classifications.json                        same provider/model/disableTools
         │     filter: category in {AI & ML, Tech & Coding}      schema: KnowledgeSchema
         │     for each target video (skip if in knowledge_base.json + no error):
         │       → transcript/visual_description/links/
         │         key_takeaways/topics
         │       save after each video
         │     output: videos/knowledge_base.json
         │
         ├─ Step 6: LinkExtractAgent  ─────────────────────────── NeuroLink
         │     load: knowledge_base.json                         same provider/model/disableTools
         │     for each video in KB (skip if in links_v2.json):  schema: LinksSchema
         │       → {name, url, type, description, timestamp}[]
         │       save after each video
         │     output: videos/links_v2.json
         │
         ├─ Step 7: LinkResolverAgent  ────────────────────────── NeuroLink
         │     load: links_v2.json                               provider: "vertex"
         │     first pass: fix obvious partial URLs locally       NO schema (tools + schema
         │     deduplicate by name                                incompatible on Gemini)
         │     for each unique unresolved name:                  websearchGrounding active
         │       generate() → free text → regex extract URL      by default
         │       fallback: generate() with disableTools:true
         │       apply resolved URL back to all matching entries
         │       save after each resolution
         │     output: videos/links_v2.json (updated in place)
         │
         ├─ Step 8: CatalogAgent (no LLM)
         │     join: metadata.json + video_properties.json + classifications.json
         │     output: videos/catalog.json, videos/catalog.csv
         │
         ├─ Step 9: OrganizerAgent (no LLM)
         │     read: classifications.json
         │     create: videos/classified/{category}/{filename} → symlink
         │
         ├─ Step 10: MarkdownAgent (no LLM)
         │     read: knowledge_base.json + classifications.json + metadata.json
         │     output: knowledge_base/{Category}/{stem}.md
         │             knowledge_base/INDEX.md
         │
         └─ Step 11: DashboardAgent (no LLM)
               read: classifications.json + video_properties.json + metadata.json
               output: dashboard/index.html (self-contained, all data embedded)
```

**State files (unchanged from Python pipeline — backward compatible):**
```
videos/metadata.json
videos/known_pks.json
videos/video_properties.json
videos/thumbnails/
videos/<username>_saved/
videos/classifications.json
videos/knowledge_base.json
videos/links_v2.json
videos/catalog.json
videos/catalog.csv
videos/classified/
knowledge_base/
dashboard/index.html
```

---

## 7. File Map

### Create

| Path | Description |
|---|---|
| `package.json` | ESM, deps: @juspay/neurolink, execa, zod, express, node-cron |
| `tsconfig.json` | module: ESNext, target: ES2022, strict: true |
| `src/pipeline/config.ts` | All constants |
| `src/pipeline/state.ts` | loadState / saveState |
| `src/pipeline/runner.ts` | runFullPipeline() |
| `src/schemas/classification.ts` | ClassificationSchema (Zod) |
| `src/schemas/knowledge.ts` | KnowledgeSchema (Zod) |
| `src/schemas/links.ts` | LinksSchema (Zod) |
| `src/types/index.ts` | MetadataEntry, VideoProperties, etc. |
| `src/utils/rate-limit.ts` | sleep(), exponentialBackoff() |
| `src/utils/video.ts` | getVideoFiles(), extractPkFromFilename(), getThumbnailPath() |
| `src/agents/metadata.ts` | MetadataAgent |
| `src/agents/download.ts` | DownloadAgent |
| `src/agents/properties.ts` | PropertiesAgent |
| `src/agents/classifier.ts` | ClassifierAgent |
| `src/agents/knowledge.ts` | KnowledgeAgent |
| `src/agents/link-extractor.ts` | LinkExtractAgent |
| `src/agents/link-resolver.ts` | LinkResolverAgent |
| `src/agents/catalog.ts` | CatalogAgent (port of generate_catalog.py) |
| `src/agents/organizer.ts` | OrganizerAgent (port of organize_folders.py) |
| `src/agents/markdown.ts` | MarkdownAgent (port of generate_markdown.py) |
| `src/agents/dashboard.ts` | DashboardAgent (port of build_dashboard.py) |
| `src/server/webhook.ts` | Express server + cron scheduler |
| `src/server/dashboard-server.ts` | Static file server |
| `.env.example` | Template for required env vars |

### Move (preserve)

| Old path | New path |
|---|---|
| `collect_metadata.py` | `scripts/collect_metadata.py` |
| `download_videos.py` | `scripts/download_videos.py` |

### Delete after migration confirmed working

`classify_videos.py`, `extract_knowledge.py`, `extract_knowledge_batch2.py`,
`extract_links_v2.py`, `resolve_links.py`, `merge_links.py`, `rebuild_knowledge.py`,
`generate_catalog.py`, `organize_folders.py`, `generate_markdown.py`,
`build_dashboard.py`, `build_dashboard_v2.py`

---

## 8. Implementation Phases

### Phase 1: Foundation — prove the plumbing (no AI)

- [ ] Create `package.json`: `"type": "module"`, add `@juspay/neurolink`, `execa@^9`, `zod@^3`, `express@^4`, `node-cron@^3`; devDeps: `typescript@^5`, `@types/node`, `@types/express`, `@types/node-cron`
- [ ] Create `tsconfig.json` (ESM/ESNext/ES2022/strict/Bundler resolution)
- [ ] Move Python scripts: `mkdir scripts && mv collect_metadata.py download_videos.py scripts/`
- [ ] Implement `src/pipeline/config.ts`
- [ ] Implement `src/pipeline/state.ts`
- [ ] Implement `src/types/index.ts`
- [ ] Implement `src/utils/rate-limit.ts`
- [ ] Implement `src/utils/video.ts`
- [ ] Implement `MetadataAgent`, `DownloadAgent` (execa wrappers)
- [ ] Implement `PropertiesAgent` (ffprobe + ffmpeg)
- [ ] Implement `runner.ts` skeleton
- [ ] Run `npm run pipeline` with START_STEP=0 END_STEP=3 — verify steps 1-3 produce same output as Python scripts

### Phase 2: Classification agent (first real LLM call)

- [ ] Set `GOOGLE_APPLICATION_CREDENTIALS` and `VERTEX_PROJECT` in `.env`
- [ ] Create `src/schemas/classification.ts`
- [ ] Implement `ClassifierAgent`
- [ ] Test with 5 videos: verify `disableTools: true` + `schema` produces valid JSON from Gemini
- [ ] Verify resume behavior: run twice, confirm second run skips all already-classified videos
- [ ] Test rate limit handling: set `DELAY_BETWEEN_REQUESTS_MS=0` temporarily, observe exponential backoff on 429
- [ ] Run on full video set with `START_STEP=3 END_STEP=4`
- [ ] Diff output `classifications.json` with the existing Python-produced file — categories should match

### Phase 3: Knowledge and link extraction agents

- [ ] Create `src/schemas/knowledge.ts` (flat `visual_description: z.string()`)
- [ ] Implement `KnowledgeAgent`
- [ ] Run on AI/ML and Tech categories only; verify transcript quality
- [ ] Create `src/schemas/links.ts`
- [ ] Implement `LinkExtractAgent`
- [ ] Implement `LinkResolverAgent` with websearchGrounding + fallback
- [ ] Run steps 5-7 on existing videos; compare output to Python-produced `links_v2.json`
- [ ] If `websearchGrounding` doesn't ground reliably: add the `brave-search` MCP server as alternative:
  ```typescript
  await neurolink.addExternalMCPServer("brave-search", {
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY },
  });
  ```

### Phase 4: Data transformation agents (no LLM)

- [ ] Port `generate_catalog.py` → `CatalogAgent`
- [ ] Port `organize_folders.py` → `OrganizerAgent`
- [ ] Port `generate_markdown.py` → `MarkdownAgent`
- [ ] Port `build_dashboard.py` → `DashboardAgent`
- [ ] Run full pipeline end-to-end with `npm run pipeline`
- [ ] Open `dashboard/index.html` in browser — verify same data, same functionality

### Phase 5: Scheduling and serving

- [ ] Implement `src/server/webhook.ts` (Express + node-cron at 3am)
- [ ] Implement `src/server/dashboard-server.ts` (static files from project root)
- [ ] Add npm scripts: `pipeline`, `start`, `serve`
- [ ] Test `POST /trigger` → pipeline runs, `GET /status` reflects running state
- [ ] Test `GET /dashboard/` → dashboard loads with thumbnails and videos playing
- [ ] Test daily cron fires (temporarily change to every minute to verify)

### Phase 6: Hardening

- [ ] Add Langfuse observability config to `NeuroLink` constructor (optional — needs Langfuse keys)
- [ ] Add `maxBudgetUsd` to expensive `generate()` calls (ClassifierAgent, KnowledgeAgent)
- [ ] Enable TypeScript strict mode and fix all type errors
- [ ] Add `SESSION_BUDGET_EXCEEDED` error handling in `exponentialBackoff`
- [ ] Add `--dry-run` flag to runner (logs filenames that would be processed, no API calls)
- [ ] Write `.env.example`
- [ ] Write unit tests for `state.ts`, `rate-limit.ts`, `video.ts` utility functions
- [ ] Document full run time estimate: ~2-4 hours for 169 videos on Gemini 2.0 Flash (rate limited)

---

## 9. Critical Details

### Authentication

Vertex AI via NeuroLink uses standard Google Cloud auth chain:
1. `GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json` (service account, recommended)
2. Application Default Credentials (if running on GCP with Workload Identity)
3. `gcloud auth application-default login` (for local development as you@example.com)

No special NeuroLink constructor config is needed for auth — just the environment variable.

### The disableTools constraint

This is the single most important platform-specific detail:

| Call type | `disableTools` | `schema` | Result |
|---|---|---|---|
| ClassifierAgent | `true` | ClassificationSchema | Works — structured JSON |
| KnowledgeAgent | `true` | KnowledgeSchema | Works — structured JSON |
| LinkExtractAgent | `true` | LinksSchema | Works — structured JSON |
| LinkResolverAgent | not set | none | Works — websearchGrounding active, free text |
| LinkResolverAgent fallback | `true` | none | Works — pure LLM, free text |

Never combine `schema` + `output.format:"json"` with `disableTools` unset on Gemini.
Never combine `schema` + websearchGrounding/any tool on Gemini.

### Schema complexity for Gemini

- Use only `z.string()`, `z.number()`, `z.boolean()`, `z.array()`, `z.object()`, `z.enum()`, `z.nullable()`
- Avoid `z.union()`, `z.discriminatedUnion()`, `z.intersection()` — trigger "Too many states"
- The original Python output had `visual_description` as `string | Array<{timestamp,description}>` — flatten to `z.string()` only
- If deep nesting (>3 levels) causes issues, break into multiple `generate()` calls

### Resume mode guarantee

Every agent that processes items one-by-one MUST:
1. Load existing output state before the loop
2. Check `if (filename in state)` at the top of each iteration — skip if present
3. Call `await saveState(...)` INSIDE the loop, after each successful item (not after the loop)

This ensures a crash at item 50 of 169 doesn't lose items 0-49 on the next run.

### Video file size handling

```typescript
const { size } = await fs.stat(videoPath);
const inputFile = size > CONFIG.VIDEO_SIZE_THRESHOLD_BYTES
  ? (await getThumbnailPath(filename) ?? videoPath)
  : videoPath;
```

`getThumbnailPath` looks for `{THUMB_DIR}/{stem}.jpg`. If it doesn't exist (thumbnail generation
failed in PropertiesAgent), fall back to the full video and let the API handle it.

### Module system

`package.json` must have `"type": "module"`. All imports use `.js` extensions even for TypeScript
source files (standard Node.js ESM + TypeScript convention). Use `execa` v9+ (ESM-only). The
NeuroLink package is ESM-only (`"type": "module"` in its own package.json).

### Error taxonomy

| Error type | Detection | Handling |
|---|---|---|
| Rate limit | `msg.includes("429")` or `"RESOURCE_EXHAUSTED"` or `"quota"` | Exponential backoff: 10s, 20s, 40s, 80s, 160s |
| Transient | any other error, attempt < maxRetries | Linear backoff: 10s, 20s, 30s, 40s |
| Permanent | attempt == maxRetries | Record `{ error: msg }` in state, continue to next item |
| Schema validation | `ZodError` from `Schema.parse()` | Treat as permanent — LLM returned wrong structure |

The `exponentialBackoff()` utility handles classes 1-3. Schema errors inside the `fn` callback
are caught by the outer try/catch and treated as transient (the LLM may produce valid JSON on retry).

### Cost estimate

| Agent | Videos | Approx tokens | Cost at Gemini 2.0 Flash Vertex |
|---|---|---|---|
| ClassifierAgent | 169 | ~340K input, ~34K output | ~$0.04 |
| KnowledgeAgent | ~80 | ~320K input, ~64K output | ~$0.04 |
| LinkExtractAgent | ~80 | ~240K input, ~48K output | ~$0.03 |
| LinkResolverAgent | ~200 unique names | ~100K input, ~10K output | ~$0.01 |
| **Total first run** | | ~1M tokens | **~$0.12** |

Subsequent runs process only new videos (resume mode skips existing) — typically <$0.01 per daily run.

### Dashboard serving note

`dashboard/index.html` references thumbnails and videos via relative paths:
`../videos/thumbnails/*.jpg` and `../videos/<username>_saved/*.mp4`.
The static server must serve from the project root (not just `dashboard/`) so these paths resolve.
Using `express.static(path.resolve("."))` from `dashboard-server.ts` handles this correctly.
The dashboard is then at `http://localhost:3001/dashboard/`.

---

## 10. Appendices

### Appendix A: package.json

```json
{
  "name": "dopamine",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "build":    "tsc",
    "pipeline": "node dist/pipeline/runner.js",
    "start":    "node dist/server/webhook.js",
    "serve":    "node dist/server/dashboard-server.js",
    "dev":      "tsc --watch"
  },
  "dependencies": {
    "@juspay/neurolink": "latest",
    "execa":             "^9.0.0",
    "express":           "^4.19.0",
    "node-cron":         "^3.0.3",
    "zod":               "^3.23.0"
  },
  "devDependencies": {
    "@types/express":    "^4.17.21",
    "@types/node":       "^22.0.0",
    "@types/node-cron":  "^3.0.11",
    "typescript":        "^5.5.0"
  }
}
```

### Appendix B: tsconfig.json

```json
{
  "compilerOptions": {
    "target":            "ES2022",
    "module":            "ESNext",
    "moduleResolution":  "Bundler",
    "outDir":            "dist",
    "rootDir":           "src",
    "strict":            true,
    "esModuleInterop":   true,
    "skipLibCheck":      true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### Appendix C: .env.example

```bash
# Instagram (used by Python scripts in scripts/)
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=

# Google Vertex AI (used by NeuroLink — standard Google Cloud auth)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
VERTEX_PROJECT=your-gcp-project-id
VERTEX_LOCATION=us-central1

# Pipeline control (optional — run a subset of steps)
START_STEP=0
END_STEP=11

# Server ports
PORT=3000            # webhook + cron server
DASHBOARD_PORT=3001  # dashboard static server

# Optional: Langfuse observability
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
```

### Appendix D: Python → NeuroLink mapping

| Python construct | NeuroLink / TypeScript equivalent |
|---|---|
| `genai.Client(vertexai=True, project=..., location=...)` | `new NeuroLink()` + `GOOGLE_APPLICATION_CREDENTIALS` env var |
| `client.models.generate_content(model=..., contents=[video_part, prompt])` | `neurolink.generate({ input: { text: prompt, files: [absPath] }, provider: "vertex", model: "gemini-2.0-flash" })` |
| `types.Part.from_bytes(data=bytes, mime_type="video/mp4")` | `input.files: [absPath]` — NeuroLink reads and encodes automatically |
| `Tool(google_search=GoogleSearch())` in `config` | Built-in `websearchGrounding` tool — active when `disableTools` not set |
| Manual JSON parse + strip markdown fences | `schema: ZodSchema` + `output: { format: "json" }` + `disableTools: true` — NeuroLink returns clean JSON |
| `time.sleep(DELAY)` | `await sleep(DELAY_MS)` |
| Retry loop checking `"429" in str(e)` | `exponentialBackoff(fn, MAX_RETRIES, BASE_DELAY_MS)` |
| `json.dump(data, f, indent=2)` inside the loop | `await saveState(path, data)` inside the loop |
| `json.load(open(file))` with try/except for missing file | `loadState(file, defaultValue)` |
| `if filename in classifications: continue` | `if (filename in classifications) { skipped++; continue; }` |
| `os.makedirs(dir, exist_ok=True)` | `await fs.mkdir(dir, { recursive: true })` |
| `os.symlink(target, link)` | `await fs.symlink(target, link)` |
| `subprocess.run(["ffprobe", ...], capture_output=True)` | `await execa("ffprobe", [...])` then `.stdout` |