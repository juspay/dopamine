// src/pipeline/config.ts
import path from "node:path";

/** Newest GA Gemini on Vertex (location global) as of the last model audit. */
const DEFAULT_TEXT_MODEL = "gemini-3.8-flash";

/**
 * Default System 1 confidence floor per decision provider, from the measured
 * apply-gate agreement (see TRIAGE_DECIDE_MIN_CONFIDENCE). XOR is calibrated
 * well enough to trust at 0.6; anything unmeasured gets the stricter 0.8.
 */
const DECIDE_FLOOR_BY_PROVIDER: Readonly<Record<string, number>> = { xor: 0.6 };
const DEFAULT_DECIDE_FLOOR = 0.8;

/**
 * The two judgement steps (project mapping, triage) are pinned by evidence, not
 * recency. With the same prompt every flash model after gemini-2.5-flash is
 * stricter, which costs these steps because a rejection is unrecoverable
 * downstream. Measured:
 *   mapping F1 vs 144 human labels (all / surfaced): 2.5-flash 68/67,
 *     3.1-flash-lite 69/65, 3.5-flash 69/64, 3.8-flash 64/59
 *   triage vs stored tiers on 219 videos (apply-gate agreement): 3.1-flash-lite
 *     211, 3.5-flash 202, 3.8-flash 203 (a 2.5-flash re-run agrees on 213)
 * Re-run `npm run eval:judge` before moving either.
 */
const DEFAULT_JUDGE_MODEL = "gemini-3.1-flash-lite";

export const CONFIG = {
  // Set INSTAGRAM_USERNAME in .env for real runs; "user" is only a placeholder default.
  INSTAGRAM_USERNAME: process.env.INSTAGRAM_USERNAME ?? "user",

  VIDEOS_DIR: path.resolve("videos", `${process.env.INSTAGRAM_USERNAME ?? "user"}_saved`),
  THUMB_DIR: path.resolve("videos", "thumbnails"),

  // Which source providers to enable (comma-separated). Default: instagram only.
  SOURCES: process.env.SOURCES ?? "instagram",

  // Non-Instagram sources hand the pipeline at most this many not-yet-done items per
  // run, so enabling a source with a large history drains over several runs.
  SOURCE_MAX_NEW_PER_RUN: Number.parseInt(process.env.SOURCE_MAX_NEW_PER_RUN ?? "25", 10),
  // Optional ISO date: items published before it are left out. Parsed where it is used.
  SOURCE_SINCE: process.env.SOURCE_SINCE || undefined,

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
    /** Non-Instagram items (id -> SourceItem). Written only by the pipeline. */
    SOURCE_ITEMS: path.resolve("videos", "source_items.json"),
    /** Per-item failure/empty ledger for non-Instagram items. */
    SOURCE_ATTEMPTS: path.resolve("videos", "source_attempts.json"),
    /** Last success/failure per source, for the 24h alert. */
    SOURCE_HEALTH: path.resolve("videos", "source_health.json"),
    PROPERTIES: path.resolve("videos", "video_properties.json"),
    CLASSIFICATIONS: path.resolve("videos", "classifications.json"),
    KNOWLEDGE_BASE: path.resolve("videos", "knowledge_base.json"),
    LINKS_V2: path.resolve("videos", "links_v2.json"),
    /** Failed link lookups, so the resolver stops re-asking the model about the same names every run. */
    LINK_ATTEMPTS: path.resolve("videos", "link_attempts.json"),
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
   *
   * `gemini-3.8-flash` is the newest GA Gemini on Vertex (global). It is a
   * reasoning model: thinking tokens come out of the same `maxTokens` cap as
   * the answer (~240-340 of them on a one-line reply), so a tight cap truncates
   * the answer. Every call site checks for that via assertNotTruncated.
   */
  MODEL: process.env.MODEL ?? DEFAULT_TEXT_MODEL,
  /**
   * Deliberately NOT moved to gemini-embedding-2. The mapping floors below
   * (MAP_PREFILTER_MIN_Z / TOPK) were calibrated against human labels on this
   * exact model, so changing it invalidates them. It also breaks Neurolink's
   * Vertex `embedMany`, which throws ("held 1 vectors for 3 texts") for
   * gemini-embedding-2. Switching needs a re-run of the labelled recall sweep
   * first.
   */
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? "gemini-embedding-001",

  // Daily digest push (Shooter-compatible /api/notify endpoint).
  DIGEST_TOP_N: Number.parseInt(process.env.DIGEST_TOP_N ?? "5", 10),
  // Kept as its own knob so the text-only steps can be pointed elsewhere
  // without moving the vision model. It previously HAD to differ: CONFIG.MODEL
  // was an image-preview model that returned free text or empty parts for
  // text-only JSON prompts. That is no longer the reason they are separate.
  DIGEST_MODEL: process.env.DIGEST_MODEL ?? DEFAULT_TEXT_MODEL,
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
  MAP_MODEL: process.env.MAP_MODEL ?? DEFAULT_JUDGE_MODEL,

  // Actionability triage (runs before the apply-loop; text-only, like digest/mapper).
  TRIAGE_MODEL: process.env.TRIAGE_MODEL ?? DEFAULT_JUDGE_MODEL,
  /**
   * "decide" asks a System 1 decision model (Neurolink `decide()`: TypeSafe Jev,
   * XOR, ...) for the tier first and falls back to TRIAGE_MODEL below
   * TRIAGE_DECIDE_MIN_CONFIDENCE or on any failure. Off by default: a hosted
   * decision provider receives each video's category, tags, description and
   * caption, so only enable it with a provider you are happy to send those to
   * (XOR is open-weights and can be self-hosted).
   */
  TRIAGE_ENGINE: process.env.TRIAGE_ENGINE === "decide" ? ("decide" as const) : ("generate" as const),
  /** Decision provider name; empty lets Neurolink pick the first configured one. */
  TRIAGE_DECIDE_PROVIDER: process.env.TRIAGE_DECIDE_PROVIDER ?? "",
  /**
   * Model to send; empty uses the provider's own default. Needed behind the
   * Juspay LiteLLM proxy, which serves XOR under the name `jev-latest` and
   * refuses the XOR provider's default name (`xor-1.1`).
   */
  TRIAGE_DECIDE_MODEL: process.env.TRIAGE_DECIDE_MODEL ?? "",
  /**
   * A tier below this goes to TRIAGE_MODEL instead. Confidence is calibrated per
   * model and route, so the floor is too. Apply-gate agreement with the stored
   * tier, by floor (videos handled / demotions):
   *   TypeSafe Jev direct (jev-1.13.0, 221 videos): 0.8 -> 109/109 (49%, 0);
   *     0.6 -> 156/160 (72%, 4)
   *   XOR as jev-latest via the Juspay LiteLLM proxy (225 videos): 0.8 -> 43/43 (19%, 0);
   *     0.6 -> 139/139 (62%, 0)
   * A demotion drops a video out of the apply loop for good. The default is 0.6
   * for provider "xor" (no demotions, three times the coverage) and 0.8 for
   * everything else, the floor with no demotions on both routes. An explicit
   * value always wins.
   */
  TRIAGE_DECIDE_MIN_CONFIDENCE:
    Number.parseFloat(process.env.TRIAGE_DECIDE_MIN_CONFIDENCE ?? "") ||
    (DECIDE_FLOOR_BY_PROVIDER[(process.env.TRIAGE_DECIDE_PROVIDER ?? "").toLowerCase()] ?? DEFAULT_DECIDE_FLOOR),
  // Per-project action brief (synthesize mapped learnings → concrete actions).
  BRIEF_MODEL: process.env.BRIEF_MODEL ?? DEFAULT_TEXT_MODEL,
  // Link-name -> URL lookup. Kept apart from MODEL so pointing MODEL back at an
  // image model cannot break it (see agents/link-resolver.ts).
  LINK_MODEL: process.env.LINK_MODEL ?? DEFAULT_TEXT_MODEL,
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

  /**
   * A link name the model could not resolve is not asked about again until this
   * many days have passed. Measured over 27 runs: 88-100% of each run's ~140-157
   * names were repeats of the previous run, 107 of 147 had failed in every run,
   * and the model answered NONE for 93-96% of them, so the step spent ~15 of
   * ~43 minutes re-asking questions that had already been answered.
   */
  LINK_RETRY_TTL_DAYS: Number.parseInt(process.env.LINK_RETRY_TTL_DAYS ?? "30", 10),
  /** Most expired failures one run asks about again, so the backlog drains a slice at a time. */
  LINK_RETRY_MAX_PER_RUN: Number.parseInt(process.env.LINK_RETRY_MAX_PER_RUN ?? "20", 10),

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
