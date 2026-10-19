// src/__tests__/state-atomic.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeJsonAtomic } from "../pipeline/state.js";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "state-atomic-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("writeJsonAtomic", () => {
  it("writes parseable JSON and leaves no temp file behind", async () => {
    const p = path.join(dir, "a.json");
    await writeJsonAtomic(p, { a: 1 });
    expect(JSON.parse(await fs.readFile(p, "utf8"))).toEqual({ a: 1 });
    expect(await fs.readdir(dir)).toEqual(["a.json"]);
  });

  it("creates missing parent directories", async () => {
    const p = path.join(dir, "nested", "deeper", "b.json");
    await writeJsonAtomic(p, [1, 2, 3]);
    expect(JSON.parse(await fs.readFile(p, "utf8"))).toEqual([1, 2, 3]);
  });

  it("20 concurrent writes leave a parseable file holding one of the written values", async () => {
    const p = path.join(dir, "c.json");
    const values = Array.from({ length: 20 }, (_, i) => ({ n: i, pad: "x".repeat(1000) }));
    await Promise.all(values.map((v) => writeJsonAtomic(p, v)));
    const result = JSON.parse(await fs.readFile(p, "utf8")) as { n: number };
    expect(values.map((v) => v.n)).toContain(result.n);
    expect(await fs.readdir(dir)).toEqual(["c.json"]);
  });
});
