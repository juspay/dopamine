// src/pipeline/piggyback/map-web-media.ts
import type { MetadataEntry } from "../../types/index.js";

interface WebMedia {
  pk?: number | string;
  code?: string;
  media_type?: number;
  taken_at?: number;
  caption?: { text?: string } | null;
  user?: { username?: string; full_name?: string };
  like_count?: number;
  comment_count?: number;
  image_versions2?: { candidates?: Array<{ url?: string }> };
  video_versions?: Array<{ url?: string }>;
  carousel_media?: WebMedia[];
  location?: { pk?: number; name?: string; lat?: number | null; lng?: number | null } | null;
}
interface WebItem {
  media?: WebMedia;
}

/** The saved-feed + named-collection endpoints IG's own web client hits. */
export function isSavedFeedUrl(url: string): boolean {
  return /\/api\/v1\/feed\/saved\/posts\//.test(url) || /\/api\/v1\/feed\/collection\/\d+\/posts\//.test(url);
}

const isoFromEpoch = (s?: number): string | null => (typeof s === "number" ? new Date(s * 1000).toISOString() : null);
const thumb = (m: WebMedia): string | null => m.image_versions2?.candidates?.[0]?.url ?? null;
const vurl = (m: WebMedia): string | null => m.video_versions?.[0]?.url ?? null;

function toEntry(m: WebMedia | undefined): MetadataEntry | null {
  if (!m || m.pk == null || m.media_type == null || !m.code) return null;
  const loc = m.location
    ? { pk: m.location.pk ?? 0, name: m.location.name ?? "", lat: m.location.lat ?? null, lng: m.location.lng ?? null }
    : null;
  return {
    pk: String(m.pk),
    code: m.code,
    media_type: m.media_type,
    taken_at: isoFromEpoch(m.taken_at),
    caption_text: m.caption?.text ?? null,
    username: m.user?.username ?? null,
    full_name: m.user?.full_name ?? null,
    location: loc,
    like_count: m.like_count ?? 0,
    comment_count: m.comment_count ?? 0,
    video_url: vurl(m),
    thumbnail_url: thumb(m),
    resources: (m.carousel_media ?? []).map((r) => ({
      pk: String(r.pk ?? ""),
      media_type: r.media_type ?? 0,
      video_url: vurl(r),
      thumbnail_url: thumb(r),
    })),
  };
}

/** Map an Instagram web saved-feed response ({items:[{media}]}) to MetadataEntry[]. */
export function webResponseToEntries(json: { items?: WebItem[] }): MetadataEntry[] {
  return (json.items ?? [])
    .map((it) => toEntry(it.media ?? (it as unknown as WebMedia)))
    .filter((e): e is MetadataEntry => e !== null);
}
