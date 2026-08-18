// src/__tests__/refresh.test.ts
import { describe, expect, it } from "vitest";
import { makeRefreshGate } from "../pipeline/refresh.js";

const NOW = new Date("2026-08-19T12:00:00.000Z");
const DAY = 86_400_000;

/** An entry last touched `days` ago. */
const aged = (days: number) => ({ checked_at: new Date(NOW.getTime() - days * DAY).toISOString() });

const gate = (over: Partial<{ ttlDays: number; maxPerRun: number }> = {}) =>
  makeRefreshGate({ ttlDays: 30, maxPerRun: 2, now: NOW, ...over });

describe("makeRefreshGate — work that is not a refresh", () => {
  it("processes an entry that does not exist yet", () => {
    expect(gate().decide(undefined, "checked_at")).toEqual({ reprocess: true, reason: "absent" });
  });

  it("retries an entry that previously errored, preserving today's behaviour", () => {
    const g = gate();
    expect(g.decide({ ...aged(1), error: "boom" }, "checked_at")).toEqual({ reprocess: true, reason: "error" });
  });

  it("never spends refresh budget on new or errored entries", () => {
    // Otherwise a big intake of new videos would starve the staleness backlog,
    // and a run full of errors would silently stop refreshing anything.
    const g = gate({ maxPerRun: 1 });
    for (let i = 0; i < 5; i++) g.decide(undefined, "checked_at");
    for (let i = 0; i < 5; i++) g.decide({ ...aged(99), error: "boom" }, "checked_at");
    expect(g.refreshedCount()).toBe(0);
    expect(g.decide(aged(99), "checked_at")).toEqual({ reprocess: true, reason: "stale" });
  });
});

describe("makeRefreshGate — staleness", () => {
  it("leaves an entry inside the TTL alone", () => {
    expect(gate().decide(aged(29), "checked_at")).toEqual({ reprocess: false, reason: "fresh" });
  });

  it("treats the TTL boundary itself as still fresh", () => {
    expect(gate().decide(aged(30), "checked_at")).toEqual({ reprocess: false, reason: "fresh" });
  });

  it("refreshes an entry past the TTL", () => {
    expect(gate().decide(aged(31), "checked_at")).toEqual({ reprocess: true, reason: "stale" });
  });

  it("refreshes an entry whose timestamp is missing, since its age is unknowable", () => {
    expect(gate().decide({}, "checked_at")).toEqual({ reprocess: true, reason: "stale" });
  });

  it("refreshes an entry whose timestamp cannot be parsed", () => {
    expect(gate().decide({ checked_at: "not-a-date" }, "checked_at")).toEqual({ reprocess: true, reason: "stale" });
  });

  it("reads whichever timestamp field the caller names", () => {
    const g = gate();
    expect(g.decide({ verified_at: aged(31).checked_at }, "verified_at").reason).toBe("stale");
  });
});

describe("makeRefreshGate — per-run budget", () => {
  it("stops refreshing once the cap is reached and says why", () => {
    const g = gate({ maxPerRun: 2 });
    expect(g.decide(aged(99), "checked_at").reason).toBe("stale");
    expect(g.decide(aged(99), "checked_at").reason).toBe("stale");
    expect(g.decide(aged(99), "checked_at")).toEqual({ reprocess: false, reason: "budget" });
    expect(g.refreshedCount()).toBe(2);
  });

  it("still processes brand-new entries after the refresh budget is spent", () => {
    const g = gate({ maxPerRun: 1 });
    g.decide(aged(99), "checked_at");
    expect(g.decide(aged(99), "checked_at").reason).toBe("budget");
    expect(g.decide(undefined, "checked_at")).toEqual({ reprocess: true, reason: "absent" });
  });

  it("disables refreshing entirely when the cap is zero", () => {
    const g = gate({ maxPerRun: 0 });
    expect(g.decide(aged(999), "checked_at")).toEqual({ reprocess: false, reason: "budget" });
    expect(g.decide(undefined, "checked_at").reprocess).toBe(true);
  });

  it("never refreshes when the TTL is zero-or-negative days only if entries are older", () => {
    // ttlDays=0 means "everything with any age is stale" — used to force a sweep.
    const g = makeRefreshGate({ ttlDays: 0, maxPerRun: 10, now: NOW });
    expect(g.decide(aged(1), "checked_at").reason).toBe("stale");
  });
});
