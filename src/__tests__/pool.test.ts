import { describe, expect, it } from "vitest";
import { runPool } from "../utils/pool.js";

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("runPool", () => {
  it("runs every item and never more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await tick(5);
      done.push(n);
      running--;
    });
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBe(3);
  });

  it("stops starting items after a failure, waits for running ones, then throws the first error", async () => {
    const started: number[] = [];
    const finished: number[] = [];
    const run = runPool([1, 2, 3, 4, 5, 6], 2, async (n) => {
      started.push(n);
      if (n === 1) throw new Error("boom");
      await tick(10);
      finished.push(n);
    });
    await expect(run).rejects.toThrow("boom");
    // Item 2 was already running when 1 failed, so it finishes; nothing after it starts.
    expect(finished).toEqual([2]);
    expect(started).toEqual([1, 2]);
  });

  it("treats a limit below 1 as 1 and handles an empty list", async () => {
    let peak = 0;
    let running = 0;
    await runPool([1, 2, 3], 0, async () => {
      running++;
      peak = Math.max(peak, running);
      await tick(1);
      running--;
    });
    expect(peak).toBe(1);
    await expect(runPool([], 3, async () => {})).resolves.toBeUndefined();
  });
});
