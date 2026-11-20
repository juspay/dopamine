// src/__tests__/x-parse.test.ts
//
// Fixtures are written by hand from the response SHAPE recorded by the spike (key paths and
// types only). Every id, handle and text here is invented.
import { describe, expect, it } from "vitest";
import { xPostToSourceItem } from "../sources/x/map.js";
import { parseBookmarksResponse } from "../sources/x/parse.js";

const user = (handle: string, name = "A Name") => ({
  user_results: { result: { __typename: "User", rest_id: "u1", core: { screen_name: handle, name } } },
});

const tweet = (id: string, over: Record<string, unknown> = {}, legacy: Record<string, unknown> = {}) => ({
  __typename: "Tweet",
  rest_id: id,
  core: user("handle_" + id),
  legacy: {
    created_at: "Wed Nov 18 10:00:00 +0000 2026",
    full_text: `text of ${id}`,
    entities: { urls: [] },
    ...legacy,
  },
  ...over,
});

const entry = (result: unknown, id = "1") => ({
  entryId: `tweet-${id}`,
  content: {
    __typename: "TimelineTimelineItem",
    itemContent: { __typename: "TimelineTweet", tweet_results: { result } },
  },
});
const cursor = (type: "Top" | "Bottom", value: string) => ({
  entryId: `cursor-${type.toLowerCase()}-9`,
  content: { __typename: "TimelineTimelineCursor", cursorType: type, value },
});
const page = (entries: unknown[], key = "bookmark_timeline_v2") => ({
  data: { [key]: { timeline: { instructions: [{ type: "TimelineAddEntries", entries }] } } },
});

describe("parseBookmarksResponse", () => {
  it("reads id, author, date, text and the bottom cursor from a plain page", () => {
    const r = parseBookmarksResponse(
      page([entry(tweet("101"), "101"), cursor("Top", "t"), cursor("Bottom", "b-cursor")]),
    );
    expect(r.entries).toBe(1);
    expect(r.unparsed).toBe(0);
    expect(r.bottomCursor).toBe("b-cursor");
    expect(r.posts).toEqual([
      {
        id: "101",
        handle: "handle_101",
        name: "A Name",
        createdAt: "2026-11-18T10:00:00.000Z",
        text: "text of 101",
        links: [],
        photos: [],
        videoUrl: null,
        quoted: null,
      },
    ]);
  });

  it("prefers the long-post text over the truncated one", () => {
    const t = tweet("1", { note_tweet: { note_tweet_results: { result: { text: "the whole long post" } } } });
    expect(parseBookmarksResponse(page([entry(t)])).posts[0].text).toBe("the whole long post");
  });

  it("falls back to the short text when the long-post object has no text", () => {
    const t = tweet("1", { note_tweet: { note_tweet_results: { result: { id: "x" } } } });
    expect(parseBookmarksResponse(page([entry(t)])).posts[0].text).toBe("text of 1");
  });

  it("collects expanded links, photos and the highest-bitrate mp4", () => {
    const t = tweet(
      "1",
      {},
      {
        entities: { urls: [{ expanded_url: "https://example.com/a" }, { url: "https://t.co/x" }] },
        extended_entities: {
          media: [
            { type: "photo", media_url_https: "https://pbs.twimg.com/p1.jpg" },
            {
              type: "video",
              media_url_https: "https://pbs.twimg.com/poster.jpg",
              video_info: {
                variants: [
                  { content_type: "application/x-mpegURL", url: "https://video.twimg.com/pl.m3u8" },
                  { content_type: "video/mp4", bitrate: 832000, url: "https://video.twimg.com/low.mp4" },
                  { content_type: "video/mp4", bitrate: 2176000, url: "https://video.twimg.com/high.mp4" },
                ],
              },
            },
          ],
        },
      },
    );
    const p = parseBookmarksResponse(page([entry(t)])).posts[0];
    expect(p.links).toEqual(["https://example.com/a"]);
    expect(p.photos).toEqual(["https://pbs.twimg.com/p1.jpg", "https://pbs.twimg.com/poster.jpg"]);
    expect(p.videoUrl).toBe("https://video.twimg.com/high.mp4");
  });

  it("reads a quoted post one level deep", () => {
    const t = tweet("1", { quoted_status_result: { result: tweet("2") } });
    const p = parseBookmarksResponse(page([entry(t)])).posts[0];
    expect(p.quoted).toMatchObject({ id: "2", handle: "handle_2", text: "text of 2", quoted: null });
  });

  it("unwraps a post delivered inside TweetWithVisibilityResults", () => {
    const wrapped = { __typename: "TweetWithVisibilityResults", tweet: tweet("7") };
    expect(parseBookmarksResponse(page([entry(wrapped)])).posts.map((p) => p.id)).toEqual(["7"]);
  });

  it("reads the handle from the older legacy location when core has none", () => {
    const t = {
      ...tweet("1"),
      core: { user_results: { result: { legacy: { screen_name: "old_style", name: "Old" } } } },
    };
    expect(parseBookmarksResponse(page([entry(t)])).posts[0]).toMatchObject({ handle: "old_style", name: "Old" });
  });

  it("skips a tombstone and an unavailable post, and counts only the empty result as unreadable", () => {
    const r = parseBookmarksResponse(
      page([
        entry({ __typename: "TweetTombstone" }),
        entry({ __typename: "TweetUnavailable" }),
        entry(undefined),
        entry(tweet("5"), "5"),
      ]),
    );
    expect(r.entries).toBe(4);
    expect(r.unparsed).toBe(1);
    expect(r.posts.map((p) => p.id)).toEqual(["5"]);
  });

  it("returns an empty page with its cursor at the end of the feed", () => {
    const r = parseBookmarksResponse(page([cursor("Top", "t"), cursor("Bottom", "b")]));
    expect(r).toMatchObject({ posts: [], entries: 0, unparsed: 0, bottomCursor: "b" });
  });

  it("accepts the other timeline keys seen in the wild", () => {
    expect(parseBookmarksResponse(page([entry(tweet("1"))], "bookmark_timeline")).posts).toHaveLength(1);
  });

  it("returns nothing, without throwing, for a body that is not a bookmarks timeline", () => {
    for (const body of [
      null,
      42,
      "x",
      {},
      { data: {} },
      { data: { bookmark_timeline_v2: { timeline: { instructions: "no" } } } },
    ]) {
      expect(parseBookmarksResponse(body)).toEqual({
        posts: [],
        bottomCursor: null,
        unparsed: 0,
        entries: 0,
        recognised: false,
        refused: false,
      });
    }
  });

  it("skips a post with no id or no author handle", () => {
    const noId = { ...tweet("1"), rest_id: undefined };
    const noUser = { ...tweet("2"), core: {} };
    const r = parseBookmarksResponse(page([entry(noId), entry(noUser)]));
    expect(r.posts).toEqual([]);
    expect(r.unparsed).toBe(2);
  });
});

describe("parseBookmarksResponse — what kind of answer it is", () => {
  it("recognises a real timeline, including an empty one at the end of the feed", () => {
    expect(parseBookmarksResponse(page([cursor("Bottom", "b")]))).toMatchObject({
      recognised: true,
      refused: false,
      entries: 0,
    });
  });
  it("flags an error body as refused, not as an empty feed", () => {
    expect(parseBookmarksResponse({ errors: [{ code: 326, message: "locked" }] })).toMatchObject({
      recognised: false,
      refused: true,
    });
  });
  it("does not recognise a renamed timeline key", () => {
    expect(parseBookmarksResponse(page([entry(tweet("1"))], "bookmark_timeline_v3"))).toMatchObject({
      recognised: false,
      posts: [],
    });
  });
  it("counts tombstones as entries but not as unreadable", () => {
    const r = parseBookmarksResponse(
      page([entry({ __typename: "TweetTombstone" }), entry({ __typename: "TweetUnavailable" })]),
    );
    expect(r).toMatchObject({ entries: 2, unparsed: 0, posts: [] });
  });
});

describe("parseBookmarksResponse — untrusted values", () => {
  it("rejects an id that is not a number or a handle that is not a handle", () => {
    const badId = { ...tweet("1"), rest_id: "../../../../tmp/evil" };
    const badHandle = { ...tweet("2"), core: user("../x") };
    const r = parseBookmarksResponse(page([entry(badId), entry(badHandle), entry(tweet("3"), "3")]));
    expect(r.posts.map((p) => p.id)).toEqual(["3"]);
    expect(r.unparsed).toBe(2);
  });
  it("keeps media only from X's own https media hosts", () => {
    const t = tweet(
      "1",
      {},
      {
        extended_entities: {
          media: [
            { type: "photo", media_url_https: "http://169.254.169.254/x.jpg" },
            { type: "photo", media_url_https: "https://evil.example/p.jpg" },
            { type: "photo", media_url_https: "https://pbs.twimg.com/media/ok.jpg" },
            {
              type: "video",
              media_url_https: "https://pbs.twimg.com/poster.jpg",
              video_info: {
                variants: [
                  { content_type: "video/mp4", bitrate: 9, url: "https://evil.example/v.mp4" },
                  { content_type: "video/mp4", bitrate: 1, url: "https://video.twimg.com/v.mp4" },
                ],
              },
            },
          ],
        },
      },
    );
    const p = parseBookmarksResponse(page([entry(t)])).posts[0];
    expect(p.photos).toEqual(["https://pbs.twimg.com/media/ok.jpg", "https://pbs.twimg.com/poster.jpg"]);
    expect(p.videoUrl).toBe("https://video.twimg.com/v.mp4");
  });
});

describe("parseBookmarksResponse — readable text", () => {
  it("replaces shortened links with their targets and drops the media link", () => {
    const t = tweet(
      "1",
      {},
      {
        full_text: "Read this https://t.co/aaa and see https://t.co/mmm",
        entities: {
          urls: [{ url: "https://t.co/aaa", expanded_url: "https://example.com/post" }],
          media: [{ url: "https://t.co/mmm" }],
        },
      },
    );
    expect(parseBookmarksResponse(page([entry(t)])).posts[0].text).toBe("Read this https://example.com/post and see");
  });
  it("leaves a photo-only post with empty text, so it counts as nothing to analyse", () => {
    const t = tweet(
      "1",
      {},
      { full_text: "https://t.co/mmm", entities: { urls: [], media: [{ url: "https://t.co/mmm" }] } },
    );
    expect(parseBookmarksResponse(page([entry(t)])).posts[0].text).toBe("");
  });
  it("decodes the three entities X escapes", () => {
    const t = tweet("1", {}, { full_text: "a &amp; b &lt;c&gt;" });
    expect(parseBookmarksResponse(page([entry(t)])).posts[0].text).toBe("a & b <c>");
  });
  it("takes links from a long post's own link list too", () => {
    const t = tweet("1", {
      note_tweet: {
        note_tweet_results: {
          result: {
            text: "long https://t.co/zzz",
            entity_set: { urls: [{ url: "https://t.co/zzz", expanded_url: "https://example.com/long" }] },
          },
        },
      },
    });
    const p = parseBookmarksResponse(page([entry(t)])).posts[0];
    expect(p.text).toBe("long https://example.com/long");
    expect(p.links).toEqual(["https://example.com/long"]);
  });
});

describe("xPostToSourceItem", () => {
  const post = parseBookmarksResponse(page([entry(tweet("101"))])).posts[0];

  it("maps a text post", () => {
    expect(xPostToSourceItem({ ...post, text: "First line\nsecond line" })).toMatchObject({
      id: "x_101",
      source: "x",
      content_type: "text_post",
      title: "First line",
      author: "@handle_101",
      caption_text: "First line\nsecond line",
      url: "https://x.com/handle_101/status/101",
      published_at: "2026-11-18T10:00:00.000Z",
      thumbnail_url: null,
      duration_seconds: null,
    });
  });

  it("is a short video when the post has one, and uses the first photo as thumbnail", () => {
    const item = xPostToSourceItem({
      ...post,
      videoUrl: "https://video.twimg.com/a.mp4",
      photos: ["https://pbs.twimg.com/p.jpg"],
    });
    expect(item.content_type).toBe("short_video");
    expect(item.thumbnail_url).toBe("https://pbs.twimg.com/p.jpg");
    expect(item.x?.videoUrl).toBe("https://video.twimg.com/a.mp4");
  });

  it("cuts the title at 120 characters and falls back to the handle for a post with no text", () => {
    expect(xPostToSourceItem({ ...post, text: "a".repeat(300) }).title).toHaveLength(120);
    expect(xPostToSourceItem({ ...post, text: "" }).title).toBe("Post by @handle_101");
  });
});
