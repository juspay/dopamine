// src/__tests__/source-policy.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  type AcquireTally,
  OUTAGE_MIN_FAILURES,
  acquireHooksFor,
  applySourcePolicy,
  finishSourceRun,
  mergeWithStored,
  parseSince,
  previewSources,
  settleAcquire,
} from "../pipeline/source-policy.js";
import { type AttemptLedger, MAX_FAILURES, recordFailure } from "../sources/attempts.js";
import { type SourceCollector, SourceUnavailableError } from "../sources/types.js";
import type { SourceItem, SourceKind } from "../types/index.js";

const NOW = new Date("2026-10-18T00:00:00Z");

const item = (id: string, source: SourceKind): SourceItem => ({
  id,
  source,
  content_type: source === "instagram" ? "short_video" : "long_video",
  title: id,
  author: null,
  caption_text: null,
  url: null,
  thumbnail_url: null,
  published_at: null,
  duration_seconds: null,
});
const youtube = (n: number): SourceItem[] => Array.from({ length: n }, (_, i) => item(`youtube_${i}`, "youtube"));
const instagram = (n: number): SourceItem[] => Array.from({ length: n }, (_, i) => item(`u_${i}.mp4`, "instagram"));

const deps = (over: { done?: ReadonlySet<string>; ledger?: AttemptLedger } = {}) => ({
  now: NOW,
  max: 25,
  store: vi.fn(async (_batch: SourceItem[]) => {}),
  done: over.done ?? new Set<string>(),
  ledger: over.ledger ?? ({} as AttemptLedger),
});

describe("applySourcePolicy", () => {
  it("passes instagram items through untouched and in order", async () => {
    const ig = instagram(40);
    const { items } = await applySourcePolicy([...ig, ...youtube(3)], deps());
    const igOut = items.filter((i) => i.source === "instagram");
    expect(igOut).toHaveLength(40);
    igOut.forEach((out, n) => expect(out).toBe(ig[n]));
  });

  it("stores every non-instagram item but selects at most the cap per source", async () => {
    const d = deps();
    const { items, remaining } = await applySourcePolicy(youtube(40), d);
    expect(items).toHaveLength(25);
    expect(remaining).toEqual({ youtube: 15 });
    expect(d.store).toHaveBeenCalledTimes(1);
    expect(d.store.mock.calls[0][0]).toHaveLength(40);
  });

  it("never hands an instagram item to the store", async () => {
    const d = deps();
    await applySourcePolicy([...instagram(2), ...youtube(2)], d);
    expect(d.store.mock.calls[0][0].every((i) => i.source !== "instagram")).toBe(true);
  });

  it("leaves out done items", async () => {
    const { items } = await applySourcePolicy(youtube(3), deps({ done: new Set(["youtube_0"]) }));
    expect(items.map((i) => i.id)).toEqual(["youtube_1", "youtube_2"]);
  });

  it("does not call the store when there is nothing to store", async () => {
    const d = deps();
    await applySourcePolicy(instagram(2), d);
    expect(d.store).not.toHaveBeenCalled();
  });
});

describe("acquireHooksFor", () => {
  const setup = () => {
    const ref = { current: {} as AttemptLedger };
    const onOutage = vi.fn();
    return { ref, onOutage, hooks: acquireHooksFor(ref, () => NOW, onOutage) };
  };

  it("leaves an instagram null unrecorded and records a youtube null as empty", () => {
    const { ref, hooks } = setup();
    hooks.onEmpty?.(item("u_1.mp4", "instagram"));
    expect(ref.current).toEqual({});
    hooks.onEmpty?.(item("youtube_1", "youtube"));
    expect(ref.current.youtube_1.state).toBe("empty");
  });

  it("counts an ordinary failure and quarantines after the fifth", () => {
    const { ref, hooks } = setup();
    for (let n = 0; n < MAX_FAILURES; n++) hooks.onFailure?.(item("youtube_1", "youtube"), new Error("boom"));
    expect(ref.current.youtube_1).toMatchObject({ state: "quarantined", attempts: MAX_FAILURES });
  });

  it("ignores an instagram failure", () => {
    const { ref, hooks } = setup();
    hooks.onFailure?.(item("u_1.mp4", "instagram"), new Error("boom"));
    expect(ref.current).toEqual({});
  });

  it("leaves the ledger unchanged for a SourceUnavailableError and reports the outage", () => {
    const { ref, onOutage, hooks } = setup();
    const err = new SourceUnavailableError("youtube.com is unreachable");
    hooks.onFailure?.(item("youtube_1", "youtube"), err);
    expect(ref.current).toEqual({});
    expect(onOutage).toHaveBeenCalledWith("youtube", err);
  });

  it("clears the record on success", () => {
    const { ref, hooks } = setup();
    hooks.onFailure?.(item("youtube_1", "youtube"), new Error("boom"));
    hooks.onSuccess?.(item("youtube_1", "youtube"));
    expect(ref.current).toEqual({});
  });
});

describe("mergeWithStored", () => {
  const index = (...items: SourceItem[]) => new Map(items.map((i) => [i.id, i]));
  const enabled = new Set<SourceKind>(["youtube"]);

  it("adds stored unfinished items of enabled sources after the batch, never an instagram one", () => {
    const stored = index(item("youtube_9", "youtube"), item("u_1.mp4", "instagram"), item("x_1", "youtube"));
    const merged = mergeWithStored(youtube(2), stored, enabled);
    expect(merged.map((i) => i.id)).toEqual(["youtube_0", "youtube_1", "youtube_9", "x_1"]);
  });

  it("keeps the batch's fresh copy when the same id is already stored", () => {
    const fresh = { ...item("youtube_0", "youtube"), title: "fresh" };
    const old = { ...item("youtube_0", "youtube"), title: "stale" };
    const merged = mergeWithStored([fresh], index(old), enabled);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("fresh");
  });

  it("leaves out stored items of a source that is not enabled", () => {
    const merged = mergeWithStored([], index(item("youtube_9", "youtube")), new Set<SourceKind>());
    expect(merged).toEqual([]);
  });
});

describe("draining a backlog over successive runs", () => {
  it("run 2 takes the next 25 even when the collector now returns nothing new", async () => {
    const stored = new Map<string, SourceItem>();
    const store = vi.fn(async (batch: SourceItem[]) => {
      for (const i of batch) stored.set(i.id, i);
    });
    const done = new Set<string>();
    const enabled = new Set<SourceKind>(["youtube"]);
    const run = async (batch: SourceItem[]) => {
      const { items } = await applySourcePolicy(mergeWithStored(batch, stored, enabled), {
        now: NOW,
        max: 25,
        store,
        done,
        ledger: {},
      });
      for (const i of items) done.add(i.id);
      return items.map((i) => i.id);
    };
    const first = await run(youtube(60));
    const second = await run([]);
    const third = await run([]);
    expect(first).toHaveLength(25);
    expect(second).toHaveLength(25);
    expect(third).toHaveLength(10);
    expect(new Set([...first, ...second, ...third]).size).toBe(60);
  });
});

describe("acquire outage tally", () => {
  const setup = () => {
    const ref = { current: {} as AttemptLedger };
    const tallies = new Map<SourceKind, AcquireTally>();
    const hooks = acquireHooksFor(ref, () => NOW, undefined, tallies);
    return { ref, tallies, hooks };
  };

  it("treats a source where every acquire failed as down: its failures are not kept in the ledger", () => {
    const { ref, tallies, hooks } = setup();
    const before = ref.current;
    for (let n = 0; n < OUTAGE_MIN_FAILURES; n++)
      hooks.onFailure?.(item(`youtube_${n}`, "youtube"), new Error("yt-dlp: not found"));
    const outages = settleAcquire(tallies, ref, before);
    expect(outages).toEqual([{ source: "youtube", error: "yt-dlp: not found" }]);
    expect(ref.current).toEqual({});
  });

  it("keeps item failures when something else from that source worked", () => {
    const { ref, tallies, hooks } = setup();
    const before = ref.current;
    hooks.onSuccess?.(item("youtube_ok", "youtube"));
    for (let n = 0; n < OUTAGE_MIN_FAILURES; n++) hooks.onFailure?.(item(`youtube_${n}`, "youtube"), new Error("bad"));
    expect(settleAcquire(tallies, ref, before)).toEqual([]);
    expect(Object.keys(ref.current)).toHaveLength(OUTAGE_MIN_FAILURES);
  });

  it("does not call a couple of failures an outage, so a genuinely broken item still quarantines", () => {
    const { ref, tallies, hooks } = setup();
    const before = ref.current;
    hooks.onFailure?.(item("youtube_0", "youtube"), new Error("bad"));
    expect(settleAcquire(tallies, ref, before)).toEqual([]);
    expect(ref.current.youtube_0.attempts).toBe(1);
  });

  it("restores a prior record for an id that failed again during an outage", () => {
    const { ref, tallies, hooks } = setup();
    ref.current = recordFailure({}, "youtube_0", new Error("old"), NOW);
    const before = ref.current;
    for (let n = 0; n < OUTAGE_MIN_FAILURES; n++)
      hooks.onFailure?.(item(`youtube_${n}`, "youtube"), new Error("outage"));
    settleAcquire(tallies, ref, before);
    expect(ref.current).toEqual(before);
  });
});

describe("previewSources", () => {
  const fakeCollector = (source: SourceKind, items: SourceItem[]) => {
    const collect = vi.fn(async () => items);
    const acquire = vi.fn(async () => null);
    return { collector: { source, collect, acquire } as SourceCollector, collect, acquire };
  };

  it("counts listed, pending and would-select without storing anything", async () => {
    const yt = fakeCollector("youtube", youtube(40));
    const result = await previewSources([yt.collector], {
      done: new Set(youtube(5).map((i) => i.id)),
      ledger: {},
      now: NOW,
      max: 25,
    });
    expect(result).toEqual({ youtube: { listed: 40, pending: 35, wouldSelect: 25 } });
    expect(yt.acquire).not.toHaveBeenCalled();
  });

  it("never calls the instagram collector, which runs scrapers", async () => {
    const ig = fakeCollector("instagram", instagram(3));
    const result = await previewSources([ig.collector], { done: new Set(), ledger: {}, now: NOW, max: 25 });
    expect(ig.collect).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});

describe("parseSince", () => {
  it("parses a date, and returns undefined for nothing or for garbage", () => {
    expect(parseSince("2026-01-01")?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(parseSince(undefined)).toBeUndefined();
    expect(parseSince("last tuesday")).toBeUndefined();
  });
});

describe("finishSourceRun", () => {
  it("records each outcome and lists sources that have been failing for over 24 hours", () => {
    const earlier = finishSourceRun(new Map([["youtube", { ok: false as const, error: "blocked" }]]), {
      health: {},
      now: new Date(NOW.getTime() - 25 * 3_600_000),
    });
    expect(earlier.failing).toEqual([]);
    const later = finishSourceRun(new Map([["youtube", { ok: false as const, error: "blocked" }]]), {
      health: earlier.health,
      now: NOW,
    });
    expect(later.failing).toEqual(["youtube"]);
    expect(later.health.youtube.last_error).toBe("blocked");
  });

  it("does nothing when no non-instagram source ran", () => {
    const result = finishSourceRun(new Map(), { health: {}, now: NOW });
    expect(result).toEqual({ health: {}, failing: [] });
  });
});
