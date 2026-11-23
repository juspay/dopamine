// src/sources/youtube/map.ts
import type { ContentType, SourceItem } from "../../types/index.js";

export interface YtVideoRaw {
  id: string;
  title: string;
  channelId: string | null;
  channelTitle: string | null;
  durationSeconds: number;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  /** YouTube's category ("10" is Music); null when the listing did not carry one. */
  categoryId?: string | null;
}

/** Music: YouTube's Music category, or an auto-generated "Artist - Topic" channel. */
export function isMusic(raw: YtVideoRaw): boolean {
  return raw.categoryId === "10" || / - Topic$/.test(raw.channelTitle ?? "");
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
