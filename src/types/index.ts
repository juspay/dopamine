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
  width?: string;
  height?: string;
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
