import { describe, it, expect } from "vitest";
import { computeRelated } from "./related.js";

describe("computeRelated", () => {
  it("ranks shared tags highest and excludes self", () => {
    const r = computeRelated([
      { id: "a", tags: ["x", "y"], topics: [], category: "C", username: "u", toolUrls: [], date: "2" },
      { id: "b", tags: ["x", "y"], topics: [], category: "C", username: "u", toolUrls: [], date: "1" },
      { id: "c", tags: ["z"], topics: [], category: "D", username: "v", toolUrls: [], date: "3" },
    ]);
    expect(r.get("a")).toEqual(["b"]); // c shares nothing -> excluded
    expect(r.get("a")).not.toContain("a");
  });
});
