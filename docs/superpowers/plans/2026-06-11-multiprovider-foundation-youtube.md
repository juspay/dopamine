# Multi-Provider Ingestion Phase 1 — Foundation + YouTube — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Dopamine pipeline source-agnostic and add YouTube liked-videos ingestion (with real transcripts) without regressing the existing Instagram pipeline.

**Architecture:** A `SourceCollector` per source produces unified `SourceItem`s; per-content-type acquisition lanes resolve `AcquiredAssets` (mp4 frames and/or real captions); each Gemini agent builds its model input from those assets via a pure `build*Request` helper; the shared tail (steps 6–15) is unchanged.

**Tech Stack:** TypeScript (strict, ESM, named exports), vitest, googleapis + google-auth-library, yt-dlp + ffmpeg (external binaries), execa, zod, NeuroLink/Vertex.

**Spec:** `docs/superpowers/specs/2026-06-11-multiprovider-foundation-youtube-design.md`

**Conventions for every task:** TS strict (no `any`), named exports, ESM relative imports end in `.js`, tests in `src/__tests__/*.test.ts`, single-file run `npx vitest run <file>`, build `npm run build` (tsc → dist/, gitignored), conventional commits ≤100 chars, stage files explicitly. The pre-commit hook runs tsc + vitest.

**Shared-file ownership (created EXACTLY once):** `src/types/index.ts` types → Task 1 · `src/utils/vtt.ts` → Task 2 · `src/sources/youtube/map.ts` → Task 3 · `src/sources/types.ts` → Task 4 · `src/sources/instagram/{map,collector}.ts` → Task 5 · `src/pipeline/config.ts` additions → Task 6 · `src/sources/registry.ts` → Task 9 · `src/pipeline/lanes.ts` → Task 10. Later tasks IMPORT these — never re-create them.

---

### Task 1: Canonical multi-provider types

**Files:**
- Modify: `src/types/index.ts` (append after the existing `MetadataEntry`)
- Test: `src/__tests__/source-types.test.ts`

> Note: `import type` is erased by vitest's esbuild, so the *real* gate for pure types is `tsc` (`npm run build`). The test locks usage; the build catches missing members.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/source-types.test.ts
import { describe, it, expect } from "vitest";
import type { SourceItem, AcquiredAssets, SourceKind, ContentType } from "../types/index.js";

describe("multi-provider source types", () => {
  it("constructs a YouTube SourceItem", () => {
    const item: SourceItem = {
      id: "youtube_abc123",
      source: "youtube",
      content_type: "long_video",
      title: "A talk",
      author: "Chan",
      caption_text: null,
      url: "https://www.youtube.com/watch?v=abc123",
      thumbnail_url: null,
      published_at: null,
      duration_seconds: 1200,
      yt: { videoId: "abc123", channelId: "UC1", caption_file: null },
    };
    expect(item.source).toBe("youtube");
    expect(item.yt?.videoId).toBe("abc123");
  });

  it("constructs an Instagram SourceItem and AcquiredAssets", () => {
    const item: SourceItem = {
      id: "alice_100.mp4",
      source: "instagram",
      content_type: "short_video",
      title: null,
      author: "alice",
      caption_text: "hi",
      url: null,
      thumbnail_url: null,
      published_at: null,
      duration_seconds: null,
    };
    const assets: AcquiredAssets = { videoPath: "/v/x.mp4", thumbnailPath: null, transcriptText: null };
    const k: SourceKind = item.source;
    const c: ContentType = item.content_type;
    expect(k).toBe("instagram");
    expect(c).toBe("short_video");
    expect(assets.transcriptText).toBeNull();
  });
});
```

- [ ] **Step 2: Run the build, expect failure**

Run: `npm run build`
Expected: FAIL — `error TS2305: Module '"../types/index.js"' has no exported member 'SourceItem'` (and `AcquiredAssets`, `SourceKind`, `ContentType`).

- [ ] **Step 3: Implement** — append to `src/types/index.ts`:

```ts
// ---------------------------------------------------------------------------
// Multi-provider source model
// ---------------------------------------------------------------------------

/** Supported content-source providers. (Reserved future: "twitter" | "article".) */
export type SourceKind = "instagram" | "youtube";

/** Supported content formats. (Reserved future: "text_post" | "image_post" | "article_link".) */
export type ContentType = "short_video" | "long_video";

/**
 * Local assets resolved for a SourceItem before AI processing. Each agent builds
 * its own model input from whatever is present, so a real transcript is an
 * additional signal that can coexist with frames.
 */
export interface AcquiredAssets {
  /** Local mp4 → frames; null for transcript-only items (long YouTube videos). */
  videoPath: string | null;
  /** Fallback image when no/over-threshold video. */
  thumbnailPath: string | null;
  /** Authoritative caption text (YouTube); null for Instagram (frames-only). */
  transcriptText: string | null;
}

/**
 * Source-agnostic item record (the unified entry written to metadata.json).
 * id is the knowledge_base key — IG: "{username}_{pk}.mp4" (legacy); YT: "youtube_{videoId}".
 */
export interface SourceItem {
  id: string;
  source: SourceKind;
  content_type: ContentType;
  title: string | null;
  author: string | null;
  caption_text: string | null;
  url: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  /** Present for Instagram items; the full legacy record, nested for downstream compat. */
  ig?: MetadataEntry;
  /** Present for YouTube items. */
  yt?: { videoId: string; channelId: string | null; caption_file: string | null };
}
```

- [ ] **Step 4: Run the build + test, expect pass**

Run: `npm run build && npx vitest run src/__tests__/source-types.test.ts`
Expected: tsc clean; test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/__tests__/source-types.test.ts
git commit -m "feat(types): add SourceKind, ContentType, AcquiredAssets, SourceItem"
```

---

### Task 2: WebVTT → plain-text converter

**Files:**
- Create: `src/utils/vtt.ts`
- Test: `src/__tests__/vtt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/vtt.test.ts
import { describe, it, expect } from "vitest";
import { vttToText } from "../utils/vtt.js";

describe("vttToText", () => {
  it("strips header, cue indices, timing lines, and inline tags", () => {
    const vtt = [
      "WEBVTT", "",
      "1",
      "00:00:01.000 --> 00:00:03.000",
      "<c>Hello</c> world", "",
      "2",
      "00:00:03.000 --> 00:00:05.000",
      "<00:00:03.500>Second line", "",
    ].join("\n");
    expect(vttToText(vtt)).toBe("Hello world\nSecond line");
  });

  it("collapses consecutive duplicate lines (rolling auto-captions)", () => {
    const vtt = [
      "WEBVTT", "",
      "00:00:01.000 --> 00:00:02.000", "the quick",
      "00:00:02.000 --> 00:00:03.000", "the quick",
      "00:00:03.000 --> 00:00:04.000", "the quick brown",
    ].join("\n");
    expect(vttToText(vtt)).toBe("the quick\nthe quick brown");
  });

  it("handles comma decimal separators in timing lines", () => {
    expect(vttToText("WEBVTT\n\n00:00:01,000 --> 00:00:02,000\nHi\n")).toBe("Hi");
  });

  it("returns empty string for header-only input", () => {
    expect(vttToText("WEBVTT\n\n")).toBe("");
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/vtt.test.ts`
Expected: FAIL (`vttToText is not a function` — module does not exist yet).

- [ ] **Step 3: Implement**

```ts
// src/utils/vtt.ts
/**
 * Convert a WebVTT caption string to plain text.
 * Strips the WEBVTT header, bare cue-index lines, timing lines
 * ("00:00:01.000 --> 00:00:03.000 ..."), and inline tags (<c>, <00:00:01.000>, ...).
 * Collapses consecutive duplicate lines (auto-captions repeat the prior line with a
 * newly spoken word appended). Joins the remaining lines with "\n".
 */
export function vttToText(vtt: string): string {
  const out: string[] = [];
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") continue;
    if (line.startsWith("WEBVTT")) continue;
    if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s+-->\s+/.test(line)) continue; // timing line
    if (/^\d+$/.test(line)) continue;                                 // bare cue index
    const cleaned = line.replace(/<[^>]*>/g, "").trim();              // inline tags
    if (cleaned === "") continue;
    if (out.length > 0 && out[out.length - 1] === cleaned) continue;  // collapse dups
    out.push(cleaned);
  }
  return out.join("\n");
}
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npx vitest run src/__tests__/vtt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/vtt.ts src/__tests__/vtt.test.ts
git commit -m "feat(utils): add vttToText WebVTT-to-plain-text converter"
```

---

### Task 3: YouTube pure mappers (`deriveContentType`, `youtubeId`, `mapYtVideo`)

**Files:**
- Create: `src/sources/youtube/map.ts`
- Test: `src/__tests__/youtube-map.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/youtube-map.test.ts
import { describe, it, expect } from "vitest";
import { deriveContentType, youtubeId, mapYtVideo, type YtVideoRaw } from "../sources/youtube/map.js";

describe("deriveContentType", () => {
  it("classifies <= threshold as short_video (boundary included)", () => {
    expect(deriveContentType(60, 60)).toBe("short_video");
    expect(deriveContentType(59, 60)).toBe("short_video");
  });
  it("classifies > threshold as long_video", () => {
    expect(deriveContentType(61, 60)).toBe("long_video");
  });
});

describe("youtubeId", () => {
  it("prefixes the raw video id", () => {
    expect(youtubeId("abc")).toBe("youtube_abc");
  });
});

describe("mapYtVideo", () => {
  const raw: YtVideoRaw = {
    id: "vid1", title: "T", channelId: "UC1", channelTitle: "Chan",
    durationSeconds: 700, publishedAt: "2024-01-01T00:00:00Z",
    thumbnailUrl: "https://img/x.jpg", description: "desc",
  };
  it("maps to a SourceItem with youtube id/source/content_type/author/url/yt", () => {
    const item = mapYtVideo(raw, 300);
    expect(item.id).toBe("youtube_vid1");
    expect(item.source).toBe("youtube");
    expect(item.content_type).toBe("long_video");
    expect(item.author).toBe("Chan");
    expect(item.url).toBe("https://www.youtube.com/watch?v=vid1");
    expect(item.caption_text).toBe("desc");
    expect(item.yt?.videoId).toBe("vid1");
    expect(item.yt?.channelId).toBe("UC1");
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/youtube-map.test.ts`
Expected: FAIL (`deriveContentType is not a function` — module does not exist yet).

- [ ] **Step 3: Implement**

```ts
// src/sources/youtube/map.ts
import type { SourceItem, ContentType } from "../../types/index.js";

export interface YtVideoRaw {
  id: string;
  title: string;
  channelId: string | null;
  channelTitle: string | null;
  durationSeconds: number;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  description: string | null;
}

export function deriveContentType(durationSeconds: number, thresholdSeconds: number): ContentType {
  return durationSeconds <= thresholdSeconds ? "short_video" : "long_video";
}

export function youtubeId(videoId: string): string {
  return `youtube_${videoId}`;
}

export function mapYtVideo(raw: YtVideoRaw, thresholdSeconds: number): SourceItem {
  return {
    id: youtubeId(raw.id),
    source: "youtube",
    content_type: deriveContentType(raw.durationSeconds, thresholdSeconds),
    title: raw.title,
    author: raw.channelTitle,
    caption_text: raw.description,
    url: `https://www.youtube.com/watch?v=${raw.id}`,
    thumbnail_url: raw.thumbnailUrl,
    published_at: raw.publishedAt,
    duration_seconds: raw.durationSeconds,
    yt: { videoId: raw.id, channelId: raw.channelId, caption_file: null },
  };
}
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npx vitest run src/__tests__/youtube-map.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sources/youtube/map.ts src/__tests__/youtube-map.test.ts
git commit -m "feat(youtube): add pure mappers deriveContentType, youtubeId, mapYtVideo"
```

---

### Task 4: `SourceCollector` contract

**Files:**
- Create: `src/sources/types.ts`
- Test: `src/__tests__/source-collector.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/source-collector.test.ts
import { describe, it, expect, vi } from "vitest";
import type { SourceCollector } from "../sources/types.js";
import type { SourceItem, AcquiredAssets } from "../types/index.js";

const item: SourceItem = {
  id: "x_1.mp4", source: "instagram", content_type: "short_video",
  title: null, author: "x", caption_text: null, url: null,
  thumbnail_url: null, published_at: null, duration_seconds: null,
};

describe("SourceCollector contract", () => {
  it("a conforming fake implements collect() and acquire()", async () => {
    const assets: AcquiredAssets = { videoPath: "/v/x.mp4", thumbnailPath: null, transcriptText: null };
    const fake: SourceCollector = {
      source: "instagram",
      collect: vi.fn(async () => [item]),
      acquire: vi.fn(async () => assets),
    };
    expect(fake.source).toBe("instagram");
    expect(await fake.collect()).toEqual([item]);
    expect(await fake.acquire(item)).toEqual(assets);
  });

  it("acquire() may return null to skip an item", async () => {
    const fake: SourceCollector = {
      source: "youtube",
      collect: vi.fn(async () => []),
      acquire: vi.fn(async () => null),
    };
    expect(await fake.acquire(item)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the build, expect failure**

Run: `npm run build`
Expected: FAIL — `Cannot find module '../sources/types.js'` (referenced by the test).

- [ ] **Step 3: Implement**

```ts
// src/sources/types.ts
import type { SourceItem, AcquiredAssets, SourceKind } from "../types/index.js";

export interface SourceCollector {
  readonly source: SourceKind;
  collect(): Promise<SourceItem[]>;
  /** Returns null to signal this item should be skipped entirely. */
  acquire(item: SourceItem): Promise<AcquiredAssets | null>;
}
```

- [ ] **Step 4: Run the build + test, expect pass**

Run: `npm run build && npx vitest run src/__tests__/source-collector.test.ts`
Expected: tsc clean; test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sources/types.ts src/__tests__/source-collector.test.ts
git commit -m "feat(sources): add SourceCollector contract (collect + acquire)"
```

---

### Task 5: Instagram collector (wraps the existing Python scripts)

**Files:**
- Create: `src/sources/instagram/map.ts`
- Create: `src/sources/instagram/collector.ts`
- Test: `src/__tests__/instagram-map.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/instagram-map.test.ts
import { describe, it, expect } from "vitest";
import type { MetadataEntry } from "../types/index.js";
import { igMetadataToSourceItem } from "../sources/instagram/map.js";

const FIXTURE: MetadataEntry = {
  pk: "3895043733795754636", code: "ABC123", media_type: 2,
  taken_at: "2024-01-15T10:00:00Z", caption_text: "Some caption #ai",
  username: "testuser", full_name: "Test User", location: null,
  like_count: 100, comment_count: 5,
  video_url: "https://example.com/v.mp4", thumbnail_url: "https://example.com/t.jpg",
  resources: [],
};

describe("igMetadataToSourceItem", () => {
  it("derives id '{username}_{pk}.mp4', source, content_type, author", () => {
    const item = igMetadataToSourceItem(FIXTURE);
    expect(item.id).toBe("testuser_3895043733795754636.mp4");
    expect(item.source).toBe("instagram");
    expect(item.content_type).toBe("short_video");
    expect(item.author).toBe("testuser");
  });

  it("nests the full MetadataEntry under .ig and leaves yt undefined", () => {
    const item = igMetadataToSourceItem(FIXTURE);
    expect(item.ig).toStrictEqual(FIXTURE);
    expect(item.yt).toBeUndefined();
    expect(item.duration_seconds).toBeNull();
  });

  it("handles a null username (id uses empty author segment)", () => {
    const item = igMetadataToSourceItem({ ...FIXTURE, username: null });
    expect(item.id).toBe("_3895043733795754636.mp4");
    expect(item.author).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/instagram-map.test.ts`
Expected: FAIL (`igMetadataToSourceItem is not a function` — module does not exist yet).

- [ ] **Step 3: Implement**

```ts
// src/sources/instagram/map.ts
import type { MetadataEntry, SourceItem } from "../../types/index.js";

/** Map a raw Instagram MetadataEntry to a canonical SourceItem.
 *  id mirrors the legacy filename convention so knowledge_base keys stay stable. */
export function igMetadataToSourceItem(m: MetadataEntry): SourceItem {
  return {
    id: `${m.username ?? ""}_${m.pk}.mp4`,
    source: "instagram",
    content_type: "short_video",
    title: null,
    author: m.username,
    caption_text: m.caption_text,
    url: m.video_url,
    thumbnail_url: m.thumbnail_url,
    published_at: m.taken_at,
    duration_seconds: null,
    ig: m,
  };
}
```

```ts
// src/sources/instagram/collector.ts
import path from "node:path";
import fs from "node:fs/promises";
import { execa, ExecaError } from "execa";
import { CONFIG } from "../../pipeline/config.js";
import { loadState } from "../../pipeline/state.js";
import { getThumbnailPath } from "../../utils/video.js";
import { igMetadataToSourceItem } from "./map.js";
import type { MetadataEntry, AcquiredAssets, SourceItem } from "../../types/index.js";
import type { SourceCollector } from "../types.js";

async function runScript(script: string): Promise<void> {
  try {
    await execa("python3", [script], {
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
      stdout: "inherit",
      stderr: "inherit",
    });
  } catch (err) {
    const exitCode = err instanceof ExecaError ? err.exitCode : undefined;
    throw new Error(
      `${script} exited with code ${exitCode ?? "unknown"}. ` +
        "See output above for the required action (e.g. run `python3 scripts/ig_login.py`).",
    );
  }
}

export function makeInstagramCollector(): SourceCollector {
  return {
    source: "instagram",

    async collect(): Promise<SourceItem[]> {
      // Bulk metadata + download via the existing battle-tested Python scrapers.
      await runScript("scripts/collect_metadata.py");
      await runScript("scripts/download_videos.py");
      const entries = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
      return entries.filter((e) => e.media_type === 2).map(igMetadataToSourceItem);
    },

    async acquire(item: SourceItem): Promise<AcquiredAssets | null> {
      const videoPath = path.join(CONFIG.VIDEOS_DIR, item.id);
      try {
        await fs.access(videoPath);
      } catch {
        return null; // no mp4 on disk → skip (reproduces today's getVideoFiles filter)
      }
      return {
        videoPath,
        thumbnailPath: await getThumbnailPath(item.id),
        transcriptText: null,
      };
    },
  };
}
```

- [ ] **Step 4: Run the test + build, expect pass**

Run: `npx vitest run src/__tests__/instagram-map.test.ts && npm run build`
Expected: test PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/sources/instagram/map.ts src/sources/instagram/collector.ts src/__tests__/instagram-map.test.ts
git commit -m "feat(instagram): add SourceItem mapper + collector wrapping the Python scrapers"
```

---

### Task 6: Config additions (YouTube + sources)

**Files:**
- Modify: `src/pipeline/config.ts` (full replacement — adds new fields, keeps all existing ones)
- Test: `src/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/config.test.ts
import { describe, it, expect } from "vitest";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";

describe("CONFIG — multi-provider additions", () => {
  it("YT_DOWNLOAD_MAX_SECONDS defaults to 300", () => {
    expect(CONFIG.YT_DOWNLOAD_MAX_SECONDS).toBe(300);
  });
  it("SOURCES defaults to 'instagram'", () => {
    expect(CONFIG.SOURCES).toBe("instagram");
  });
  it("YOUTUBE_VIDEOS_DIR is absolute and ends with videos/youtube", () => {
    expect(path.isAbsolute(CONFIG.YOUTUBE_VIDEOS_DIR)).toBe(true);
    expect(CONFIG.YOUTUBE_VIDEOS_DIR).toMatch(/videos[/\\]youtube$/);
  });
  it("STATE.YOUTUBE_KNOWN_IDS ends with youtube_known_ids.json", () => {
    expect(CONFIG.STATE.YOUTUBE_KNOWN_IDS).toMatch(/youtube_known_ids\.json$/);
  });
  it("exposes a YOUTUBE credentials object", () => {
    expect(CONFIG.YOUTUBE).toBeDefined();
    expect("CLIENT_ID" in CONFIG.YOUTUBE).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/config.test.ts`
Expected: FAIL (`CONFIG.YT_DOWNLOAD_MAX_SECONDS` is `undefined`; new fields missing).

- [ ] **Step 3: Implement** — full `src/pipeline/config.ts`:

```ts
// src/pipeline/config.ts
import path from "node:path";

export const CONFIG = {
  INSTAGRAM_USERNAME: process.env.INSTAGRAM_USERNAME ?? "user",

  VIDEOS_DIR: path.resolve("videos", `${process.env.INSTAGRAM_USERNAME ?? "user"}_saved`),
  THUMB_DIR: path.resolve("videos", "thumbnails"),

  // Which source providers to enable (comma-separated). Default: instagram only.
  SOURCES: process.env.SOURCES ?? "instagram",

  // YouTube downloaded assets land here (separate dir to avoid id collisions).
  YOUTUBE_VIDEOS_DIR: path.resolve("videos", "youtube"),

  // YouTube OAuth2 credentials (refresh token is written by `npm run youtube:auth`).
  YOUTUBE: {
    CLIENT_ID:     process.env.YOUTUBE_CLIENT_ID,
    CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,
    REFRESH_TOKEN: process.env.YOUTUBE_REFRESH_TOKEN,
  },

  // Download the mp4 only for YouTube videos at/under this duration (seconds).
  YT_DOWNLOAD_MAX_SECONDS: parseInt(process.env.YT_DOWNLOAD_MAX_SECONDS ?? "300", 10),

  STATE: {
    METADATA:          path.resolve("videos", "metadata.json"),
    KNOWN_PKS:         path.resolve("videos", "known_pks.json"),
    YOUTUBE_KNOWN_IDS: path.resolve("videos", "youtube_known_ids.json"),
    PROPERTIES:        path.resolve("videos", "video_properties.json"),
    CLASSIFICATIONS:   path.resolve("videos", "classifications.json"),
    KNOWLEDGE_BASE:    path.resolve("videos", "knowledge_base.json"),
    LINKS_V2:          path.resolve("videos", "links_v2.json"),
    CATALOG:           path.resolve("videos", "catalog.json"),
    CATALOG_CSV:       path.resolve("videos", "catalog.csv"),
    ANALYSIS:          path.resolve("videos", "analysis.json"),
    RESEARCH:          path.resolve("videos", "research.json"),
    IMPLEMENTATIONS:   path.resolve("videos", "implementations.json"),
    VERIFICATIONS:     path.resolve("videos", "verifications.json"),
  },

  OUTPUT: {
    CLASSIFIED:     path.resolve("videos", "classified"),
    KNOWLEDGE_BASE: path.resolve("knowledge_base"),
    DASHBOARD:      path.resolve("dashboard", "index.html"),
  },

  MODEL:           process.env.MODEL ?? "gemini-3.1-flash-image-preview",
  VERTEX_PROJECT:  process.env.VERTEX_PROJECT  ?? "your-gcp-project-id",
  VERTEX_LOCATION: process.env.VERTEX_LOCATION ?? "global",

  KNOWLEDGE_TARGET_CATEGORIES: new Set(
    process.env.KB_CATEGORIES
      ? process.env.KB_CATEGORIES.split(",").map((s) => s.trim())
      : ["AI & Machine Learning", "Tech & Coding", "Business & Marketing", "UI/UX Design"]
  ),

  DELAY_BETWEEN_REQUESTS_MS: parseInt(process.env.DELAY_MS ?? "500", 10),
  MAX_RETRIES: 5,
  RETRY_BASE_DELAY_MS: 10_000,

  VIDEO_SIZE_THRESHOLD_BYTES: parseInt(process.env.VIDEO_SIZE_THRESHOLD ?? String(20 * 1024 * 1024), 10),
} as const;
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npx vitest run src/__tests__/config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/config.ts src/__tests__/config.test.ts
git commit -m "feat(config): add SOURCES, YT_DOWNLOAD_MAX_SECONDS, YOUTUBE creds, youtube dirs/state"
```

---

### Task 7: yt-dlp arg builders + OAuth client (writes refresh token to .env)

**Files:**
- Create: `src/sources/youtube/ytdlp.ts`
- Create: `src/sources/youtube/auth.ts`
- Test: `src/__tests__/youtube-ytdlp.test.ts`
- Test: `src/__tests__/youtube-auth.test.ts`

> Requires the `google-auth-library` dependency (installed in Task 14). If running this task standalone first, run `npm install google-auth-library googleapis` now.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/youtube-ytdlp.test.ts
import { describe, it, expect } from "vitest";
import { buildCaptionArgs, buildVideoArgs } from "../sources/youtube/ytdlp.js";

describe("buildCaptionArgs", () => {
  it("requests subs + auto-subs in English, skips the download, sets -o and the watch URL", () => {
    const a = buildCaptionArgs("dQw4w9WgXcQ", "/tmp/%(id)s");
    expect(a).toContain("--write-subs");
    expect(a).toContain("--write-auto-subs");
    expect(a[a.indexOf("--sub-langs") + 1]).toBe("en");
    expect(a).toContain("--skip-download");
    expect(a[a.indexOf("-o") + 1]).toBe("/tmp/%(id)s");
    expect(a).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});

describe("buildVideoArgs", () => {
  it("requests mp4, does NOT skip download, sets -o and the watch URL", () => {
    const a = buildVideoArgs("dQw4w9WgXcQ", "/tmp/out.mp4");
    expect(a[a.indexOf("-f") + 1]).toBe("mp4");
    expect(a).not.toContain("--skip-download");
    expect(a[a.indexOf("-o") + 1]).toBe("/tmp/out.mp4");
    expect(a).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
```

```ts
// src/__tests__/youtube-auth.test.ts
import { describe, it, expect } from "vitest";
import { buildOAuthClient, type YoutubeAuthEnv } from "../sources/youtube/auth.js";

const valid: YoutubeAuthEnv = { clientId: "id", clientSecret: "secret", refreshToken: "refresh" };

describe("buildOAuthClient", () => {
  it("returns a client with the refresh token set when all fields present", () => {
    const c = buildOAuthClient(valid);
    expect(typeof c.generateAuthUrl).toBe("function");
    expect(c.credentials.refresh_token).toBe("refresh");
  });
  it("throws naming the missing var", () => {
    expect(() => buildOAuthClient({ ...valid, clientId: undefined })).toThrow(/YOUTUBE_CLIENT_ID/);
    expect(() => buildOAuthClient({ ...valid, clientSecret: undefined })).toThrow(/YOUTUBE_CLIENT_SECRET/);
    expect(() => buildOAuthClient({ ...valid, refreshToken: undefined })).toThrow(/YOUTUBE_REFRESH_TOKEN/);
  });
});
```

- [ ] **Step 2: Run the tests, expect failure**

Run: `npx vitest run src/__tests__/youtube-ytdlp.test.ts src/__tests__/youtube-auth.test.ts`
Expected: FAIL (`buildCaptionArgs` / `buildOAuthClient` are not functions — modules do not exist yet).

- [ ] **Step 3: Implement**

```ts
// src/sources/youtube/ytdlp.ts
export function buildCaptionArgs(videoId: string, outTemplate: string): string[] {
  return [
    "--write-subs", "--write-auto-subs", "--sub-langs", "en", "--skip-download",
    "-o", outTemplate, `https://www.youtube.com/watch?v=${videoId}`,
  ];
}

export function buildVideoArgs(videoId: string, outTemplate: string): string[] {
  return ["-f", "mp4", "-o", outTemplate, `https://www.youtube.com/watch?v=${videoId}`];
}
```

```ts
// src/sources/youtube/auth.ts
import fs from "node:fs";
import { OAuth2Client } from "google-auth-library";

export interface YoutubeAuthEnv {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

/** Build an OAuth2Client pre-loaded with credentials. Throws (naming the missing
 *  env var) if any field is absent. */
export function buildOAuthClient(env: YoutubeAuthEnv): OAuth2Client {
  if (!env.clientId) throw new Error("Missing YOUTUBE_CLIENT_ID — set it in .env (Google Cloud OAuth client).");
  if (!env.clientSecret) throw new Error("Missing YOUTUBE_CLIENT_SECRET — set it in .env (Google Cloud OAuth client).");
  if (!env.refreshToken) throw new Error("Missing YOUTUBE_REFRESH_TOKEN — run `npm run youtube:auth` once to obtain it.");
  const client = new OAuth2Client({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    redirectUri: "urn:ietf:wg:oauth:2.0:oob",
  });
  client.setCredentials({ refresh_token: env.refreshToken });
  return client;
}

/** Upsert KEY=value in a dotenv file (append if absent, replace the line if present). */
export function upsertEnvVar(envPath: string, key: string, value: string): void {
  const line = `${key}=${value}`;
  let body = "";
  try { body = fs.readFileSync(envPath, "utf8"); } catch { body = ""; }
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(body)) body = body.replace(re, line);
  else body = body.length === 0 || body.endsWith("\n") ? body + line + "\n" : body + "\n" + line + "\n";
  fs.writeFileSync(envPath, body, "utf8");
}

/** CLI: run the installed-app consent flow and WRITE the refresh token to .env. */
async function main(): Promise<void> {
  const { createInterface } = await import("node:readline");
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env before running this.");
    process.exit(1);
  }
  const client = new OAuth2Client({ clientId, clientSecret, redirectUri: "urn:ietf:wg:oauth:2.0:oob" });
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.readonly"],
  });
  console.log("\nOpen this URL, authorise, and paste the code:\n\n" + authUrl + "\n");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise<string>((res) => rl.question("Authorisation code: ", (a) => { rl.close(); res(a.trim()); }));
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    console.error("No refresh_token returned. Revoke prior access at https://myaccount.google.com/permissions and retry.");
    process.exit(1);
  }
  upsertEnvVar(".env", "YOUTUBE_REFRESH_TOKEN", tokens.refresh_token);
  console.log("\n✓ Wrote YOUTUBE_REFRESH_TOKEN to .env");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => { console.error("Auth flow failed:", err); process.exit(1); });
}
```

- [ ] **Step 4: Run the tests, expect pass**

Run: `npx vitest run src/__tests__/youtube-ytdlp.test.ts src/__tests__/youtube-auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sources/youtube/ytdlp.ts src/sources/youtube/auth.ts src/__tests__/youtube-ytdlp.test.ts src/__tests__/youtube-auth.test.ts
git commit -m "feat(youtube): add yt-dlp arg builders + OAuth client (writes refresh token to .env)"
```

---

### Task 8: YouTube collector + download (with known-id dedup)

**Files:**
- Create: `src/sources/youtube/collector.ts`
- Create: `src/sources/youtube/download.ts`
- Test: `src/__tests__/youtube-collector.test.ts`
- Test: `src/__tests__/youtube-download.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/youtube-collector.test.ts
import { describe, it, expect, vi } from "vitest";
import { collectYoutubeItems, dedupeNewItems, type YtListPage, type YtListFn } from "../sources/youtube/collector.js";
import type { SourceItem } from "../types/index.js";

const raw = (id: string, dur: number) => ({
  id, title: `T-${id}`, channelId: "UC1", channelTitle: "Chan",
  durationSeconds: dur, publishedAt: null, thumbnailUrl: null, description: null,
});

describe("collectYoutubeItems", () => {
  it("paginates and maps every page item", async () => {
    const listFn: YtListFn = vi.fn()
      .mockResolvedValueOnce({ items: [raw("a", 58)], nextPageToken: "P2" } as YtListPage)
      .mockResolvedValueOnce({ items: [raw("b", 720)], nextPageToken: null } as YtListPage);
    const items = await collectYoutubeItems(listFn, 60);
    expect(listFn).toHaveBeenNthCalledWith(1, null);
    expect(listFn).toHaveBeenNthCalledWith(2, "P2");
    expect(items.map((i) => i.id)).toEqual(["youtube_a", "youtube_b"]);
    expect(items[0].content_type).toBe("short_video");
    expect(items[1].content_type).toBe("long_video");
  });
});

describe("dedupeNewItems", () => {
  it("returns only items whose id is not in knownIds, plus the union of ids", () => {
    const items: SourceItem[] = [
      { id: "youtube_a", source: "youtube", content_type: "short_video", title: null, author: null, caption_text: null, url: null, thumbnail_url: null, published_at: null, duration_seconds: null },
      { id: "youtube_b", source: "youtube", content_type: "short_video", title: null, author: null, caption_text: null, url: null, thumbnail_url: null, published_at: null, duration_seconds: null },
    ];
    const { fresh, allIds } = dedupeNewItems(items, new Set(["youtube_a"]));
    expect(fresh.map((i) => i.id)).toEqual(["youtube_b"]);
    expect(new Set(allIds)).toEqual(new Set(["youtube_a", "youtube_b"]));
  });
});
```

```ts
// src/__tests__/youtube-download.test.ts
import { describe, it, expect, vi } from "vitest";
import { acquireYoutube, type ExecRunner } from "../sources/youtube/download.js";
import type { SourceItem } from "../types/index.js";

const item = (over: Partial<SourceItem> = {}): SourceItem => ({
  id: "youtube_vid001", source: "youtube", content_type: "long_video",
  title: "T", author: "Chan", caption_text: null,
  url: "https://www.youtube.com/watch?v=vid001", thumbnail_url: null,
  published_at: null, duration_seconds: 600,
  yt: { videoId: "vid001", channelId: "UC1", caption_file: null }, ...over,
});

describe("acquireYoutube — long video", () => {
  it("fetches captions only, parses the VTT, leaves videoPath null", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue("WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello world\n");
    const r = await acquireYoutube(item(), { run, readVtt, outDir: "/tmp/yt" });
    expect(run).toHaveBeenCalledTimes(1);
    expect((run as ReturnType<typeof vi.fn>).mock.calls[0][1]).toContain("--skip-download");
    expect(r.videoPath).toBeNull();
    expect(r.transcriptText).toBe("Hello world");
  });
});

describe("acquireYoutube — short video", () => {
  it("fetches captions AND the mp4, returns both signals", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n");
    const r = await acquireYoutube(item({ content_type: "short_video" }), { run, readVtt, outDir: "/tmp/yt" });
    expect(run).toHaveBeenCalledTimes(2);
    expect((run as ReturnType<typeof vi.fn>).mock.calls[1][1]).not.toContain("--skip-download");
    expect(r.videoPath).toMatch(/vid001\.mp4$/);
    expect(r.transcriptText).toBe("Hi");
  });
});
```

- [ ] **Step 2: Run the tests, expect failure**

Run: `npx vitest run src/__tests__/youtube-collector.test.ts src/__tests__/youtube-download.test.ts`
Expected: FAIL (`collectYoutubeItems` / `acquireYoutube` are not functions — modules do not exist yet).

- [ ] **Step 3: Implement**

```ts
// src/sources/youtube/download.ts
import path from "node:path";
import { buildCaptionArgs, buildVideoArgs } from "./ytdlp.js";
import { vttToText } from "../../utils/vtt.js";
import type { SourceItem, AcquiredAssets } from "../../types/index.js";

export type ExecRunner = (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export interface AcquireDeps {
  run: ExecRunner;
  readVtt: (p: string) => Promise<string | null>;
  outDir: string;
}

export async function acquireYoutube(item: SourceItem, deps: AcquireDeps): Promise<AcquiredAssets> {
  const videoId = item.yt?.videoId;
  if (!videoId) return { videoPath: null, thumbnailPath: null, transcriptText: null };
  const { run, readVtt, outDir } = deps;

  await run("yt-dlp", buildCaptionArgs(videoId, path.join(outDir, `${videoId}.%(ext)s`)));

  let transcriptText: string | null = null;
  for (const candidate of [path.join(outDir, `${videoId}.en.vtt`), path.join(outDir, `${videoId}.en-US.vtt`)]) {
    const vtt = await readVtt(candidate);
    if (vtt !== null) { transcriptText = vttToText(vtt); break; }
  }

  let videoPath: string | null = null;
  if (item.content_type === "short_video") {
    const mp4 = path.join(outDir, `${videoId}.mp4`);
    await run("yt-dlp", buildVideoArgs(videoId, mp4));
    videoPath = mp4;
  }
  return { videoPath, thumbnailPath: null, transcriptText };
}
```

```ts
// src/sources/youtube/collector.ts
import fs from "node:fs/promises";
import { execa } from "execa";
import { CONFIG } from "../../pipeline/config.js";
import { loadState, saveState } from "../../pipeline/state.js";
import { buildOAuthClient } from "./auth.js";
import { mapYtVideo, type YtVideoRaw } from "./map.js";
import { acquireYoutube } from "./download.js";
import type { SourceItem, AcquiredAssets } from "../../types/index.js";
import type { SourceCollector } from "../types.js";

export type YtListPage = { items: YtVideoRaw[]; nextPageToken: string | null };
export type YtListFn = (pageToken: string | null) => Promise<YtListPage>;

/** Paginate a list function and map every raw video to a SourceItem (pure given listFn). */
export async function collectYoutubeItems(listFn: YtListFn, thresholdSeconds: number): Promise<SourceItem[]> {
  const items: SourceItem[] = [];
  let pageToken: string | null = null;
  do {
    const page = await listFn(pageToken);
    for (const raw of page.items) items.push(mapYtVideo(raw, thresholdSeconds));
    pageToken = page.nextPageToken;
  } while (pageToken !== null);
  return items;
}

/** Split items into those not yet seen, and the union of all ids (for persistence). */
export function dedupeNewItems(items: SourceItem[], knownIds: Set<string>): { fresh: SourceItem[]; allIds: string[] } {
  const fresh = items.filter((i) => !knownIds.has(i.id));
  const allIds = [...new Set([...knownIds, ...items.map((i) => i.id)])];
  return { fresh, allIds };
}

/** Parse an ISO-8601 duration (e.g. "PT4M13S") to seconds. */
function isoDurationToSeconds(d: string): number {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return (parseInt(m?.[1] ?? "0", 10) * 3600) + (parseInt(m?.[2] ?? "0", 10) * 60) + parseInt(m?.[3] ?? "0", 10);
}

function makeRealListFn(): YtListFn {
  return async (pageToken) => {
    const { google } = await import("googleapis");
    const youtube = google.youtube({ version: "v3", auth: buildOAuthClient(CONFIG.YOUTUBE) });
    const res = await youtube.videos.list({
      part: ["snippet", "contentDetails"],
      myRating: "like",
      maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    const items: YtVideoRaw[] = (res.data.items ?? []).map((v) => ({
      id: v.id ?? "",
      title: v.snippet?.title ?? "",
      channelId: v.snippet?.channelId ?? null,
      channelTitle: v.snippet?.channelTitle ?? null,
      durationSeconds: isoDurationToSeconds(v.contentDetails?.duration ?? "PT0S"),
      publishedAt: v.snippet?.publishedAt ?? null,
      thumbnailUrl: v.snippet?.thumbnails?.maxres?.url ?? v.snippet?.thumbnails?.high?.url ?? null,
      description: v.snippet?.description ?? null,
    }));
    return { items, nextPageToken: res.data.nextPageToken ?? null };
  };
}

export function makeYoutubeCollector(): SourceCollector {
  return {
    source: "youtube",

    async collect(): Promise<SourceItem[]> {
      const all = await collectYoutubeItems(makeRealListFn(), CONFIG.YT_DOWNLOAD_MAX_SECONDS);
      const known = new Set(await loadState<string[]>(CONFIG.STATE.YOUTUBE_KNOWN_IDS, []));
      const { fresh, allIds } = dedupeNewItems(all, known);
      await saveState(CONFIG.STATE.YOUTUBE_KNOWN_IDS, allIds);
      return fresh;
    },

    async acquire(item: SourceItem): Promise<AcquiredAssets | null> {
      const run: ExecRunnerLocal = async (cmd, args) => {
        const r = await execa(cmd, args);
        return { stdout: r.stdout, stderr: r.stderr };
      };
      const readVtt = async (p: string): Promise<string | null> => {
        try { return await fs.readFile(p, "utf8"); } catch { return null; }
      };
      await fs.mkdir(CONFIG.YOUTUBE_VIDEOS_DIR, { recursive: true });
      return acquireYoutube(item, { run, readVtt, outDir: CONFIG.YOUTUBE_VIDEOS_DIR });
    },
  };
}

type ExecRunnerLocal = (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
```

- [ ] **Step 4: Run the tests + build, expect pass**

Run: `npx vitest run src/__tests__/youtube-collector.test.ts src/__tests__/youtube-download.test.ts && npm run build`
Expected: tests PASS; tsc clean (requires `googleapis`/`google-auth-library` from Task 14 — install now if running standalone).

- [ ] **Step 5: Commit**

```bash
git add src/sources/youtube/collector.ts src/sources/youtube/download.ts src/__tests__/youtube-collector.test.ts src/__tests__/youtube-download.test.ts
git commit -m "feat(youtube): add collector (with known-id dedup) + per-item download/acquire"
```

---

### Task 9: Source registry

**Files:**
- Create: `src/sources/registry.ts`
- Test: `src/__tests__/registry.test.ts`

> ESM static imports only — no `require()` (this project is `"type": "module"`).

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/registry.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../sources/instagram/collector.js", () => ({
  makeInstagramCollector: vi.fn(() => ({ source: "instagram" as const, collect: vi.fn(), acquire: vi.fn() })),
}));
vi.mock("../sources/youtube/collector.js", () => ({
  makeYoutubeCollector: vi.fn(() => ({ source: "youtube" as const, collect: vi.fn(), acquire: vi.fn() })),
}));

import { getEnabledCollectors } from "../sources/registry.js";

describe("getEnabledCollectors", () => {
  it("defaults to [instagram] when undefined", () => {
    const c = getEnabledCollectors(undefined);
    expect(c.map((x) => x.source)).toEqual(["instagram"]);
  });
  it("returns both for 'instagram,youtube'", () => {
    expect(getEnabledCollectors("instagram,youtube").map((x) => x.source).sort()).toEqual(["instagram", "youtube"]);
  });
  it("trims whitespace and dedupes repeats", () => {
    expect(getEnabledCollectors(" instagram , instagram ").map((x) => x.source)).toEqual(["instagram"]);
  });
  it("ignores unknown tokens with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const c = getEnabledCollectors("instagram,tiktok");
    expect(c.map((x) => x.source)).toEqual(["instagram"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("tiktok"));
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/registry.test.ts`
Expected: FAIL (`getEnabledCollectors is not a function` — module does not exist yet).

- [ ] **Step 3: Implement**

```ts
// src/sources/registry.ts
import { makeInstagramCollector } from "./instagram/collector.js";
import { makeYoutubeCollector } from "./youtube/collector.js";
import type { SourceCollector } from "./types.js";
import type { SourceKind } from "../types/index.js";

const FACTORY_MAP: Record<SourceKind, () => SourceCollector> = {
  instagram: makeInstagramCollector,
  youtube: makeYoutubeCollector,
};

/** Parse the comma-separated SOURCES string → one collector per unique known token.
 *  Unknown tokens are skipped with a warning. Default (undefined) → ["instagram"]. */
export function getEnabledCollectors(sourcesEnv: string | undefined): SourceCollector[] {
  const raw = sourcesEnv ?? "instagram";
  const seen = new Set<SourceKind>();
  const collectors: SourceCollector[] = [];
  for (const token of raw.split(",")) {
    const name = token.trim();
    if (name === "") continue;
    if (!(name in FACTORY_MAP)) {
      console.warn(`[registry] Unknown source "${name}" — ignoring. Valid: ${Object.keys(FACTORY_MAP).join(", ")}`);
      continue;
    }
    const kind = name as SourceKind;
    if (seen.has(kind)) continue;
    seen.add(kind);
    collectors.push(FACTORY_MAP[kind]());
  }
  return collectors;
}
```

- [ ] **Step 4: Run the test + build, expect pass**

Run: `npx vitest run src/__tests__/registry.test.ts && npm run build`
Expected: test PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/sources/registry.ts src/__tests__/registry.test.ts
git commit -m "feat(sources): add registry (getEnabledCollectors) over SOURCES env"
```

---

### Task 10: Acquisition lanes (`acquireAll`)

**Files:**
- Create: `src/pipeline/lanes.ts`
- Test: `src/__tests__/lanes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/lanes.test.ts
import { describe, it, expect, vi } from "vitest";
import type { SourceItem, AcquiredAssets, SourceKind } from "../types/index.js";
import type { SourceCollector } from "../sources/types.js";
import { acquireAll } from "../pipeline/lanes.js";

const item = (id: string, source: SourceKind = "instagram"): SourceItem => ({
  id, source, content_type: "short_video", title: null, author: null,
  caption_text: null, url: null, thumbnail_url: null, published_at: null, duration_seconds: null,
});
const assets = (id: string): AcquiredAssets => ({ videoPath: `/tmp/${id}.mp4`, thumbnailPath: null, transcriptText: null });

describe("acquireAll", () => {
  it("keeps only non-null acquire results and pairs them correctly", async () => {
    const collector: SourceCollector = {
      source: "instagram", collect: vi.fn(async () => []),
      acquire: vi.fn(async (i: SourceItem) => (i.id === "a" ? assets("a") : null)),
    };
    const registry = new Map<SourceKind, SourceCollector>([["instagram", collector]]);
    const result = await acquireAll([item("a"), item("b")], registry);
    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe("a");
    expect(result[0].assets).toEqual(assets("a"));
  });

  it("drops items whose source has no registered collector", async () => {
    const result = await acquireAll([item("yt", "youtube")], new Map());
    expect(result).toHaveLength(0);
  });

  it("processes all items under bounded concurrency without losing results", async () => {
    let active = 0, peak = 0;
    const collector: SourceCollector = {
      source: "instagram", collect: vi.fn(async () => []),
      acquire: vi.fn(async (i: SourceItem) => {
        active++; peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 3));
        active--; return assets(i.id);
      }),
    };
    const registry = new Map<SourceKind, SourceCollector>([["instagram", collector]]);
    const items = Array.from({ length: 8 }, (_, i) => item(`c-${i}`));
    const result = await acquireAll(items, registry, 3);
    expect(result).toHaveLength(8);
    expect(peak).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/lanes.test.ts`
Expected: FAIL (`Cannot find module '../pipeline/lanes.js'`).

- [ ] **Step 3: Implement**

```ts
// src/pipeline/lanes.ts
import type { SourceItem, AcquiredAssets, SourceKind } from "../types/index.js";
import type { SourceCollector } from "../sources/types.js";

export interface LaneItem {
  item: SourceItem;
  assets: AcquiredAssets;
}

/** Acquire assets for every item via its source's collector. Items with no
 *  registered collector, or whose acquire() returns null, are dropped.
 *  Bounded concurrency (default 4) caps simultaneous subprocesses / file handles. */
export async function acquireAll(
  items: SourceItem[],
  registry: Map<SourceKind, SourceCollector>,
  concurrency = 4,
): Promise<LaneItem[]> {
  const results: LaneItem[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const item = items[index++];
      const collector = registry.get(item.source);
      if (!collector) continue;
      try {
        const assets = await collector.acquire(item);
        if (assets !== null) results.push({ item, assets });
      } catch (err) {
        console.error(`[lanes] acquire failed for ${item.id}: ${String(err).split("\n")[0]}`);
      }
    }
  }

  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}
```

- [ ] **Step 4: Run the test + build, expect pass**

Run: `npx vitest run src/__tests__/lanes.test.ts && npm run build`
Expected: test PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/lanes.ts src/__tests__/lanes.test.ts
git commit -m "feat(pipeline): add LaneItem + acquireAll with bounded concurrency"
```

---

### Task 11: Knowledge agent — `buildKnowledgeRequest` + transcript wiring

**Files:**
- Modify: `src/agents/knowledge.ts`
- Test: `src/__tests__/knowledge-request.test.ts`

**No-regression invariant:** with `transcriptText: null` and frames present, the request is byte-identical to today (10 frames + the frames-only note). The both-null branch must NOT call `path.resolve("")`.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/knowledge-request.test.ts
import { describe, it, expect } from "vitest";
import { buildKnowledgeRequest } from "../agents/knowledge.js";
import type { AcquiredAssets } from "../types/index.js";

const FRAMES_ONLY_NOTE =
  "\n\nNote: You are analyzing video frames (images), not the full video file. " +
  "Audio/speech is not available. For the transcript field, describe any visible text, captions, " +
  "speech bubbles, or on-screen text you can read. If none is visible, set it to an empty string.";

const frames = (n: number): Buffer[] => Array.from({ length: n }, (_, i) => Buffer.from(`f${i}`));

describe("buildKnowledgeRequest", () => {
  it("frames only (IG): images branch + frames-only note + null override", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: "/t.jpg", transcriptText: null };
    const req = buildKnowledgeRequest(a, frames(10));
    expect(req.input.images).toEqual(frames(10));
    expect(req.input.text).toContain(FRAMES_ONLY_NOTE);
    expect(req.input.files).toBeUndefined();
    expect(req.transcriptOverride).toBeNull();
  });

  it("frames + transcript (short YT): images branch + transcript note + override set", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: null, transcriptText: "Real captions." };
    const req = buildKnowledgeRequest(a, frames(5));
    expect(req.input.images).toEqual(frames(5));
    expect(req.input.text).not.toContain(FRAMES_ONLY_NOTE);
    expect(req.input.text).toContain("Official transcript provided");
    expect(req.transcriptOverride).toBe("Real captions.");
  });

  it("transcript only (long YT): text-only branch + override set", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: null, transcriptText: "YT transcript." };
    const req = buildKnowledgeRequest(a, null);
    expect(req.input.images).toBeUndefined();
    expect(req.input.files).toBeUndefined();
    expect(req.input.text).toContain("YT transcript.");
    expect(req.transcriptOverride).toBe("YT transcript.");
  });

  it("thumbnail only: files branch with the resolved thumbnail", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: "/abs/thumb.jpg", transcriptText: null };
    const req = buildKnowledgeRequest(a, null);
    expect(req.input.files?.[0]).toBe("/abs/thumb.jpg");
    expect(req.transcriptOverride).toBeNull();
  });

  it("nothing available (both null): text-only, no files, null override", () => {
    const req = buildKnowledgeRequest({ videoPath: null, thumbnailPath: null, transcriptText: null }, null);
    expect(req.input.images).toBeUndefined();
    expect(req.input.files).toBeUndefined();
    expect(req.transcriptOverride).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/knowledge-request.test.ts`
Expected: FAIL (`buildKnowledgeRequest is not a function`).

- [ ] **Step 3: Implement** — full `src/agents/knowledge.ts`:

```ts
// src/agents/knowledge.ts
import { type NeuroLink, NeuroLink as NeuroLinkClass } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { KnowledgeSchema, type Knowledge } from "../schemas/knowledge.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { getThumbnailPath, extractVideoFrames } from "../utils/video.js";
import { isKnowledgeComplete, mergeKnowledge } from "./knowledge-merge.js";
import type { AcquiredAssets } from "../types/index.js";
import type { LaneItem } from "../pipeline/lanes.js";

interface ClassificationEntry { pk?: string | null; category?: string; error?: string; }

interface KnowledgeEntry extends Knowledge {
  filename: string;
  category: string;
  error?: string;
  low_content?: boolean;
}

export const KNOWLEDGE_PROMPT = `
Analyze this video in extreme detail. Extract all knowledge content.

You MUST provide:
1. A complete, word-for-word transcript of ALL speech. Include speaker labels if multiple speakers.
   If there is no speech, describe the audio in detail.
2. A detailed visual description of everything shown on screen — slides, code, demos, websites,
   apps, text overlays, diagrams. Include timestamps inline where content changes.
3. Every URL, website, tool, product, or resource mentioned or shown — with timestamps.
4. 3-7 key takeaways as bullet points. ALWAYS produce at least 3 takeaways.
   For tutorial/educational videos, capture the actionable lessons or steps.
   For product/tool videos, describe what the product is and what makes it noteworthy.
   For entertainment/lifestyle/aesthetic content, describe the format, theme, mood, or
   what the viewer is meant to feel or learn from watching. Never return an empty list —
   every saved video has SOME reason it was saved; capture that reason as takeaways.
5. All specific topics and technologies discussed (or themes for non-technical videos).

Be extremely thorough. Do not summarize — capture everything.
Return ONLY valid JSON matching the schema provided. No markdown fences.`;

const FRAMES_ONLY_NOTE =
  "\n\nNote: You are analyzing video frames (images), not the full video file. " +
  "Audio/speech is not available. For the transcript field, describe any visible text, captions, " +
  "speech bubbles, or on-screen text you can read. If none is visible, set it to an empty string.";

const TRANSCRIPT_WITH_FRAMES_NOTE =
  "\n\nOfficial transcript provided — use it verbatim for the transcript field. " +
  "Analyze the video frames for visual_description, topics, key_takeaways, and links_and_resources.";

const MIN_VISUAL_CHARS = parseInt(process.env.MIN_VISUAL_CHARS ?? "200", 10);

export interface KnowledgeRequest {
  input: { text: string; images?: Buffer[]; files?: string[] };
  transcriptOverride: string | null;
}

/** Build the NeuroLink input from resolved assets + pre-extracted frames.
 *  Priority: frames (+optional transcript) → transcript-only → thumbnail/video file → text-only. */
export function buildKnowledgeRequest(assets: AcquiredAssets, frames: Buffer[] | null): KnowledgeRequest {
  if (frames !== null && frames.length > 0) {
    if (assets.transcriptText !== null) {
      return {
        input: { text: KNOWLEDGE_PROMPT + TRANSCRIPT_WITH_FRAMES_NOTE, images: frames },
        transcriptOverride: assets.transcriptText,
      };
    }
    return {
      input: { text: KNOWLEDGE_PROMPT + FRAMES_ONLY_NOTE, images: frames },
      transcriptOverride: null,
    };
  }

  if (assets.transcriptText !== null) {
    return {
      input: { text: KNOWLEDGE_PROMPT + "\n\nOfficial transcript:\n" + assets.transcriptText },
      transcriptOverride: assets.transcriptText,
    };
  }

  // File fallback — guard against both null (never path.resolve("")).
  const filePath = assets.thumbnailPath ?? assets.videoPath;
  if (filePath === null) {
    return { input: { text: KNOWLEDGE_PROMPT }, transcriptOverride: null };
  }
  return { input: { text: KNOWLEDGE_PROMPT, files: [path.resolve(filePath)] }, transcriptOverride: null };
}

export async function runKnowledgeAgent(neurolink: NeuroLink, laneItems?: LaneItem[]): Promise<void> {
  const classifications = await loadState<Record<string, ClassificationEntry>>(CONFIG.STATE.CLASSIFICATIONS, {});
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(CONFIG.STATE.KNOWLEDGE_BASE, {});
  const laneMap = new Map<string, LaneItem>((laneItems ?? []).map((l) => [l.item.id, l]));

  const targetVideos = Object.entries(classifications).filter(([, cls]) => cls.category && !cls.error);
  console.log(`Knowledge extraction: ${targetVideos.length} classified videos`);

  let extracted = 0, skipped = 0, errors = 0;

  for (const [i, [filename, cls]] of targetVideos.entries()) {
    const logPrefix = `[${i + 1}/${targetVideos.length}]`;
    const existing = knowledgeBase[filename];
    const visualLen = String(existing?.visual_description ?? "").trim().length;
    const takeawayCount = Array.isArray(existing?.key_takeaways) ? existing!.key_takeaways.length : 0;

    if (isKnowledgeComplete(existing, MIN_VISUAL_CHARS)) { skipped++; console.log(`${logPrefix} SKIP (already extracted): ${filename}`); continue; }
    if (existing?.low_content) { skipped++; console.log(`${logPrefix} SKIP (known low-content): ${filename}`); continue; }
    if (existing?.error) console.log(`${logPrefix} RETRY (previous error): ${filename}`);
    else if (existing) console.log(`${logPrefix} RE-EXTRACT (thin: visual=${visualLen}c, takeaways=${takeawayCount}): ${filename}`);

    // Resolve assets: prefer pre-acquired lane assets; else legacy IG file resolution.
    let resolvedAssets: AcquiredAssets;
    const lane = laneMap.get(filename);
    if (lane) {
      resolvedAssets = lane.assets;
    } else {
      const videoPath = path.join(CONFIG.VIDEOS_DIR, filename);
      try { await fs.access(videoPath); } catch { console.warn(`${logPrefix} SKIP (file not found): ${videoPath}`); continue; }
      const { size } = await fs.stat(videoPath);
      resolvedAssets = size > CONFIG.VIDEO_SIZE_THRESHOLD_BYTES
        ? { videoPath, thumbnailPath: (await getThumbnailPath(filename)) ?? videoPath, transcriptText: null }
        : { videoPath, thumbnailPath: null, transcriptText: null };
    }

    // Extract frames when a usable mp4 is present (and not forced to thumbnail).
    let frames: Buffer[] | null = null;
    if (resolvedAssets.videoPath !== null && resolvedAssets.thumbnailPath === null) {
      try {
        const { size } = await fs.stat(resolvedAssets.videoPath);
        if (size <= CONFIG.VIDEO_SIZE_THRESHOLD_BYTES) {
          const f = await extractVideoFrames(resolvedAssets.videoPath, 10);
          frames = f.length > 0 ? f : null;
          // If frame extraction failed for a legacy IG item, fall back to thumbnail.
          if (frames === null && lane === undefined) {
            resolvedAssets = { ...resolvedAssets, thumbnailPath: (await getThumbnailPath(filename)) ?? resolvedAssets.videoPath };
          }
        }
      } catch { frames = null; }
    }

    console.log(`${logPrefix} Extracting knowledge: ${filename} (category: ${cls.category})`);
    const req = buildKnowledgeRequest(resolvedAssets, frames);

    const result = await exponentialBackoff(async () => {
      const nl = new NeuroLinkClass();
      const response = await nl.generate({
        input: req.input,
        provider: "vertex",
        model: CONFIG.MODEL,
        schema: KnowledgeSchema,
        output: { format: "json" },
        disableTools: true,
        maxTokens: 8192,
        timeout: "180s",
      });
      const raw = safeJsonParse(response.content) as Record<string, unknown>;
      if (raw && typeof raw === "object") {
        for (const f of ["transcript", "visual_description"]) {
          if (raw[f] === null || raw[f] === undefined) raw[f] = "";
          else if (Array.isArray(raw[f])) raw[f] = (raw[f] as string[]).join("\n");
          else if (typeof raw[f] === "object") raw[f] = JSON.stringify(raw[f]);
          else if (typeof raw[f] !== "string") raw[f] = String(raw[f] ?? "");
        }
        for (const f of ["key_takeaways", "topics", "links_and_resources"]) {
          if (!Array.isArray(raw[f])) raw[f] = raw[f] ? [raw[f]] : [];
        }
      }
      return KnowledgeSchema.parse(raw);
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      const merged = mergeKnowledge(result.value, existing);
      if (req.transcriptOverride !== null) merged.transcript = req.transcriptOverride; // authoritative captions
      const isComplete = isKnowledgeComplete(merged, MIN_VISUAL_CHARS);
      knowledgeBase[filename] = { filename, category: cls.category ?? "", ...merged, ...(isComplete ? {} : { low_content: true }) };
      extracted++;
      console.log(`  -> visual ${String(merged.visual_description).length}c, transcript ${merged.transcript.length}c, ${merged.topics.length} topics, ${merged.key_takeaways.length} takeaways, ${merged.links_and_resources.length} links`);
      if (!isComplete) console.log(`  -> marked low_content (still thin after extraction)`);
    } else {
      const hasPriorContent = existing && !existing.error && (
        (existing.transcript && existing.transcript.length > 0) ||
        (existing.visual_description && existing.visual_description.length > 0) ||
        (Array.isArray(existing.key_takeaways) && existing.key_takeaways.length > 0) ||
        (Array.isArray(existing.topics) && existing.topics.length > 0)
      );
      if (hasPriorContent) {
        knowledgeBase[filename] = { ...existing!, error: result.error };
        console.warn(`  -> Preserved prior content; error marked for retry: ${result.error.slice(0, 120)}`);
      } else {
        knowledgeBase[filename] = {
          filename, category: cls.category ?? "",
          transcript: existing?.transcript ?? "", visual_description: existing?.visual_description ?? "",
          links_and_resources: existing?.links_and_resources ?? [], key_takeaways: existing?.key_takeaways ?? [],
          topics: existing?.topics ?? [], error: result.error,
        };
      }
      errors++;
    }

    await saveState(CONFIG.STATE.KNOWLEDGE_BASE, knowledgeBase);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nKnowledge extraction done. Extracted: ${extracted}, Skipped: ${skipped}, Errors: ${errors}`);
}
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npx vitest run src/__tests__/knowledge-request.test.ts`
Expected: PASS.

- [ ] **Step 5: Build, expect tsc clean**

Run: `npm run build`
Expected: tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/agents/knowledge.ts src/__tests__/knowledge-request.test.ts
git commit -m "feat(knowledge): export buildKnowledgeRequest; wire transcriptOverride + lane assets"
```

---

### Task 12: Classifier + link-extractor — `buildClassifyRequest` / `buildLinkRequest`

**Files:**
- Modify: `src/agents/classifier.ts`
- Modify: `src/agents/link-extractor.ts`
- Test: `src/__tests__/classify-request.test.ts`
- Test: `src/__tests__/link-request.test.ts`

**No-regression invariant:** classifier still extracts 3 frames, link-extractor 10; both reproduce today's branches when `transcriptText` is null. Both-null must NOT call `path.resolve("")`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/classify-request.test.ts
import { describe, it, expect } from "vitest";
import { buildClassifyRequest } from "../agents/classifier.js";
import type { AcquiredAssets } from "../types/index.js";

const P = "Classify this.";
const frames = (n: number): Buffer[] => Array.from({ length: n }, (_, i) => Buffer.from(`f${i}`));

describe("buildClassifyRequest", () => {
  it("frames present → images branch, prompt unchanged", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: null, transcriptText: null };
    const req = buildClassifyRequest(P, a, frames(3));
    expect(req.input.images).toEqual(frames(3));
    expect(req.input.text).toBe(P);
  });
  it("frames win over transcript", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: null, transcriptText: "t" };
    expect(buildClassifyRequest(P, a, frames(3)).input.images).toEqual(frames(3));
  });
  it("transcript only → text-only branch", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: null, transcriptText: "Body text." };
    const req = buildClassifyRequest(P, a, null);
    expect(req.input.images).toBeUndefined();
    expect(req.input.text).toContain("Body text.");
  });
  it("thumbnail only → files branch", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: "/t.jpg", transcriptText: null };
    expect(buildClassifyRequest(P, a, null).input.files?.[0]).toBe("/t.jpg");
  });
  it("both null → text-only, no files", () => {
    const req = buildClassifyRequest(P, { videoPath: null, thumbnailPath: null, transcriptText: null }, null);
    expect(req.input.files).toBeUndefined();
    expect(req.input.images).toBeUndefined();
  });
});
```

```ts
// src/__tests__/link-request.test.ts
import { describe, it, expect } from "vitest";
import { buildLinkRequest } from "../agents/link-extractor.js";
import type { AcquiredAssets } from "../types/index.js";

const P = "Extract links.";
const frames = (n: number): Buffer[] => Array.from({ length: n }, (_, i) => Buffer.from(`f${i}`));

describe("buildLinkRequest", () => {
  it("frames present → images branch", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: null, transcriptText: null };
    expect(buildLinkRequest(P, a, frames(10)).input.images).toEqual(frames(10));
  });
  it("transcript only → text-only branch", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: null, transcriptText: "Visit https://x.com" };
    expect(buildLinkRequest(P, a, null).input.text).toContain("https://x.com");
  });
  it("thumbnail only → files branch", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: "/t.jpg", transcriptText: null };
    expect(buildLinkRequest(P, a, null).input.files?.[0]).toBe("/t.jpg");
  });
  it("both null → text-only, no files", () => {
    const req = buildLinkRequest(P, { videoPath: null, thumbnailPath: null, transcriptText: null }, null);
    expect(req.input.files).toBeUndefined();
    expect(req.input.images).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests, expect failure**

Run: `npx vitest run src/__tests__/classify-request.test.ts src/__tests__/link-request.test.ts`
Expected: FAIL (`buildClassifyRequest` / `buildLinkRequest` are not functions).

- [ ] **Step 3a: Implement `buildClassifyRequest`** — add this export to `src/agents/classifier.ts` (after the `CLASSIFY_PROMPT` definition), then route the agent's `neurolink.generate` call through it:

```ts
// add near the top imports of src/agents/classifier.ts:
import type { AcquiredAssets } from "../types/index.js";

// add after CLASSIFY_PROMPT:
export interface ClassifyRequest { input: { text: string; images?: Buffer[]; files?: string[] }; }

/** frames → images; else transcript → text-only; else thumbnail/video → files; else text-only. */
export function buildClassifyRequest(promptText: string, assets: AcquiredAssets, frames: Buffer[] | null): ClassifyRequest {
  if (frames !== null && frames.length > 0) return { input: { text: promptText, images: frames } };
  if (assets.transcriptText !== null) return { input: { text: promptText + "\n\nTranscript:\n" + assets.transcriptText } };
  const filePath = assets.thumbnailPath ?? assets.videoPath;
  if (filePath === null) return { input: { text: promptText } };
  return { input: { text: promptText, files: [path.resolve(filePath)] } };
}
```

Then in `runClassifierAgent`, replace the existing frame-extraction + `inputImages`/`thumbnailInput` block and the `input:` argument with:

```ts
    // (after computing `const { size } = await fs.stat(videoPath);`)
    const CLASSIFY_FRAMES = parseInt(process.env.CLASSIFY_FRAMES ?? "3", 10);
    let frames: Buffer[] | null = null;
    if (size <= CONFIG.VIDEO_SIZE_THRESHOLD_BYTES) {
      const f = await extractVideoFrames(videoPath, CLASSIFY_FRAMES);
      frames = f.length > 0 ? f : null;
    }
    const thumbnailPath = frames === null ? ((await getThumbnailPath(filename)) ?? videoPath) : null;
    const assets: AcquiredAssets = { videoPath, thumbnailPath, transcriptText: null };

    const username  = meta?.username ?? "unknown";
    const caption   = meta?.caption_text ?? "";
    const hashtags  = (caption.match(/#\w+/g) ?? []).join(", ");
    const req = buildClassifyRequest(CLASSIFY_PROMPT(username, caption, hashtags), assets, frames);
    // ...then in neurolink.generate({...}): use `input: req.input,`
```

- [ ] **Step 3b: Implement `buildLinkRequest`** — add this export to `src/agents/link-extractor.ts` (after `LINK_EXTRACT_PROMPT`), then route the generate call through it:

```ts
// add near the top imports of src/agents/link-extractor.ts:
import type { AcquiredAssets } from "../types/index.js";

// add after LINK_EXTRACT_PROMPT:
export interface LinkRequest { input: { text: string; images?: Buffer[]; files?: string[] }; }

/** frames → images; else transcript → text-only; else thumbnail/video → files; else text-only. */
export function buildLinkRequest(promptText: string, assets: AcquiredAssets, frames: Buffer[] | null): LinkRequest {
  if (frames !== null && frames.length > 0) return { input: { text: promptText, images: frames } };
  if (assets.transcriptText !== null) return { input: { text: promptText + "\n\nTranscript:\n" + assets.transcriptText } };
  const filePath = assets.thumbnailPath ?? assets.videoPath;
  if (filePath === null) return { input: { text: promptText } };
  return { input: { text: promptText, files: [path.resolve(filePath)] } };
}
```

Then in `runLinkExtractAgent`, replace the `inputImages`/`thumbnailInput` block + the `input:` argument with:

```ts
    // (after `const { size } = await fs.stat(videoPath);`)
    let frames: Buffer[] | null = null;
    if (size <= CONFIG.VIDEO_SIZE_THRESHOLD_BYTES) {
      const f = await extractVideoFrames(videoPath, 10);
      frames = f.length > 0 ? f : null;
    }
    const thumbnailPath = frames === null ? ((await getThumbnailPath(filename)) ?? videoPath) : null;
    const assets: AcquiredAssets = { videoPath, thumbnailPath, transcriptText: null };
    const req = buildLinkRequest(LINK_EXTRACT_PROMPT, assets, frames);
    // ...then in nl.generate({...}): use `input: req.input,`
```

> Leave all existing post-extraction logic (`validateAndNormalizeUrl` mapping, resume/skip, `saveState`) unchanged.

- [ ] **Step 4: Run the tests, expect pass**

Run: `npx vitest run src/__tests__/classify-request.test.ts src/__tests__/link-request.test.ts`
Expected: PASS.

- [ ] **Step 5: Build, expect tsc clean**

Run: `npm run build`
Expected: tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/agents/classifier.ts src/agents/link-extractor.ts src/__tests__/classify-request.test.ts src/__tests__/link-request.test.ts
git commit -m "feat(agents): add buildClassifyRequest + buildLinkRequest; route inputs through AcquiredAssets"
```

---

### Task 13: Catalog + dashboard data (source / content_type / author)

**Files:**
- Modify: `src/agents/catalog.ts` (full replacement — reads `SourceItem[]`, tolerates legacy `MetadataEntry[]`)
- Modify: `src/dashboard/data-builder.ts` (export `resolveDashboardAuthor`; surface 3 fields)
- Test: `src/__tests__/catalog-record.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/catalog-record.test.ts
import { describe, it, expect } from "vitest";
import { buildCatalogRecord } from "../agents/catalog.js";
import { resolveDashboardAuthor } from "../dashboard/data-builder.js";
import type { SourceItem, MetadataEntry } from "../types/index.js";

const ig = (username: string, pk: string): MetadataEntry => ({
  pk, code: "C", media_type: 2, taken_at: "2025-01-01", caption_text: "Tutorial #react",
  username, full_name: "U", location: null, like_count: 10, comment_count: 2,
  video_url: null, thumbnail_url: null, resources: [],
});
const igItem = (username: string, pk: string): SourceItem => ({
  id: `${username}_${pk}.mp4`, source: "instagram", content_type: "short_video",
  title: null, author: username, caption_text: "Tutorial #react", url: null,
  thumbnail_url: null, published_at: "2025-01-01", duration_seconds: null, ig: ig(username, pk),
});
const ytItem: SourceItem = {
  id: "youtube_abc", source: "youtube", content_type: "long_video", title: "Talk",
  author: "TechChannel", caption_text: "desc", url: "https://yt/abc", thumbnail_url: null,
  published_at: "2025-02-01", duration_seconds: 600, yt: { videoId: "abc", channelId: "UC", caption_file: null },
};

describe("buildCatalogRecord", () => {
  it("populates source/content_type/author and instagram_user for IG", () => {
    const r = buildCatalogRecord("alice_100.mp4", { category: "Tech & Coding", tags: ["react"] },
      { duration: 60, width: 1080, height: 1920, file_size: 10_485_760, codec: "h264", bitrate: 0, fps: 30 },
      igItem("alice", "100"));
    expect(r.source).toBe("instagram");
    expect(r.content_type).toBe("short_video");
    expect(r.author).toBe("alice");
    expect(r.instagram_user).toBe("alice");
    expect(r.hashtags).toEqual(["react"]);
    expect(r.resolution).toBe("1080x1920");
    expect(r.file_size_mb).toBe(10);
  });

  it("empties instagram_user for non-IG and uses the channel author", () => {
    const r = buildCatalogRecord("youtube_abc", { category: "Tech & Coding" }, undefined, ytItem);
    expect(r.source).toBe("youtube");
    expect(r.content_type).toBe("long_video");
    expect(r.author).toBe("TechChannel");
    expect(r.instagram_user).toBe("");
  });

  it("back-compat: derives instagram_user from filename when item is missing", () => {
    const r = buildCatalogRecord("bob_200.mp4", {}, undefined, undefined);
    expect(r.source).toBe("instagram");
    expect(r.instagram_user).toBe("bob");
  });
});

describe("resolveDashboardAuthor", () => {
  it("prefers author, then instagram_user, then fallback username", () => {
    expect(resolveDashboardAuthor("Chan", "ig", "fb")).toBe("Chan");
    expect(resolveDashboardAuthor("", "ig", "fb")).toBe("ig");
    expect(resolveDashboardAuthor("", "", "fb")).toBe("fb");
  });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npx vitest run src/__tests__/catalog-record.test.ts`
Expected: FAIL (`buildCatalogRecord` / `resolveDashboardAuthor` are not exported).

- [ ] **Step 3a: Implement** — full `src/agents/catalog.ts`:

```ts
// src/agents/catalog.ts
import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { loadState, saveState } from "../pipeline/state.js";
import { igMetadataToSourceItem } from "../sources/instagram/map.js";
import type { MetadataEntry, VideoProperties, SourceItem } from "../types/index.js";

interface ClassificationEntry {
  pk?: string | null; username?: string | null; category?: string; subcategory?: string;
  tags?: string[]; description?: string; language?: string; mood?: string;
}

export interface CatalogRecord {
  filename: string; source: string; content_type: string; author: string;
  category: string; subcategory: string; tags: string[]; description: string;
  duration_seconds: number; resolution: string; file_size_mb: number;
  instagram_user: string; caption: string; hashtags: string[];
  language: string; mood: string; taken_at: string; like_count: number; comment_count: number;
}

function extractHashtags(caption: string): string[] {
  if (!caption) return [];
  const m = caption.match(/#(\w+)/g);
  return m ? m.map((x) => x.slice(1)) : [];
}
function parseFilenameUser(filename: string): string | null {
  const m = filename.match(/^(.+)_(\d+)\.mp4$/);
  return m ? m[1] : null;
}
function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

/** metadata.json may hold SourceItems (new) or legacy MetadataEntry[] — normalize. */
function asSourceItem(e: SourceItem | MetadataEntry): SourceItem {
  return "source" in e && "id" in e ? (e as SourceItem) : igMetadataToSourceItem(e as MetadataEntry);
}

/** Build one catalog record (pure; exported for testing). */
export function buildCatalogRecord(
  filename: string,
  cls: ClassificationEntry,
  props: VideoProperties | undefined,
  item: SourceItem | undefined,
): CatalogRecord {
  const ig = item?.ig;
  const caption = ig?.caption_text ?? item?.caption_text ?? "";
  const width = props?.width ?? 0;
  const height = props?.height ?? 0;
  const source = item?.source ?? "instagram";
  const instagram_user =
    source === "instagram" ? (cls.username ?? ig?.username ?? parseFilenameUser(filename) ?? "") : "";
  return {
    filename,
    source,
    content_type: item?.content_type ?? "short_video",
    author: item?.author ?? "",
    category: cls.category ?? "",
    subcategory: cls.subcategory ?? "",
    tags: cls.tags ?? [],
    description: cls.description ?? "",
    duration_seconds: props?.duration ?? item?.duration_seconds ?? 0,
    resolution: width && height ? `${width}x${height}` : "",
    file_size_mb: props?.file_size ? Math.round((props.file_size / (1024 * 1024)) * 100) / 100 : 0,
    instagram_user,
    caption,
    hashtags: extractHashtags(caption),
    language: cls.language ?? "",
    mood: cls.mood ?? "",
    taken_at: ig?.taken_at ?? item?.published_at ?? "",
    like_count: ig?.like_count ?? 0,
    comment_count: ig?.comment_count ?? 0,
  };
}

export async function runCatalogAgent(): Promise<void> {
  console.log("\n=== CatalogAgent ===");
  const rawMeta = await loadState<Array<SourceItem | MetadataEntry>>(CONFIG.STATE.METADATA, []);
  const items = rawMeta.map(asSourceItem);
  const itemById = new Map(items.map((it) => [it.id, it] as const));
  const videoProps = await loadState<Record<string, VideoProperties>>(CONFIG.STATE.PROPERTIES, {});
  const classifications = await loadState<Record<string, ClassificationEntry>>(CONFIG.STATE.CLASSIFICATIONS, {});

  const catalog: CatalogRecord[] = Object.keys(classifications)
    .sort()
    .map((filename) =>
      buildCatalogRecord(filename, classifications[filename], videoProps[filename], itemById.get(filename)),
    );

  await saveState(CONFIG.STATE.CATALOG, catalog);
  console.log(`Saved ${CONFIG.STATE.CATALOG} (${catalog.length} records)`);

  const fieldnames = [
    "filename", "source", "content_type", "author", "category", "subcategory", "tags",
    "description", "duration_seconds", "resolution", "file_size_mb", "instagram_user",
    "caption", "hashtags", "language", "mood", "taken_at", "like_count", "comment_count",
  ] as const;
  const lines = [fieldnames.join(",")];
  for (const r of catalog) {
    lines.push(
      fieldnames
        .map((f) => {
          const v = r[f];
          return Array.isArray(v) ? csvEscape(v.join(";")) : csvEscape(String(v));
        })
        .join(","),
    );
  }
  await fs.mkdir(path.dirname(CONFIG.STATE.CATALOG_CSV), { recursive: true });
  await fs.writeFile(CONFIG.STATE.CATALOG_CSV, lines.join("\n"), "utf8");
  console.log(`Saved ${CONFIG.STATE.CATALOG_CSV} (${catalog.length} records)`);
}
```

- [ ] **Step 3b: Implement `src/dashboard/data-builder.ts` edits** (concrete; apply each):

1. Export this pure helper near the top (after the imports):
```ts
/** Dashboard author: prefer catalog author, then instagram_user, then the username fallback. */
export function resolveDashboardAuthor(author: string, instagramUser: string, fallbackUsername: string): string {
  if (author !== "") return author;
  if (instagramUser !== "") return instagramUser;
  return fallbackUsername;
}
```

2. In the `interface IndexRecord {` block, add these fields immediately after `fullName: string;`:
```ts
  source: string;
  contentType: string;
  author: string;
```

3. In `buildDashboardData()`, immediately before the `normalized.push({` call (where `catEntry` and `username` are in scope), add:
```ts
    const source = catEntry?.source ?? "instagram";
    const contentType = catEntry?.content_type ?? "short_video";
    const author = resolveDashboardAuthor(catEntry?.author ?? "", catEntry?.instagram_user ?? "", username);
```

4. Add `source,`, `contentType,`, and `author,` to the object inside `normalized.push({ ... })`.

5. In both the slim `IndexRecord` projection and the `VideoDetail` object (the two places that copy `fullName: v.fullName`), add:
```ts
      source: v.source,
      contentType: v.contentType,
      author: v.author,
```

- [ ] **Step 4: Run the test + build, expect pass**

Run: `npx vitest run src/__tests__/catalog-record.test.ts && npm run build`
Expected: tests PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/agents/catalog.ts src/dashboard/data-builder.ts src/__tests__/catalog-record.test.ts
git commit -m "feat(catalog): add source/content_type/author; surface in dashboard data"
```

---

### Task 14: Packaging + runner wiring + multi-source iteration

This is the integration task: it installs the YouTube deps, wires collection/acquisition into the runner, and adds a `laneItems`-driven path to the classifier and link-extractor so YouTube items (which are not on disk in `VIDEOS_DIR`) are processed. The legacy IG file-scan remains as the fallback when no lanes are passed (no-regression).

**Files:**
- Modify: `package.json`, `.env.example`
- Modify: `src/pipeline/runner.ts`, `src/agents/classifier.ts`, `src/agents/link-extractor.ts`

- [ ] **Step 1: Install the YouTube dependencies**

```bash
npm install googleapis google-auth-library
```

- [ ] **Step 2: Add the `youtube:auth` script to `package.json`** (inside `"scripts"`):

```json
"youtube:auth": "node dist/sources/youtube/auth.js",
```

- [ ] **Step 3: Append to `.env.example`**

```
# --- Multi-provider ingestion ---
# Comma-separated sources to run. Default: instagram only.
SOURCES=instagram
# Download the YouTube mp4 only for videos at/under this duration (seconds); longer = transcript-only.
YT_DOWNLOAD_MAX_SECONDS=300
# YouTube Data API OAuth2 (Desktop app). REFRESH_TOKEN is written by `npm run youtube:auth`.
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
```

- [ ] **Step 4: Add the `laneItems` path to `src/agents/classifier.ts`**

Change the signature and add a multi-source branch at the very top of the function; the existing file-scan body becomes the fallback (it runs only when `laneItems` is empty/undefined — preserving IG behavior). Add the import `import type { LaneItem } from "../pipeline/lanes.js";`.

```ts
export async function runClassifierAgent(neurolink: NeuroLink, laneItems?: LaneItem[]): Promise<void> {
  const classifications = await loadState<Record<string, ClassificationEntry>>(CONFIG.STATE.CLASSIFICATIONS, {});

  // Multi-source path: classify items straight from acquired lanes (covers YouTube + IG).
  if (laneItems && laneItems.length > 0) {
    const CLASSIFY_FRAMES = parseInt(process.env.CLASSIFY_FRAMES ?? "3", 10);
    for (const [i, lane] of laneItems.entries()) {
      const filename = lane.item.id;
      const existing = classifications[filename];
      if (existing && existing.category && !existing.error) continue;
      const assets = lane.assets;
      let frames: Buffer[] | null = null;
      if (assets.videoPath) {
        const f = await extractVideoFrames(assets.videoPath, CLASSIFY_FRAMES);
        frames = f.length > 0 ? f : null;
      }
      const ig = lane.item.ig;
      const username = ig?.username ?? lane.item.author ?? "unknown";
      const caption = ig?.caption_text ?? lane.item.caption_text ?? lane.item.title ?? "";
      const hashtags = (caption.match(/#\w+/g) ?? []).join(", ");
      console.log(`[${i + 1}/${laneItems.length}] Classifying ${filename}`);
      const req = buildClassifyRequest(CLASSIFY_PROMPT(username, caption, hashtags), assets, frames);
      const result = await exponentialBackoff(async () => {
        const response = await neurolink.generate({
          input: req.input, provider: "vertex", model: CONFIG.MODEL,
          schema: ClassificationSchema, output: { format: "json" },
          disableTools: true, maxTokens: 1024, timeout: "120s",
        });
        return ClassificationSchema.parse(safeJsonParse(response.content));
      }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);
      classifications[filename] = result.success
        ? { pk: ig?.pk ?? null, code: ig?.code ?? null, username: ig?.username ?? null, ...result.value }
        : { pk: ig?.pk ?? null, code: ig?.code ?? null, username: ig?.username ?? null,
            category: "Other", subcategory: "", tags: [], description: "", language: "", mood: "", error: result.error };
      await saveState(CONFIG.STATE.CLASSIFICATIONS, classifications);
      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
    }
    return;
  }

  // --- Legacy IG file-scan path below (unchanged from Task 12) ---
  const metadata = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
  // ... (rest of the existing function body, unchanged) ...
}
```

- [ ] **Step 5: Add the `laneItems` path to `src/agents/link-extractor.ts`**

Add `import type { LaneItem } from "../pipeline/lanes.js";` and `import type { AcquiredAssets } from "../types/index.js";`. Change the signature and resolve per-item assets from the lane map (falling back to the legacy `VIDEOS_DIR` path):

```ts
export async function runLinkExtractAgent(neurolink: NeuroLink, laneItems?: LaneItem[]): Promise<void> {
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(CONFIG.STATE.KNOWLEDGE_BASE, {});
  type LinksWithError = Links & { error?: string };
  const linksState = await loadState<Record<string, LinksWithError>>(CONFIG.STATE.LINKS_V2, {});
  const assetsById = new Map<string, AcquiredAssets>((laneItems ?? []).map((l) => [l.item.id, l.assets]));

  const kbVideos = Object.entries(knowledgeBase).filter(([, e]) => !e.error);
  let extracted = 0, skipped = 0, errors = 0;

  for (const [i, [filename]] of kbVideos.entries()) {
    const logPrefix = `[${i + 1}/${kbVideos.length}]`;
    const existing = linksState[filename];
    if (existing && !existing.error) { skipped++; continue; }

    // Resolve assets: prefer the lane (covers transcript-only YouTube), else legacy IG file.
    let assets: AcquiredAssets;
    let frames: Buffer[] | null = null;
    const laneAssets = assetsById.get(filename);
    if (laneAssets) {
      assets = laneAssets;
      if (assets.videoPath) { const f = await extractVideoFrames(assets.videoPath, 10); frames = f.length > 0 ? f : null; }
    } else {
      const videoPath = path.join(CONFIG.VIDEOS_DIR, filename);
      try { await fs.access(videoPath); } catch { console.warn(`${logPrefix} SKIP (file not found): ${videoPath}`); continue; }
      const { size } = await fs.stat(videoPath);
      if (size <= CONFIG.VIDEO_SIZE_THRESHOLD_BYTES) { const f = await extractVideoFrames(videoPath, 10); frames = f.length > 0 ? f : null; }
      assets = { videoPath, thumbnailPath: frames === null ? ((await getThumbnailPath(filename)) ?? videoPath) : null, transcriptText: null };
    }

    const req = buildLinkRequest(LINK_EXTRACT_PROMPT, assets, frames);
    const result = await exponentialBackoff(async () => {
      const nl = new NeuroLinkClass();
      const response = await nl.generate({
        input: req.input, provider: "vertex", model: CONFIG.MODEL,
        schema: LinksSchema, output: { format: "json" }, disableTools: true, maxTokens: 4096, timeout: "120s",
      });
      return LinksSchema.parse(safeJsonParse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      const validated: Links = { links: result.value.links.map((link) => ({ ...link, url: validateAndNormalizeUrl(link.url) })) };
      linksState[filename] = validated; extracted++;
    } else {
      linksState[filename] = { links: [], error: result.error }; errors++;
    }
    await saveState(CONFIG.STATE.LINKS_V2, linksState);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }
  console.log(`\nLink extraction done. Extracted: ${extracted}, Skipped: ${skipped}, Errors: ${errors}`);
}
```

- [ ] **Step 6: Rewire `src/pipeline/runner.ts`**

Remove the imports of `runMetadataAgent` and `runDownloadAgent`. Add:
```ts
import { getEnabledCollectors }   from "../sources/registry.js";
import { acquireAll }             from "../pipeline/lanes.js";
import { loadState, saveState }   from "../pipeline/state.js";
import { CONFIG }                 from "../pipeline/config.js";
import type { SourceItem }        from "../types/index.js";
import type { LaneItem }          from "../pipeline/lanes.js";
```

Inside `runFullPipeline()`, before `const steps`, add a shared lanes closure and two step functions:
```ts
  let laneItems: LaneItem[] = [];

  const runCollectionStep = async (): Promise<void> => {
    const collectors = getEnabledCollectors(CONFIG.SOURCES);
    console.log(`\n=== Collection — ${collectors.map((c) => c.source).join(", ")} ===`);
    const results = await Promise.all(collectors.map((c) => c.collect()));
    const items = results.flat();
    await saveState(CONFIG.STATE.METADATA, items);
    console.log(`  Collected ${items.length} item(s) → ${CONFIG.STATE.METADATA}`);
  };

  const runAcquisitionStep = async (): Promise<void> => {
    const items = await loadState<SourceItem[]>(CONFIG.STATE.METADATA, []);
    const registry = new Map(getEnabledCollectors(CONFIG.SOURCES).map((c) => [c.source, c] as const));
    laneItems = await acquireAll(items, registry);
    console.log(`\n=== Acquisition — ${laneItems.length}/${items.length} item(s) acquired ===`);
  };
```

Replace the first two `steps[]` entries, and pass `laneItems` into steps 3–5 (these arrows read `laneItems` at call time, after acquisition sets it):
```ts
    { name: "Source-agnostic collection", run: () => runCollectionStep() },                       //  0
    { name: "Asset acquisition",          run: () => runAcquisitionStep() },                       //  1
    { name: "Properties extraction",      run: () => runPropertiesAgent() },                       //  2
    { name: "Classification",             run: () => runClassifierAgent(neurolink, laneItems) },   //  3
    { name: "Knowledge extraction",       run: () => runKnowledgeAgent(neurolink, laneItems) },    //  4
    { name: "Link extraction",            run: () => runLinkExtractAgent(neurolink, laneItems) },  //  5
```
Update the 0-indexed step-map doc comment to read "0 Source-agnostic collection / 1 Asset acquisition".

- [ ] **Step 7: Build, expect tsc clean**

Run: `npm run build`
Expected: tsc exits 0.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example src/pipeline/runner.ts src/agents/classifier.ts src/agents/link-extractor.ts
git commit -m "feat(runner): wire collection + acquisition lanes; process YouTube via laneItems"
```

---

### Task 15: Instagram no-regression gate (verification only — must pass before the PR)

No new code. Proves that re-running classify/knowledge/link with `SOURCES=instagram` does not change existing IG knowledge. With `START_STEP=2`, the acquisition step (1) is skipped → `laneItems` is empty → every agent takes its legacy IG file-scan path → output must be identical (skip-logic skips already-complete entries).

- [ ] **Step 1: Capture the committed baseline**

```bash
git show HEAD:videos/knowledge_base.json > /tmp/kb_baseline.json
wc -c /tmp/kb_baseline.json   # sanity: non-empty
```

- [ ] **Step 2: Run the IG-only AI steps (properties → classify → knowledge → link)**

```bash
npm run build && SOURCES=instagram START_STEP=2 END_STEP=6 node dist/pipeline/runner.js
```

- [ ] **Step 3: Diff knowledge_base.json against the baseline**

```bash
node -e "
const fs=require('fs');
const a=JSON.parse(fs.readFileSync('/tmp/kb_baseline.json','utf8'));
const b=JSON.parse(fs.readFileSync('videos/knowledge_base.json','utf8'));
let regressions=0;
for(const k of Object.keys(a)){
  const x=a[k],y=b[k]||{};
  for(const f of ['transcript','visual_description']){
    if((x[f]||'').length>(y[f]||'').length){regressions++;console.log('REGRESS',k,f,(x[f]||'').length,'->',(y[f]||'').length);}
  }
  for(const f of ['key_takeaways','topics','links_and_resources']){
    if((x[f]||[]).length>(y[f]||[]).length){regressions++;console.log('REGRESS',k,f);}
  }
}
console.log('IG entries checked:',Object.keys(a).length,'| regressions:',regressions);
process.exit(regressions===0?0:1);
"
```

Expected: `regressions: 0` (exit 0). Any non-zero output names the regressed entry/field — investigate before proceeding.

- [ ] **Step 4: Confirm catalog additive fields**

```bash
node -e "
const c=require('fs').readFileSync('videos/catalog.json','utf8');const cat=JSON.parse(c);
const missing=cat.filter(r=>!('source'in r)||!('content_type'in r)||!('author'in r)).length;
const igNoUser=cat.filter(r=>r.source==='instagram'&&r.instagram_user===''&&r.author!=='').length;
console.log('records missing new fields:',missing,'| IG empty user w/ author:',igNoUser);
"
```

Expected: `records missing new fields: 0` and `IG empty user w/ author: 0`.

- [ ] **Step 5: Gate decision**

PASS requires: Step 3 exits 0 (no content regressions on any IG entry) **and** Step 4 shows 0/0. Do not open the PR until this passes. (No commit — this is read-only verification; if state files changed only by additive fields, commit them with the data in the normal daily-run flow.)

---

### Task 16: YouTube live smoke test (manual)

No new source files. Verifies real liked-video ingestion end-to-end. Prereq: Tasks 1–14 done, `npm run build` clean, a Google Cloud project with **YouTube Data API v3** enabled, and `yt-dlp` installed (`brew install yt-dlp`).

- [ ] **Step 1: Create an OAuth client + populate `.env`**

In Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID → **Desktop app**. Then in `.env`:
```
YOUTUBE_CLIENT_ID=<client id>
YOUTUBE_CLIENT_SECRET=<client secret>
```

- [ ] **Step 2: Run the consent flow (writes the refresh token to `.env`)**

```bash
npm run build && npm run youtube:auth
```
Follow the printed URL, authorise with the Google account whose liked videos you want, paste the code. Verify:
```bash
grep YOUTUBE_REFRESH_TOKEN .env   # expect a non-empty value
```

- [ ] **Step 3: Collect + acquire YouTube only**

```bash
SOURCES=youtube START_STEP=0 END_STEP=2 node dist/pipeline/runner.js
node -e "
const items=JSON.parse(require('fs').readFileSync('videos/metadata.json','utf8'));
const yt=items.filter(i=>i.source==='youtube');
console.log('YouTube items:',yt.length,'| sample:',yt.slice(0,3).map(i=>i.id));
"
```
Expected: `YouTube items: ≥ 1`.

- [ ] **Step 4: Classify + extract knowledge for YouTube**

```bash
SOURCES=youtube START_STEP=0 END_STEP=6 node dist/pipeline/runner.js
node -e "
const kb=JSON.parse(require('fs').readFileSync('videos/knowledge_base.json','utf8'));
const yt=Object.keys(kb).filter(k=>k.startsWith('youtube_'));
console.log('YouTube KB entries:',yt.length);
for(const k of yt.slice(0,3)){const t=kb[k].transcript||'';console.log(k,'transcript len:',(typeof t==='string'?t:JSON.stringify(t)).length);}
"
```
Expected: ≥ 1 entry with transcript length > 100 (real captions used, not just frames).

- [ ] **Step 5: Rebuild dashboard data + verify render**

```bash
npm run dashboard:data
node -e "
const idx=JSON.parse(require('fs').readFileSync('dashboard/data/index.json','utf8'));
const arr=Array.isArray(idx)?idx:(idx.videos||[]);
const yt=arr.filter(v=>v.source==='youtube');
console.log('YouTube in dashboard:',yt.length);
yt.slice(0,3).forEach(v=>console.log(' ',v.id,'|',v.author,'|',v.contentType));
"
```
Expected: ≥ 1 YouTube entry with non-empty `author` and a `contentType`.

- [ ] **Step 6: Pass criteria**

| Check | Expected |
|---|---|
| `metadata.json` has `source:"youtube"` items | ≥ 1 |
| Long-video KB transcript length | > 100 chars |
| `dashboard/data/index.json` YouTube entries | ≥ 1 |
| `dashboard/data/video/youtube_*.json` exist | ≥ 1 |
| IG `knowledge_base.json` entries | unchanged (Task 15 gate) |

---

## Done

All 16 tasks implement the approved spec. Foundation (Tasks 1–4) → Instagram + config (5–6) → YouTube collector/download/auth (7–9) → lanes + agent refactors (10–12) → catalog/dashboard + runner integration (13–14) → verification gates (15–16). Reserved future work (per spec non-goals): Instagram→TS migration (Phase 2), X/Twitter + `text_post`/`image_post`/`article_link` (Phase 3).
