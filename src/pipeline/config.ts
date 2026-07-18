// src/pipeline/config.ts
import path from "node:path";

export const CONFIG = {
  // Set INSTAGRAM_USERNAME in .env for real runs; "user" is only a placeholder default.
  INSTAGRAM_USERNAME: process.env.INSTAGRAM_USERNAME ?? "user",

  VIDEOS_DIR: path.resolve("videos", `${process.env.INSTAGRAM_USERNAME ?? "user"}_saved`),
  THUMB_DIR: path.resolve("videos", "thumbnails"),

  // Which source providers to enable (comma-separated). Default: instagram only.
  SOURCES: process.env.SOURCES ?? "instagram",

  // Instagram saved-posts backend: "instagrapi" (default, private API) or
  // "gallerydl" (cookie-auth fallback, used when instagrapi is soft-blocked).
  IG_COLLECTOR: process.env.IG_COLLECTOR ?? "instagrapi",

  // Incremental saved-feed fetch: cap on items pulled per run (bounds a stale-cursor
  // blowout back toward a full pagination). Cold start ignores this and fetches all.
  IG_INCREMENTAL_MAX: parseInt(process.env.IG_INCREMENTAL_MAX ?? "200", 10),

  // YouTube downloaded assets land here (separate dir to avoid id collisions).
  YOUTUBE_VIDEOS_DIR: path.resolve("videos", "youtube"),

  // YouTube OAuth2 credentials (refresh token is written by `npm run youtube:auth`).
  YOUTUBE: {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
  },

  // Download the mp4 only for YouTube videos at/under this duration (seconds).
  YT_DOWNLOAD_MAX_SECONDS: parseInt(process.env.YT_DOWNLOAD_MAX_SECONDS ?? "300", 10),

  STATE: {
    METADATA: path.resolve("videos", "metadata.json"),
    METADATA_INCOMING: path.resolve("videos", "metadata.incoming.json"),
    KNOWN_PKS: path.resolve("videos", "known_pks.json"),
    YOUTUBE_KNOWN_IDS: path.resolve("videos", "youtube_known_ids.json"),
    PROPERTIES: path.resolve("videos", "video_properties.json"),
    CLASSIFICATIONS: path.resolve("videos", "classifications.json"),
    KNOWLEDGE_BASE: path.resolve("videos", "knowledge_base.json"),
    LINKS_V2: path.resolve("videos", "links_v2.json"),
    CATALOG: path.resolve("videos", "catalog.json"),
    CATALOG_CSV: path.resolve("videos", "catalog.csv"),
    ANALYSIS: path.resolve("videos", "analysis.json"),
    RESEARCH: path.resolve("videos", "research.json"),
    IMPLEMENTATIONS: path.resolve("videos", "implementations.json"),
    VERIFICATIONS: path.resolve("videos", "verifications.json"),
    SEARCH_DB: path.resolve("videos", "search.db"),
  },

  OUTPUT: {
    CLASSIFIED: path.resolve("videos", "classified"),
    KNOWLEDGE_BASE: path.resolve("knowledge_base"),
    DASHBOARD: path.resolve("dashboard", "index.html"),
  },

  MODEL: process.env.MODEL ?? "gemini-3.1-flash-image-preview",
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? "gemini-embedding-001",
  VERTEX_PROJECT: process.env.VERTEX_PROJECT ?? "your-gcp-project-id",
  // 3.1 models require "global" location; 2.x models use "us-central1"
  VERTEX_LOCATION: process.env.VERTEX_LOCATION ?? "global",

  KNOWLEDGE_TARGET_CATEGORIES: new Set(
    process.env.KB_CATEGORIES
      ? process.env.KB_CATEGORIES.split(",").map((s) => s.trim())
      : ["AI & Machine Learning", "Tech & Coding", "Business & Marketing", "UI/UX Design"],
  ),

  DELAY_BETWEEN_REQUESTS_MS: parseInt(process.env.DELAY_MS ?? "500", 10),
  MAX_RETRIES: 5,
  RETRY_BASE_DELAY_MS: 10_000,

  // Wall-clock caps (ms) for the Python scrapers. On an Instagram soft-block the
  // private API stalls instead of erroring, so without a cap one run can hang for
  // hours and block the next scheduled run. Metadata collection is quick;
  // downloading a backlog can legitimately take much longer.
  COLLECTOR_TIMEOUT_MS: parseInt(process.env.COLLECTOR_TIMEOUT_MS ?? String(11 * 60 * 1000), 10),
  DOWNLOAD_TIMEOUT_MS: parseInt(process.env.DOWNLOAD_TIMEOUT_MS ?? String(45 * 60 * 1000), 10),

  // Gemini inline limit is ~20MB; most Instagram Reels are 5-15MB.
  VIDEO_SIZE_THRESHOLD_BYTES: parseInt(process.env.VIDEO_SIZE_THRESHOLD ?? String(20 * 1024 * 1024), 10),
} as const;
