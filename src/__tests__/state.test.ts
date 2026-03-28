import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadState, saveState } from "../pipeline/state.js";

describe("loadState()", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-state-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("loads and parses JSON from a file", async () => {
    const filePath = path.join(tmpDir, "data.json");
    await fs.writeFile(filePath, JSON.stringify({ count: 42, items: ["a", "b"] }));

    const result = await loadState(filePath, { count: 0, items: [] });
    expect(result).toEqual({ count: 42, items: ["a", "b"] });
  });

  it("returns default value when file does not exist", async () => {
    const result = await loadState(path.join(tmpDir, "missing.json"), { x: 10 });
    expect(result).toEqual({ x: 10 });
  });

  it("returns default value when file contains invalid JSON", async () => {
    const filePath = path.join(tmpDir, "bad.json");
    await fs.writeFile(filePath, "not-json{{");

    const result = await loadState(filePath, []);
    expect(result).toEqual([]);
  });

  it("loads arrays correctly", async () => {
    const filePath = path.join(tmpDir, "arr.json");
    await fs.writeFile(filePath, JSON.stringify([1, 2, 3]));

    const result = await loadState<number[]>(filePath, []);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("saveState()", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-state-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes JSON to a file with pretty printing", async () => {
    const filePath = path.join(tmpDir, "output.json");
    await saveState(filePath, { hello: "world" });

    const raw = await fs.readFile(filePath, "utf8");
    expect(JSON.parse(raw)).toEqual({ hello: "world" });
    // Check pretty-printed (2-space indent)
    expect(raw).toContain("  ");
  });

  it("creates parent directories if they do not exist", async () => {
    const filePath = path.join(tmpDir, "nested", "deep", "state.json");
    await saveState(filePath, [1, 2, 3]);

    const raw = await fs.readFile(filePath, "utf8");
    expect(JSON.parse(raw)).toEqual([1, 2, 3]);
  });

  it("overwrites existing file", async () => {
    const filePath = path.join(tmpDir, "overwrite.json");
    await saveState(filePath, { version: 1 });
    await saveState(filePath, { version: 2 });

    const raw = await fs.readFile(filePath, "utf8");
    expect(JSON.parse(raw)).toEqual({ version: 2 });
  });

  it("round-trips with loadState", async () => {
    const filePath = path.join(tmpDir, "roundtrip.json");
    const data = { name: "test", values: [10, 20, 30], nested: { ok: true } };
    await saveState(filePath, data);
    const loaded = await loadState(filePath, {});
    expect(loaded).toEqual(data);
  });
});
