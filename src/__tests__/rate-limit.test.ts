import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AI_OUTAGE,
  AiUnavailableError,
  exponentialBackoff,
  isAiUnavailable,
  resetAiOutage,
  sleep,
} from "../utils/rate-limit.js";

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
    const fn = vi.fn().mockRejectedValueOnce(new Error("transient")).mockResolvedValue("ok");
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
    const fn = vi.fn().mockRejectedValueOnce(new Error("429 Too Many Requests")).mockResolvedValue("done");
    const result = await exponentialBackoff(fn, 3, 1);
    expect(result).toEqual({ success: true, value: "done" });
  });

  it("handles RESOURCE_EXHAUSTED errors", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("RESOURCE_EXHAUSTED")).mockResolvedValue("done");
    const result = await exponentialBackoff(fn, 3, 1);
    expect(result).toEqual({ success: true, value: "done" });
  });

  it("handles quota errors", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("Quota exceeded")).mockResolvedValue("done");
    const result = await exponentialBackoff(fn, 3, 1);
    expect(result).toEqual({ success: true, value: "done" });
  });

  it("caps each wait at maxDelayMs, for transient and rate-limit errors alike", async () => {
    const waits: number[] = [];
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: () => void, ms?: number) => {
      waits.push(ms ?? 0);
      cb();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    try {
      await exponentialBackoff(vi.fn().mockRejectedValue(new Error("refused")), 6, 20, 50);
      await exponentialBackoff(vi.fn().mockRejectedValue(new Error("429")), 6, 20, 50);
    } finally {
      spy.mockRestore();
    }
    expect(waits).toEqual([20, 40, 50, 50, 50, 20, 40, 50, 50, 50]);
  });

  describe("when Vertex AI refuses calls (VPN down)", () => {
    const saved = { ...AI_OUTAGE };
    const refusal = new Error("AuthenticationError: [vertex] Google Vertex AI Permission Denied.");
    beforeEach(() => {
      resetAiOutage();
      Object.assign(AI_OUTAGE, { pollMs: 1, waitMs: 60_000 });
    });
    afterEach(() => {
      resetAiOutage();
      Object.assign(AI_OUTAGE, saved);
    });

    it("waits for AI to come back without using up attempts", async () => {
      const fn = vi.fn();
      for (let i = 0; i < 6; i++) fn.mockRejectedValueOnce(refusal);
      fn.mockResolvedValue("ok");
      const result = await exponentialBackoff(fn, 2, 1);
      expect(result).toEqual({ success: true, value: "ok" });
      expect(fn).toHaveBeenCalledTimes(7);
    });

    it("gives up the run's AI work once the outage outlasts the wait, without failing the item", async () => {
      AI_OUTAGE.waitMs = 20;
      const fn = vi.fn().mockRejectedValue(new Error("Request is prohibited by organization's policy."));
      await expect(exponentialBackoff(fn, 8, 1)).rejects.toBeInstanceOf(AiUnavailableError);
      const later = vi.fn().mockResolvedValue("never asked");
      const err = await exponentialBackoff(later, 8, 1).catch((e: unknown) => e);
      expect(isAiUnavailable(err)).toBe(true);
      expect(later).not.toHaveBeenCalled();
    });

    it("still counts other errors as attempts", async () => {
      const fn = vi.fn().mockRejectedValueOnce(refusal).mockRejectedValue(new Error("timeout"));
      const result = await exponentialBackoff(fn, 2, 1);
      expect(result.success).toBe(false);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  it("returns failure when maxRetries is 1 and fn throws", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const result = await exponentialBackoff(fn, 1, 1);
    expect(result.success).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
