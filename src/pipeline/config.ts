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
  IG_INCREMENTAL_MAX: Number.parseInt(process.env.IG_INCREMENTAL_MAX ?? "200", 10),

  // YouTube downloaded assets land here (separate dir to avoid id collisions).
  YOUTUBE_VIDEOS_DIR: path.resolve("videos", "youtube"),

  // YouTube OAuth2 credentials (refresh token is written by `npm run youtube:auth`).
  YOUTUBE: {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
  },

  // Download the mp4 only for YouTube videos at/under this duration (seconds).
  YT_DOWNLOAD_MAX_SECONDS: Number.parseInt(process.env.YT_DOWNLOAD_MAX_SECONDS ?? "300", 10),

  STATE: {
    METADATA: path.resolve("videos", "metadata.json"),
    METADATA_INCOMING: path.resolve("videos", "metadata.incoming.json"),
    // NOTE: videos/known_pks.json is deliberately absent here. It is live state,
    // but owned by the Python collectors (scripts/download_videos.py,
    // scripts/collect_saved_gallerydl.py), which hardcode the path. No TS code
    // reads it — do not delete the file, and do not re-add a constant nothing uses.
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
    DIGEST_STATE: path.resolve("videos", "digest_state.json"),
    PROJECT_MAPPINGS: path.resolve("videos", "project_mappings.json"),
    PROJECT_BRIEFS: path.resolve("videos", "project_briefs.json"),
    TRIAGE: path.resolve("videos", "triage.json"),
  },

  OUTPUT: {
    CLASSIFIED: path.resolve("videos", "classified"),
    KNOWLEDGE_BASE: path.resolve("knowledge_base"),
    DASHBOARD: path.resolve("dashboard", "index.html"),
  },

  /**
   * The vision model every extraction agent runs on — classifier, knowledge,
   * analyzer, researcher, verifier, link-extractor all send video frames here,
   * so it must accept image input.
   *
   * Was `gemini-3.1-flash-image-preview`, which Vertex now answers with a hard
   * 404 ("not found or your project does not have access to it") in region
   * global. That is not a stale failure: every one of those six agents fails on
   * every new video until this points at a live model, and 18 classifications
   * in the corpus carry the InvalidModelError to show for it.
   */
  MODEL: process.env.MODEL ?? "gemini-2.5-flash",
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? "gemini-embedding-001",

  // Daily digest push (Shooter-compatible /api/notify endpoint).
  DIGEST_TOP_N: Number.parseInt(process.env.DIGEST_TOP_N ?? "5", 10),
  // Kept as its own knob so the text-only steps can be pointed elsewhere
  // without moving the vision model. It previously HAD to differ: CONFIG.MODEL
  // was an image-preview model that returned free text or empty parts for
  // text-only JSON prompts. That is no longer the reason they are separate.
  DIGEST_MODEL: process.env.DIGEST_MODEL ?? "gemini-2.5-flash",
  DIGEST_PUSH_URL:
    process.env.DIGEST_PUSH_URL ?? `http://localhost:${process.env.SHOOTER_LOCAL_PORT ?? "54006"}/api/notify`,

  // Project mapping (hybrid embed-prefilter → LLM judge).
  PROJECTS_CONFIG: path.resolve("projects.json"),
  /** Raised 4 → 6 against 78 human-labelled videos: at floor 0.5 the extra two
   *  slots move the recall ceiling from 73% to 85%, because a video the human
   *  assigns to three or four projects cannot be served by four candidates once
   *  a hub project occupies one of them. */
  MAP_PREFILTER_TOPK: Number.parseInt(process.env.MAP_PREFILTER_TOPK ?? "6", 10),
  /** Raw-cosine floor. Only used on a corpus too small to standardise (see below). */
  MAP_PREFILTER_MIN: Number.parseFloat(process.env.MAP_PREFILTER_MIN ?? "0.55"),
  /**
   * Prefilter floor in standard deviations above a project's own baseline.
   * The raw floor passed 3.78 of a possible 4 candidates per video, so it was
   * not filtering at all. Swept over one 40-video sample:
   *
   *   z      videos mapped   mappings   projects/video   judged without an LLM
   *   0.50   21/40           40         1.90             14/40
   *   0.75   19/40           32         1.68             17/40
   *   1.00   18/40           30         1.67             20/40
   *
   * That sweep had no ground truth — it read "fewer projects per video" as
   * "cleaner", which is only true if the extra projects were wrong. 78
   * human-labelled videos (124 verdicts) show they were not. Scored against
   * them, the floor is the binding constraint on recall:
   *
   *   floor  topK   candidates   recall ceiling
   *   1.00   4      225          64%   ← previous setting
   *   1.00   6      256          70%
   *   0.75   6      327          81%
   *   0.50   6      376          85%
   *   0.25   6      422          89%
   *
   * The judge can only reject, never add, so anything below the floor is
   * unreachable at any prompt quality. 0.50 buys +21 points of ceiling for
   * 1.67x the judge calls; past it the curve flattens while candidate density
   * keeps falling, which spends judge budget on pairs it will reject anyway.
   */
  MAP_PREFILTER_MIN_Z: Number.parseFloat(process.env.MAP_PREFILTER_MIN_Z ?? "0.5"),
  /** Below this many videos a per-project spread is noise, so ranking stays on raw cosine. */
  MAP_BASELINE_MIN_VIDEOS: Number.parseInt(process.env.MAP_BASELINE_MIN_VIDEOS ?? "30", 10),
  MAP_MODEL: process.env.MAP_MODEL ?? "gemini-2.5-flash",

  // Actionability triage (runs before the apply-loop; text-only, like digest/mapper).
  TRIAGE_MODEL: process.env.TRIAGE_MODEL ?? "gemini-2.5-flash",
  // Per-project action brief (synthesize mapped learnings → concrete actions).
  BRIEF_MODEL: process.env.BRIEF_MODEL ?? "gemini-2.5-flash",
  // Deliberately 1, not 2. Raising it would suppress most projects' briefs
  // outright while mapping recall is still low, trading a visible-but-labelled
  // hunch for no output at all. Single-source briefs are instead marked
  // `exploratory` (see schemas/brief.ts) so they read as hunches. Revisit once
  // mapping precision work lands and projects routinely clear several learnings.
  // `|| 1` guards NaN (non-numeric env) and 0, so the gate is never silently disabled.
  BRIEF_MIN_MAPPINGS: Math.max(1, Number.parseInt(process.env.BRIEF_MIN_MAPPINGS ?? "1", 10) || 1),

  VERTEX_PROJECT: process.env.VERTEX_PROJECT ?? "your-gcp-project-id",
  // 3.1 models require "global" location; 2.x models use "us-central1"
  VERTEX_LOCATION: process.env.VERTEX_LOCATION ?? "global",

  KNOWLEDGE_TARGET_CATEGORIES: new Set(
    process.env.KB_CATEGORIES
      ? process.env.KB_CATEGORIES.split(",").map((s) => s.trim())
      : ["AI & Machine Learning", "Tech & Coding", "Business & Marketing", "UI/UX Design"],
  ),

  // Staleness refresh for research + verification. Both agents used to skip any
  // entry that had no error, so their results were write-once and decayed: a URL
  // checked in May still rendered its May live/dead status on /tools. TTL makes
  // them re-check; the per-run cap keeps the backlog draining a slice at a time
  // instead of billing for every stale entry on the first run after this lands.
  REFRESH_TTL_DAYS: Number.parseInt(process.env.REFRESH_TTL_DAYS ?? "30", 10),
  REFRESH_MAX_PER_RUN: Number.parseInt(process.env.REFRESH_MAX_PER_RUN ?? "20", 10),

  DELAY_BETWEEN_REQUESTS_MS: Number.parseInt(process.env.DELAY_MS ?? "500", 10),
  MAX_RETRIES: 5,
  RETRY_BASE_DELAY_MS: 10_000,

  // Wall-clock caps (ms) for the Python scrapers. On an Instagram soft-block the
  // private API stalls instead of erroring, so without a cap one run can hang for
  // hours and block the next scheduled run. Metadata collection is quick;
  // downloading a backlog can legitimately take much longer.
  COLLECTOR_TIMEOUT_MS: Number.parseInt(process.env.COLLECTOR_TIMEOUT_MS ?? String(11 * 60 * 1000), 10),
  DOWNLOAD_TIMEOUT_MS: Number.parseInt(process.env.DOWNLOAD_TIMEOUT_MS ?? String(45 * 60 * 1000), 10),

  // Gemini inline limit is ~20MB; most Instagram Reels are 5-15MB.
  VIDEO_SIZE_THRESHOLD_BYTES: Number.parseInt(process.env.VIDEO_SIZE_THRESHOLD ?? String(20 * 1024 * 1024), 10),
} as const;
