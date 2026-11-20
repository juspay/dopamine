// src/__tests__/lock-script.test.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const LOCK_SH = path.resolve("scripts/lock.sh");
let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "lock-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const run = (script: string) => execa("bash", ["-c", `. "${LOCK_SH}"; ${script}`], { reject: false });

describe("scripts/lock.sh", () => {
  it("releases every lock a shell took when it exits, not only the last one", async () => {
    const a = path.join(dir, "a");
    const b = path.join(dir, "b");
    const r = await run(`acquire_lock "${a}" && acquire_lock "${b}" && [ -d "${a}" ] && [ -d "${b}" ] && echo held`);
    expect(r.stdout).toContain("held");
    expect(fs.existsSync(a)).toBe(false);
    expect(fs.existsSync(b)).toBe(false);
  });

  it("still releases a single lock on exit", async () => {
    const a = path.join(dir, "a");
    await run(`acquire_lock "${a}"`);
    expect(fs.existsSync(a)).toBe(false);
  });

  it("refuses a lock held by a live process and leaves it in place", async () => {
    const a = path.join(dir, "a");
    fs.mkdirSync(a);
    fs.writeFileSync(path.join(a, "pid"), String(process.pid));
    const r = await run(`acquire_lock "${a}" && echo got || echo busy`);
    expect(r.stdout).toContain("busy");
    expect(fs.existsSync(a)).toBe(true);
  });

  it("reclaims a lock whose owner is gone", async () => {
    const a = path.join(dir, "a");
    fs.mkdirSync(a);
    fs.writeFileSync(path.join(a, "pid"), "999999");
    const r = await run(`acquire_lock "${a}" && echo got || echo busy`);
    expect(r.stdout).toContain("got");
  });
});
