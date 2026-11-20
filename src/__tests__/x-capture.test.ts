// src/__tests__/x-capture.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  BrowserStartError,
  COOLOFF_HOURS,
  FormatChangedError,
  NoBookmarksResponseError,
  type PageDriver,
  browserArgs,
  capture,
  clampScrolls,
  coolingOffUntil,
  detectStop,
  exitCodeFor,
  mergeIncoming,
  statusAfter,
} from "../pipeline/x-harvest/capture.js";
import type { XPost } from "../sources/x/parse.js";

const tweetEntry = (id: string, ok = true) => ({
  entryId: `tweet-${id}`,
  content: {
    itemContent: {
      tweet_results: {
        result: ok
          ? {
              __typename: "Tweet",
              rest_id: id,
              core: { user_results: { result: { core: { screen_name: "h", name: "N" } } } },
              legacy: { full_text: `t${id}`, created_at: "Wed Nov 18 10:00:00 +0000 2026" },
            }
          : { __typename: "SomethingNew" },
      },
    },
  },
});
const body = (ids: string[], ok = true) => ({
  data: {
    bookmark_timeline_v2: {
      timeline: {
        instructions: [
          {
            type: "TimelineAddEntries",
            entries: [
              ...ids.map((i) => tweetEntry(i, ok)),
              { entryId: "cursor-bottom-1", content: { cursorType: "Bottom", value: "c" } },
            ],
          },
        ],
      },
    },
  },
});

/** A page that serves `pages` one per drain, then nothing. */
function fakeDriver(pages: unknown[][], over: Partial<PageDriver> = {}) {
  let i = 0;
  const d = {
    open: vi.fn(async () => {}),
    scroll: vi.fn(async () => {}),
    state: vi.fn(async () => ({ path: "/i/bookmarks", text: "Bookmarks" })),
    drain: vi.fn(async () => (pages[i++] ?? []).map((b) => ({ status: 200, body: b }))),
    rateLimited: vi.fn(() => false),
    wait: vi.fn(async () => {}),
    ...over,
  };
  return d;
}
const opts = { scrolls: 10, known: new Set<string>(), knownRunStop: 5, pauseMs: () => 1, initialMs: 1 };

describe("detectStop", () => {
  it("names a login wall, a challenge and nothing for the bookmarks page", () => {
    expect(detectStop({ path: "/i/flow/login", text: "" }, true)).toBe("login-wall");
    expect(detectStop({ path: "/login", text: "" }, false)).toBe("login-wall");
    expect(detectStop({ path: "/i/bookmarks", text: "We noticed unusual activity on your account" }, true)).toBe(
      "challenge",
    );
    expect(detectStop({ path: "/i/bookmarks", text: "Verify you are human" }, true)).toBe("challenge");
    expect(detectStop({ path: "/i/bookmarks", text: "Your account is suspended" }, true)).toBe("challenge");
    expect(detectStop({ path: "/i/bookmarks", text: "Your account is suspended" }, false)).toBeNull();
    expect(detectStop({ path: "/account/access", text: "" }, false)).toBe("challenge");
    expect(detectStop({ path: "/i/history", text: "Bookmarks" }, true)).toBeNull();
  });
});

describe("capture", () => {
  it("collects posts page by page and stops at the empty page that ends the feed", async () => {
    const d = fakeDriver([[body(["1", "2"])], [body(["3"])], [body([])]]);
    const r = await capture(d, opts);
    expect(r.stop).toBe("done");
    expect(r.posts.map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(d.scroll).toHaveBeenCalledTimes(2);
  });

  it("never scrolls more than the limit", async () => {
    const pages = Array.from({ length: 50 }, (_, n) => [body([String(n)])]);
    const d = fakeDriver(pages);
    await capture(d, { ...opts, scrolls: 4 });
    expect(d.scroll).toHaveBeenCalledTimes(4);
  });

  it("stops early once it has seen a run of posts it already has", async () => {
    const d = fakeDriver([[body(["1", "2", "3", "4", "5", "6"])], [body(["7"])], [body(["8"])]]);
    const r = await capture(d, { ...opts, known: new Set(["2", "3", "4", "5", "6"]), knownRunStop: 5 });
    expect(d.scroll).not.toHaveBeenCalled();
    expect(r.posts.map((p) => p.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("drops a post delivered twice", async () => {
    const r = await capture(fakeDriver([[body(["1"]), body(["1", "2"])], [body([])]]), opts);
    expect(r.posts.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it.each([
    ["a login wall", { state: async () => ({ path: "/i/flow/login", text: "" }) }, "login-wall"],
    [
      "a challenge",
      { state: async () => ({ path: "/i/bookmarks", text: "unusual activity" }), drain: async () => [] },
      "challenge",
    ],
    ["a rate limit", { rateLimited: () => true }, "rate-limited"],
  ])("stops at once on %s without scrolling", async (_n, over, reason) => {
    const d = fakeDriver([[body(["1"])], [body(["2"])]], over as Partial<PageDriver>);
    const r = await capture(d, opts);
    expect(r.stop).toBe(reason);
    expect(d.scroll).not.toHaveBeenCalled();
  });

  it("fails loudly when the page shows posts but none could be read", async () => {
    await expect(capture(fakeDriver([[body(["1", "2"], false)], [body([])]]), opts)).rejects.toBeInstanceOf(
      FormatChangedError,
    );
  });

  it("is a clean empty result for an account with no bookmarks", async () => {
    const r = await capture(fakeDriver([[body([])]]), opts);
    expect(r).toMatchObject({ stop: "done", posts: [] });
  });

  it("stops, with what it has so far, when a challenge appears part-way through", async () => {
    let scrolled = 0;
    const d = fakeDriver([[body(["1"])], [body(["2"])], [body(["3"])]], {
      scroll: vi.fn(async () => {
        scrolled++;
      }),
      state: async () => ({ path: scrolled < 1 ? "/i/bookmarks" : "/account/access", text: "" }),
    });
    const r = await capture(d, opts);
    expect(r.stop).toBe("challenge");
    expect(r.posts.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it.each([
    [401, "login-wall"],
    [403, "login-wall"],
    [429, "rate-limited"],
    [500, "refused"],
  ])("treats a bookmarks answer of HTTP %i as a stop and never scrolls", async (status, reason) => {
    const d = fakeDriver([], { drain: vi.fn(async () => [{ status: status as number, body: {} }]) });
    const r = await capture(d, opts);
    expect(r.stop).toBe(reason);
    expect(d.scroll).not.toHaveBeenCalled();
  });

  it("treats an error body with HTTP 200 as refused, not as the end of the feed", async () => {
    const d = fakeDriver([[{ errors: [{ code: 326 }] }]]);
    const r = await capture(d, opts);
    expect(r.stop).toBe("refused");
    expect(d.scroll).not.toHaveBeenCalled();
  });

  it("fails as a format change when the answer has no timeline it knows", async () => {
    await expect(capture(fakeDriver([[{ data: { bookmark_timeline_v9: {} } }]]), opts)).rejects.toBeInstanceOf(
      FormatChangedError,
    );
  });

  it("does not scroll at all when the page never fetched its bookmarks", async () => {
    const d = fakeDriver([]);
    await expect(capture(d, opts)).rejects.toBeInstanceOf(NoBookmarksResponseError);
    expect(d.scroll).not.toHaveBeenCalled();
  });

  it("does not mistake a bookmarked post's own words for a challenge", async () => {
    const d = fakeDriver([[body(["1"])], [body([])]], {
      state: async () => ({
        path: "/i/bookmarks",
        text: "How to detect unusual activity in your logs. My account is locked.",
      }),
    });
    expect((await capture(d, opts)).stop).toBe("done");
  });

  it("says whether it reached the end of the feed or ran out of scrolls", async () => {
    expect((await capture(fakeDriver([[body(["1"])], [body([])]]), opts)).reachedEnd).toBe(true);
    const many = Array.from({ length: 9 }, (_, n) => [body([String(n)])]);
    expect((await capture(fakeDriver(many), { ...opts, scrolls: 3 })).reachedEnd).toBe(false);
  });

  it("does not stop early on known posts until a past run has reached the end", async () => {
    const d = fakeDriver([[body(["1", "2", "3", "4", "5", "6"])], [body(["7"])], [body([])]]);
    const r = await capture(d, { ...opts, known: new Set(["1", "2", "3", "4", "5", "6"]), knownRunStop: null });
    expect(r.posts.map((p) => p.id)).toContain("7");
  });

  it("a feed of only removed posts is an empty result, not a format change", async () => {
    const gone = {
      data: {
        bookmark_timeline_v2: {
          timeline: {
            instructions: [
              {
                entries: [
                  {
                    entryId: "tweet-1",
                    content: { itemContent: { tweet_results: { result: { __typename: "TweetTombstone" } } } },
                  },
                ],
              },
            ],
          },
        },
      },
    };
    expect((await capture(fakeDriver([[gone], [body([])]]), opts)).stop).toBe("done");
  });

  it("drives the page only through open, scroll and read", async () => {
    const d = fakeDriver([[body(["1"])], [body([])]]);
    await capture(d, opts);
    expect(d.open).toHaveBeenCalledWith("https://x.com/i/bookmarks");
    expect(Object.keys(d).sort()).toEqual(["drain", "open", "rateLimited", "scroll", "state", "wait"]);
  });
});

const post = (id: string, text = "t"): XPost => ({
  id,
  handle: "h",
  name: "N",
  createdAt: null,
  text,
  links: [],
  photos: [],
  videoUrl: null,
  quoted: null,
});

describe("mergeIncoming", () => {
  it("keeps what was already captured, lets the new copy win, and counts what is new", () => {
    const r = mergeIncoming([post("1", "old"), post("2")], [post("1", "new"), post("3")]);
    expect(r.added).toBe(1);
    expect(r.posts.map((p) => [p.id, p.text])).toEqual([
      ["1", "new"],
      ["3", "t"],
      ["2", "t"],
    ]);
  });
  it("adds nothing on a second identical run", () => {
    expect(mergeIncoming([post("1")], [post("1")]).added).toBe(0);
  });
  it("treats an unreadable stored file as empty", () => {
    expect(mergeIncoming("garbage" as unknown as XPost[], [post("1")]).posts).toHaveLength(1);
  });
});

describe("browserArgs", () => {
  const base = ["--headless=new", "--remote-debugging-port=1", "about:blank"];
  it("opens a visible window unless headless is asked for, so the job looks like the login did", () => {
    expect(browserArgs(base, false)).toEqual(["--remote-debugging-port=1", "about:blank"]);
    expect(browserArgs(base, true)).toEqual(base);
  });
});

describe("clampScrolls and exitCodeFor", () => {
  it("keeps scrolls between 0 and 100 and falls back to 40 for nonsense", () => {
    expect([clampScrolls(Number.NaN), clampScrolls(-3), clampScrolls(7.9), clampScrolls(5000)]).toEqual([
      40, 0, 7, 100,
    ]);
  });
  it("gives each outcome its own exit code, and only a browser that never started is retryable", () => {
    expect(exitCodeFor("done")).toBe(0);
    expect(exitCodeFor("challenge")).toBe(3);
    expect(exitCodeFor(new FormatChangedError(2))).toBe(4);
    expect(exitCodeFor(new NoBookmarksResponseError())).toBe(4);
    expect(exitCodeFor(new BrowserStartError("port"))).toBe(5);
    expect(exitCodeFor(new Error("anything else"))).toBe(1);
  });
});

describe("cool-off", () => {
  const now = new Date("2026-11-20T06:00:00Z");
  it("is 23 hours after any stop, so tomorrow's 06:00 run is not skipped by seconds, and none after a clean run", () => {
    expect(COOLOFF_HOURS).toBe(23);
    for (const stop of ["login-wall", "challenge", "rate-limited", "refused"] as const) {
      expect(statusAfter({ stop, captured: 0, added: 0 }, now).cooloff_until).toBe("2026-11-21T05:00:00.000Z");
    }
    expect(statusAfter({ stop: "done", captured: 8, added: 2 }, now)).toMatchObject({
      cooloff_until: null,
      last_success: now.toISOString(),
      captured: 8,
      added: 2,
    });
  });
  it("holds until the time has passed, and ignores a missing or broken status file", () => {
    const status = statusAfter({ stop: "challenge", captured: 0, added: 0 }, now);
    expect(coolingOffUntil(status, new Date("2026-11-20T20:00:00Z"))).toBe("2026-11-21T05:00:00.000Z");
    expect(coolingOffUntil(status, new Date("2026-11-21T05:00:01Z"))).toBeNull();
    expect(coolingOffUntil(null, now)).toBeNull();
    expect(coolingOffUntil({ cooloff_until: "nonsense" }, now)).toBeNull();
  });
});
