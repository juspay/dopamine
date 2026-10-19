// src/__tests__/compare-instagram-state.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compareInstagramState } from "../scripts/compare-instagram-state.js";

let before: string;
let after: string;

beforeEach(async () => {
  before = await fs.mkdtemp(path.join(os.tmpdir(), "ig-before-"));
  after = await fs.mkdtemp(path.join(os.tmpdir(), "ig-after-"));
});
afterEach(async () => {
  await fs.rm(before, { recursive: true, force: true });
  await fs.rm(after, { recursive: true, force: true });
});

const put = (dir: string, file: string, data: unknown) =>
  fs.writeFile(path.join(dir, file), JSON.stringify(data, null, 2), "utf8");

const seed = async (dir: string) => {
  await put(dir, "metadata.json", [
    { pk: "1", code: "c1" },
    { pk: "2", code: "c2" },
  ]);
  await put(dir, "classifications.json", { "a_1.mp4": { category: "Tech" }, "b_2.mp4": { category: "Food" } });
  await put(dir, "knowledge_base.json", { "a_1.mp4": { transcript: "hello" } });
  await put(dir, "links_v2.json", { "a_1.mp4": { links: [] } });
  await put(dir, "triage.json", { a_1: { tier: "skip" } });
};

describe("compareInstagramState", () => {
  it("passes when nothing changed, and counts the keys it checked", async () => {
    await seed(before);
    await seed(after);
    expect(await compareInstagramState(before, after)).toEqual({ checkedKeys: 7, changed: [], removed: [], ok: true });
  });

  it("lists a key whose value changed", async () => {
    await seed(before);
    await seed(after);
    await put(after, "classifications.json", { "a_1.mp4": { category: "Finance" }, "b_2.mp4": { category: "Food" } });
    const report = await compareInstagramState(before, after);
    expect(report.changed).toEqual(["classifications.json:a_1.mp4"]);
    expect(report.ok).toBe(false);
  });

  it("lists a key that was removed", async () => {
    await seed(before);
    await seed(after);
    await put(after, "triage.json", {});
    const report = await compareInstagramState(before, after);
    expect(report.removed).toEqual(["triage.json:a_1"]);
    expect(report.ok).toBe(false);
  });

  it("ignores a key that was added", async () => {
    await seed(before);
    await seed(after);
    await put(after, "knowledge_base.json", { "a_1.mp4": { transcript: "hello" }, youtube_abc: { transcript: "new" } });
    expect((await compareInstagramState(before, after)).ok).toBe(true);
  });

  it("compares metadata.json by pk, not by position", async () => {
    await seed(before);
    await seed(after);
    await put(after, "metadata.json", [
      { pk: "3", code: "new" },
      { pk: "2", code: "c2" },
      { pk: "1", code: "c1" },
    ]);
    expect((await compareInstagramState(before, after)).ok).toBe(true);
  });

  it("treats a different key order inside a value as a change, since the check is byte-for-byte", async () => {
    await put(before, "classifications.json", { a: { x: 1, y: 2 } });
    await put(after, "classifications.json", { a: { y: 2, x: 1 } });
    expect((await compareInstagramState(before, after)).changed).toEqual(["classifications.json:a"]);
  });

  it("skips a file that does not exist before, and reports a file that vanished", async () => {
    await put(before, "triage.json", { a_1: { tier: "skip" } });
    const report = await compareInstagramState(before, after);
    expect(report.checkedKeys).toBe(1);
    expect(report.removed).toEqual(["triage.json:a_1"]);
    expect(report.ok).toBe(false);
  });

  it("reports every key as removed when a file is unreadable afterwards", async () => {
    await put(before, "triage.json", { a_1: { tier: "skip" }, b_2: { tier: "skip" } });
    await fs.writeFile(path.join(after, "triage.json"), "{ not json", "utf8");
    expect((await compareInstagramState(before, after)).removed).toEqual(["triage.json:a_1", "triage.json:b_2"]);
  });
});
