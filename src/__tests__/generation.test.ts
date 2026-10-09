// src/__tests__/generation.test.ts
import { describe, expect, it } from "vitest";
import { assertNotTruncated } from "../utils/generation.js";

describe("assertNotTruncated", () => {
  it("returns the response unchanged when the turn completed", () => {
    const response = { content: "ok", finishReason: "stop", stopReason: "completed" };
    expect(assertNotTruncated(response, "probe")).toBe(response);
  });

  it("accepts a response that carries no stop metadata", () => {
    const response = { content: "ok" };
    expect(assertNotTruncated(response, "probe")).toBe(response);
  });

  it("throws when the model hit maxTokens", () => {
    expect(() => assertNotTruncated({ finishReason: "length" }, "classifier")).toThrow(
      /classifier: response truncated by maxTokens/,
    );
  });

  it("throws when the JSON was cut off even though finishReason looks clean", () => {
    expect(() => assertNotTruncated({ finishReason: "stop", jsonTruncated: true }, "digest")).toThrow(/digest/);
  });

  it.each(["time-limit", "step-cap", "context-cap", "stalled", "aborted", "provider-error"])(
    "throws when Neurolink stopped the turn early (%s)",
    (stopReason) => {
      expect(() => assertNotTruncated({ finishReason: "stop", stopReason }, "researcher")).toThrow(
        new RegExp(`researcher: turn did not complete \\(stopReason=${stopReason}\\)`),
      );
    },
  );
});
