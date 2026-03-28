import { describe, it, expect, vi } from "vitest";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";

describe("sleep()", () => {
  it("resolves after the given delay", async () => {
    vi.useFakeTimers();
    const p = sleep(100);
    vi.advanceTimersByTime(100);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("resolves immediately for 0ms", async () => {
    vi.useFakeTimers();
    const p = sleep(0);
    vi.advanceTimersByTime(0);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe("exponentialBackoff()", () => {
  it("returns success on first try when fn succeeds", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await exponentialBackoff(fn, 3, 10);
    expect(result).toEqual({ success: true, value: 42 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns the value produced by fn", async () => {
    const fn = vi.fn().mockResolvedValue({ data: "hello" });
    const result = await exponentialBackoff(fn, 1, 10);
    expect(result).toEqual({ success: true, value: { data: "hello" } });
  });

  it("retries on failure and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("ok");
    const result = await exponentialBackoff(fn, 3, 1);
    expect(result).toEqual({ success: true, value: "ok" });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("returns failure after exhausting all retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    const result = await exponentialBackoff(fn, 2, 1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("always fails");
    }
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("handles rate-limit errors (429)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429 Too Many Requests"))
      .mockResolvedValue("done");
    const result = await exponentialBackoff(fn, 3, 1);
    expect(result).toEqual({ success: true, value: "done" });
  });

  it("handles RESOURCE_EXHAUSTED errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("RESOURCE_EXHAUSTED"))
      .mockResolvedValue("done");
    const result = await exponentialBackoff(fn, 3, 1);
    expect(result).toEqual({ success: true, value: "done" });
  });

  it("handles quota errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Quota exceeded"))
      .mockResolvedValue("done");
    const result = await exponentialBackoff(fn, 3, 1);
    expect(result).toEqual({ success: true, value: "done" });
  });

  it("returns failure when maxRetries is 1 and fn throws", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const result = await exponentialBackoff(fn, 1, 1);
    expect(result.success).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
