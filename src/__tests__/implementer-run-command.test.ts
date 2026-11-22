// src/__tests__/implementer-run-command.test.ts
//
// The implementer runs setup commands taken from videos. On 2026-11-20 one of them was an
// interactive `opencode auth login`: the 30 s timeout killed `sh`, but the login it started
// kept the output pipes open, and the whole pipeline waited on it for 36 hours.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { runCommand } from "../agents/implementer.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "impl-run-"));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const alive = (marker: string): boolean => {
  try {
    execFileSync("pgrep", ["-f", marker]);
    return true;
  } catch {
    return false;
  }
};

describe("runCommand", () => {
  it("returns at the timeout even when the command left a child holding its output, and kills that child", async () => {
    // A unique duration is the marker: portable across sh flavours, unlike `exec -a`.
    const marker = `sleep 59.${process.pid}${Date.now() % 100000}`;
    const started = Date.now();
    const r = await runCommand(`${marker} & echo started; wait`, dir, 1500);
    const took = Date.now() - started;
    expect(took).toBeLessThan(6000);
    expect(r.timed_out).toBe(true);
    expect(r.exit_code).not.toBe(0);
    await new Promise((res) => setTimeout(res, 300));
    expect(alive(marker)).toBe(false);
  }, 15_000);

  it("gives the command no input, so a login prompt ends at once instead of waiting", async () => {
    const started = Date.now();
    const r = await runCommand("read answer && echo got:$answer", dir, 5000);
    expect(Date.now() - started).toBeLessThan(2500);
    expect(r.timed_out).toBe(false);
    expect(r.exit_code).not.toBe(0);
  }, 15_000);

  it("still returns output and exit code for an ordinary command", async () => {
    const r = await runCommand("echo hello && exit 3", dir, 5000);
    expect(r).toMatchObject({ exit_code: 3, timed_out: false });
    expect(r.stdout.trim()).toBe("hello");
  });

  it("still refuses a dangerous command without running it", async () => {
    const r = await runCommand("sudo true", dir, 5000);
    expect(r.stderr).toBe("Command blocked for safety");
  });
});
