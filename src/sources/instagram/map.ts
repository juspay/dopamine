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
