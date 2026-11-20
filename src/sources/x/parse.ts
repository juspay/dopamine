// src/sources/x/parse.ts
//
// Reads the bookmarks timeline X's own web page fetches. The shape was recorded from the
// live page (docs/x-harvest-setup.md); everything is read defensively because X changes it.

export interface XPost {
  id: string;
  handle: string;
  name: string;
  createdAt: string | null;
  text: string;
  /** Expanded link targets, not t.co shorteners. */
  links: string[];
  photos: string[];
  /** The highest-bitrate mp4, when the post has a video or gif. */
  videoUrl: string | null;
  quoted: XPost | null;
}

export interface ParsedBookmarks {
  posts: XPost[];
  bottomCursor: string | null;
  /** Timeline entries that should have been a post and could not be read. */
  unparsed: number;
  /** Timeline entries that are posts (parsed, removed or unreadable), cursors excluded. */
  entries: number;
  /** A bookmarks timeline this parser knows was found. False means X changed the shape. */
  recognised: boolean;
  /** X answered with an error body instead of a timeline (a locked or refused session). */
  refused: boolean;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const at = (v: unknown, ...keys: string[]): unknown => keys.reduce<unknown>((cur, k) => obj(cur)?.[k], v);

const TIMELINE_KEYS = ["bookmark_timeline_v2", "bookmark_timeline", "bookmark_collection_timeline"];

function toIso(created: unknown): string | null {
  const s = str(created);
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

// Everything below comes from X's response and ends up in file names and fetches, so it is
// checked, not trusted: ids are digits, handles are handles, media is https on X's media hosts.
const ID = /^\d{1,25}$/;
const HANDLE = /^\w{1,15}$/;

function mediaUrl(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && /(^|\.)twimg\.com$/.test(u.hostname) ? s : null;
  } catch {
    return null;
  }
}

function bestMp4(media: Obj): string | null {
  const mp4s = arr(at(media, "video_info", "variants"))
    .map(obj)
    .filter((v): v is Obj => v !== null && v.content_type === "video/mp4" && mediaUrl(v.url) !== null);
  if (mp4s.length === 0) return null;
  const best = mp4s.reduce((a, b) => (Number(b.bitrate ?? 0) > Number(a.bitrate ?? 0) ? b : a));
  return mediaUrl(best.url);
}

interface UrlEntity {
  short: string | null;
  expanded: string | null;
}
const urlEntities = (list: unknown): UrlEntity[] =>
  arr(list)
    .map(obj)
    .filter((u): u is Obj => u !== null)
    .map((u) => ({ short: str(u.url), expanded: str(u.expanded_url) }));

/**
 * The text a person reads: shortened links replaced by where they go, the media's own
 * t.co link removed (a photo-only post is then empty), and X's three HTML entities decoded.
 */
function readableText(raw: string, links: UrlEntity[], mediaShort: string[]): string {
  let text = raw;
  for (const l of links) if (l.short && l.expanded) text = text.split(l.short).join(l.expanded);
  for (const m of mediaShort) text = text.split(m).join("");
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const REMOVED = new Set(["TweetTombstone", "TweetUnavailable"]);

/** One post from a `tweet_results.result` object; "removed" for a deleted or withheld one; null when unreadable. */
function parseTweet(raw: unknown, depth = 0): XPost | "removed" | null {
  let t = obj(raw);
  if (t && REMOVED.has(String(t.__typename))) return "removed";
  if (t && t.__typename === "TweetWithVisibilityResults") t = obj(t.tweet);
  if (!t) return null;
  const id = str(t.rest_id);
  const userResult = at(t, "core", "user_results", "result");
  const handle = str(at(userResult, "core", "screen_name")) ?? str(at(userResult, "legacy", "screen_name"));
  if (!id || !handle || !ID.test(id) || !HANDLE.test(handle)) return null;
  const legacy = obj(t.legacy) ?? {};
  const media = arr(at(legacy, "extended_entities", "media"))
    .map(obj)
    .filter((m): m is Obj => m !== null);
  const note = obj(at(t, "note_tweet", "note_tweet_results", "result"));
  const noteText = str(note?.text);
  const links = [...urlEntities(at(legacy, "entities", "urls")), ...urlEntities(at(note, "entity_set", "urls"))];
  const mediaShort = [...arr(at(legacy, "entities", "media")), ...media]
    .map((m) => str(obj(m)?.url))
    .filter((u): u is string => u !== null);
  const quoted = depth === 0 ? parseTweet(at(t, "quoted_status_result", "result"), 1) : null;
  return {
    id,
    handle,
    name: str(at(userResult, "core", "name")) ?? str(at(userResult, "legacy", "name")) ?? handle,
    createdAt: toIso(legacy.created_at),
    text: readableText(noteText ?? str(legacy.full_text) ?? "", links, mediaShort),
    links: [...new Set(links.map((l) => l.expanded).filter((u): u is string => u !== null))],
    photos: media.map((m) => mediaUrl(m.media_url_https)).filter((u): u is string => u !== null),
    videoUrl: media.map(bestMp4).find((u): u is string => u !== null) ?? null,
    quoted: quoted !== null && quoted !== "removed" ? quoted : null,
  };
}

export function parseBookmarksResponse(body: unknown): ParsedBookmarks {
  const out: ParsedBookmarks = {
    posts: [],
    bottomCursor: null,
    unparsed: 0,
    entries: 0,
    recognised: false,
    refused: false,
  };
  if (arr(at(body, "errors")).length > 0) out.refused = true;
  const data = obj(at(body, "data"));
  if (!data) return out;
  const instructions = TIMELINE_KEYS.map((k) => at(data, k, "timeline", "instructions")).find((i) => Array.isArray(i));
  if (!Array.isArray(instructions)) return out;
  out.recognised = true;
  for (const instruction of instructions) {
    for (const rawEntry of arr(obj(instruction)?.entries)) {
      const entry = obj(rawEntry);
      const content = obj(entry?.content);
      if (!entry || !content) continue;
      if (str(content.cursorType)) {
        if (content.cursorType === "Bottom") out.bottomCursor = str(content.value);
        continue;
      }
      if (!String(entry.entryId ?? "").startsWith("tweet-")) continue;
      out.entries++;
      const post = parseTweet(at(content, "itemContent", "tweet_results", "result"));
      if (post === null) out.unparsed++;
      else if (post !== "removed") out.posts.push(post);
    }
  }
  return out;
}
