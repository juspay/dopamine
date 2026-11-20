// src/__tests__/x-collector.test.ts
import { describe, expect, it, vi } from "vitest";
import { type XAcquireDeps, acquireX, itemsFromIncoming, transcriptFor } from "../sources/x/collector.js";
import { xPostToSourceItem } from "../sources/x/map.js";
import type { XPost } from "../sources/x/parse.js";

const post = (over: Partial<XPost> = {}): XPost => ({
  id: "101",
  handle: "someone",
  name: "Some One",
  createdAt: "2026-11-18T10:00:00.000Z",
  text: "A thought about caching",
  links: [],
  photos: [],
  videoUrl: null,
  quoted: null,
  ...over,
});

const deps = (over: Partial<XAcquireDeps> = {}) => {
  const d: XAcquireDeps = {
    videosDir: "/v/x",
    thumbDir: "/v/thumbnails",
    exists: vi.fn(async () => false),
    fetchBytes: vi.fn(async () => new Uint8Array([1, 2])),
    writeFile: vi.fn(async () => {}),
    runYtDlp: vi.fn(async () => {}),
    ...over,
  };
  return d;
};

describe("itemsFromIncoming", () => {
  it("maps every captured post and skips anything unreadable", () => {
    const items = itemsFromIncoming([post(), null, { id: 5 }, post({ id: "102" })]);
    expect(items.map((i) => i.id)).toEqual(["x_101", "x_102"]);
  });
  it("skips a stored record that is missing fields instead of failing the whole collection", () => {
    expect(itemsFromIncoming([{ id: "5", handle: "h" }, post()]).map((i) => i.id)).toEqual(["x_101"]);
  });
  it("returns nothing for a missing or broken file", () => {
    expect(itemsFromIncoming(undefined)).toEqual([]);
    expect(itemsFromIncoming("nope")).toEqual([]);
  });
});

describe("transcriptFor", () => {
  it("is the post, then the quoted post, then the links", () => {
    const item = xPostToSourceItem(
      post({
        links: ["https://example.com/a"],
        quoted: post({ id: "9", handle: "other", text: "the quoted words", links: ["https://example.com/q"] }),
      }),
    );
    expect(transcriptFor(item)).toBe(
      "A thought about caching\n\nQuoted post by @other:\nthe quoted words\n\nLinks:\nhttps://example.com/a\nhttps://example.com/q",
    );
  });
  it("is just the text for a plain post, and empty for a post with nothing", () => {
    expect(transcriptFor(xPostToSourceItem(post()))).toBe("A thought about caching");
    expect(transcriptFor(xPostToSourceItem(post({ text: "" })))).toBe("");
  });
});

describe("acquireX", () => {
  it("gives a text post its transcript and no video", async () => {
    const d = deps();
    expect(await acquireX(xPostToSourceItem(post()), d)).toEqual({
      videoPath: null,
      thumbnailPath: null,
      transcriptText: "A thought about caching",
    });
    expect(d.fetchBytes).not.toHaveBeenCalled();
  });

  it("saves the first photo as the thumbnail under the item id", async () => {
    const d = deps();
    const r = await acquireX(
      xPostToSourceItem(post({ photos: ["https://pbs.twimg.com/p.jpg", "https://pbs.twimg.com/q.jpg"] })),
      d,
    );
    expect(r?.thumbnailPath).toBe("/v/thumbnails/x_101.jpg");
    expect(d.fetchBytes).toHaveBeenCalledWith("https://pbs.twimg.com/p.jpg");
    expect(d.writeFile).toHaveBeenCalledTimes(1);
  });

  it("downloads the captured mp4 for a video post", async () => {
    const d = deps();
    const r = await acquireX(xPostToSourceItem(post({ videoUrl: "https://video.twimg.com/a.mp4" })), d);
    expect(r?.videoPath).toBe("/v/x/101.mp4");
    expect(d.runYtDlp).not.toHaveBeenCalled();
  });

  it("reuses a video and thumbnail already on disk", async () => {
    const d = deps({ exists: vi.fn(async () => true) });
    const r = await acquireX(
      xPostToSourceItem(post({ videoUrl: "https://video.twimg.com/a.mp4", photos: ["https://pbs.twimg.com/p.jpg"] })),
      d,
    );
    expect(r).toMatchObject({ videoPath: "/v/x/101.mp4", thumbnailPath: "/v/thumbnails/x_101.jpg" });
    expect(d.fetchBytes).not.toHaveBeenCalled();
  });

  it("falls back to yt-dlp on the post when the captured mp4 link fails", async () => {
    const d = deps({
      fetchBytes: vi.fn(async () => {
        throw new Error("403");
      }),
    });
    const r = await acquireX(xPostToSourceItem(post({ videoUrl: "https://video.twimg.com/a.mp4" })), d);
    expect(d.runYtDlp).toHaveBeenCalledWith("https://x.com/someone/status/101", "/v/x/101.mp4");
    expect(r?.videoPath).toBe("/v/x/101.mp4");
  });

  it("still goes ahead as text, with a note, when the video cannot be had either way", async () => {
    const d = deps({
      fetchBytes: vi.fn(async () => {
        throw new Error("403");
      }),
      runYtDlp: vi.fn(async () => {
        throw new Error("no");
      }),
    });
    const r = await acquireX(xPostToSourceItem(post({ videoUrl: "https://video.twimg.com/a.mp4" })), d);
    expect(r?.videoPath).toBeNull();
    expect(r?.transcriptText).toContain("A thought about caching");
    expect(r?.transcriptText).toMatch(/video.*could not be downloaded/i);
  });

  it("a thumbnail that cannot be fetched does not fail the post", async () => {
    const d = deps({
      fetchBytes: vi.fn(async () => {
        throw new Error("404");
      }),
    });
    const r = await acquireX(xPostToSourceItem(post({ photos: ["https://pbs.twimg.com/p.jpg"] })), d);
    expect(r).toEqual({ videoPath: null, thumbnailPath: null, transcriptText: "A thought about caching" });
  });

  it("returns null, nothing to analyse, for a post with no text and no video", async () => {
    expect(
      await acquireX(xPostToSourceItem(post({ text: "", photos: ["https://pbs.twimg.com/p.jpg"] })), deps()),
    ).toBeNull();
  });

  it("returns null for an item that is not an x post", async () => {
    const item = { ...xPostToSourceItem(post()), x: undefined };
    expect(await acquireX(item, deps())).toBeNull();
  });
});
