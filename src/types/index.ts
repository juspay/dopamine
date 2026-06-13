/** Mirrors the shape written by collect_metadata.py */
export interface MetadataEntry {
  pk: string;
  code: string;
  media_type: number;
  taken_at: string | null;
  caption_text: string | null;
  username: string | null;
  full_name: string | null;
  location: {
    pk: number;
    name: string;
    lat: number | null;
    lng: number | null;
  } | null;
  like_count: number;
  comment_count: number;
  video_url: string | null;
  thumbnail_url: string | null;
  resources: Array<{
    pk: string;
    media_type: number;
    video_url: string | null;
    thumbnail_url: string | null;
  }>;
}

/** Mirrors the shape written by extract_properties.py / PropertiesAgent */
export interface VideoProperties {
  duration: number;
  width: number;
  height: number;
  codec: string;
  file_size: number;
  bitrate: number;
  fps: number;
}

/** ffprobe JSON output structure (subset used by PropertiesAgent) */
export interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  /** ffprobe emits width/height as numbers, not strings. */
  width?: number;
  height?: number;
  r_frame_rate?: string;
}

export interface FfprobeFormat {
  duration?: string;
  size?: string;
  bit_rate?: string;
}

export interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

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
