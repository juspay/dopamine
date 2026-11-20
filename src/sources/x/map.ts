// src/sources/x/map.ts
import type { SourceItem } from "../../types/index.js";
import type { XPost } from "./parse.js";

const TITLE_MAX = 120;

export function xId(tweetId: string): string {
  return `x_${tweetId}`;
}

export function xPostToSourceItem(post: XPost): SourceItem {
  const firstLine =
    post.text
      .split("\n")
      .find((l) => l.trim() !== "")
      ?.trim() ?? "";
  return {
    id: xId(post.id),
    source: "x",
    content_type: post.videoUrl ? "short_video" : "text_post",
    title: firstLine === "" ? `Post by @${post.handle}` : firstLine.slice(0, TITLE_MAX),
    author: `@${post.handle}`,
    caption_text: post.text,
    url: `https://x.com/${post.handle}/status/${post.id}`,
    thumbnail_url: post.photos[0] ?? null,
    published_at: post.createdAt,
    duration_seconds: null,
    x: {
      tweetId: post.id,
      handle: post.handle,
      videoUrl: post.videoUrl,
      links: post.links,
      quoted: post.quoted ? { handle: post.quoted.handle, text: post.quoted.text, links: post.quoted.links } : null,
    },
  };
}
