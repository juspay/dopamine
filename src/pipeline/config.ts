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
