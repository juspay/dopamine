import { describe, expect, it } from "vitest";
import { cosineSim, rrfMerge } from "../search/rank.js";

describe("cosineSim", () => {
  it("is 1 for identical, 0 for orthogonal, 0 for zero vectors", () => {
    expect(cosineSim([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSim([0, 0], [1, 1])).toBe(0);
  });

  it("works across Float32Array and number[] inputs", () => {
    expect(cosineSim(Float32Array.from([1, 0]), [1, 0])).toBeCloseTo(1);
  });
});

describe("rrfMerge", () => {
  it("ranks an id present in both lists above single-list ids", () => {
    const merged = rrfMerge([
      ["a", "b"],
      ["b", "c"],
    ]);
    expect(merged[0].id).toBe("b");
  });

  it("preserves order within a single list and handles empties", () => {
    const merged = rrfMerge([["x", "y", "z"], []]);
    expect(merged.map((m) => m.id)).toEqual(["x", "y", "z"]);
    expect(rrfMerge([[], []])).toEqual([]);
  });
});
