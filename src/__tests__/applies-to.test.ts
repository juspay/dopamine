import { describe, expect, it } from "vitest";
import { appliesToFor } from "../dashboard/data-builder.js";

describe("appliesToFor", () => {
  const mappings = {
    a_1: [
      { project: "Dopamine", confidence: "high" as const, reason: "r" },
      { project: "Shooter", confidence: "medium" as const, reason: "r" },
      { project: "Kolu", confidence: "low" as const, reason: "r" },
      { project: "Dopamine", confidence: "medium" as const, reason: "dup" },
    ],
  };

  it("keeps medium+ confidence, drops low, and dedupes", () => {
    expect(appliesToFor(mappings, "a_1")).toEqual(["Dopamine", "Shooter"]);
  });

  it("returns [] for an unmapped video", () => {
    expect(appliesToFor(mappings, "missing")).toEqual([]);
  });
});
