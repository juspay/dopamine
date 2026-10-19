// src/__tests__/source-select.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type AttemptLedger, MAX_FAILURES, recordEmpty, recordFailure } from "../sources/attempts.js";
import { loadDoneIds, selectPending } from "../sources/select.js";
import type { SourceItem } from "../types/index.js";

const NOW = new Date("2026-10-18T00:00:00Z");

const item = (id: string, published_at: string | null = null): SourceItem => ({
  id,
  source: "youtube",
  content_type: "long_video",
  title: id,
  author: null,
  caption_text: null,
  url: null,
  thumbnail_url: null,
  published_at,
  duration_seconds: null,
});

const items = (n: number): SourceItem[] => Array.from({ length: n }, (_, i) => item(`youtube_${i}`));
const base = { done: new Set<string>(), ledger: {} as AttemptLedger, now: NOW, max: 25 };

describe("selectPending", () => {
  it("takes the first 25 in feed order and reports how many remain", () => {
    const { selected, remaining } = selectPending(items(60), base);
    expect(selected.map((i) => i.id)).toEqual(items(25).map((i) => i.id));
    expect(remaining).toBe(35);
  });

  it("selects everything when under the cap", () => {
    const { selected, remaining } = selectPending(items(3), base);
    expect(selected).toHaveLength(3);
    expect(remaining).toBe(0);
  });

  it("skips done ids, including one that is also quarantined", () => {
    let ledger: AttemptLedger = {};
    for (let n = 0; n < MAX_FAILURES; n++) ledger = recordFailure(ledger, "youtube_1", new Error("x"), NOW);
    const { selected } = selectPending(items(3), { ...base, done: new Set(["youtube_0", "youtube_1"]), ledger });
    expect(selected.map((i) => i.id)).toEqual(["youtube_2"]);
  });

  it("skips ids that are not yet eligible to be tried again", () => {
    const ledger = recordEmpty({}, "youtube_0", NOW);
    expect(selectPending(items(2), { ...base, ledger }).selected.map((i) => i.id)).toEqual(["youtube_1"]);
  });

  it("with since set, drops an older item but keeps one with no or an unreadable date", () => {
    const list = [
      item("old", "2020-01-01T00:00:00Z"),
      item("new", "2026-06-01T00:00:00Z"),
      item("none", null),
      item("odd", "not a date"),
    ];
    const { selected } = selectPending(list, { ...base, since: new Date("2026-01-01T00:00:00Z") });
    expect(selected.map((i) => i.id)).toEqual(["new", "none", "odd"]);
  });

  it("collapses duplicate ids, keeping the first position", () => {
    const list = [item("a"), item("b"), item("a")];
    expect(selectPending(list, base).selected.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("selects nothing when max is 0 and counts everything as remaining", () => {
    const { selected, remaining } = selectPending(items(4), { ...base, max: 0 });
    expect(selected).toEqual([]);
    expect(remaining).toBe(4);
  });
});

describe("loadDoneIds", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "select-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("holds ids whose knowledge-base entry has no error", async () => {
    const p = path.join(dir, "knowledge_base.json");
    await fs.writeFile(p, JSON.stringify({ ok: { category: "Tech" }, bad: { error: "boom" }, nothing: null }), "utf8");
    expect([...(await loadDoneIds(p))]).toEqual(["ok"]);
  });

  it("reads a missing, corrupt or non-object file as empty", async () => {
    const p = path.join(dir, "knowledge_base.json");
    expect((await loadDoneIds(p)).size).toBe(0);
    await fs.writeFile(p, "{ nope", "utf8");
    expect((await loadDoneIds(p)).size).toBe(0);
    await fs.writeFile(p, "[1]", "utf8");
    expect((await loadDoneIds(p)).size).toBe(0);
  });
});
