import { describe, expect, it } from "vitest";
import { loadProjects, portfolioHash, projectDoc, projectHash, type Project } from "../schemas/projects.js";

const valid: Project[] = [
  { name: "B", description: "second", keywords: ["y", "x"] },
  { name: "A", description: "first", keywords: ["a"], path: "/tmp/a" },
];

describe("loadProjects", () => {
  it("parses a valid file and defaults keywords", () => {
    const projects = loadProjects(() => JSON.stringify([{ name: "X", description: "d" }]));
    expect(projects).toEqual([{ name: "X", description: "d", keywords: [] }]);
  });

  it("returns [] on missing file", () => {
    expect(
      loadProjects(() => {
        throw new Error("ENOENT");
      }),
    ).toEqual([]);
  });

  it("returns [] on invalid shape or bad JSON", () => {
    expect(loadProjects(() => "{not json")).toEqual([]);
    expect(loadProjects(() => JSON.stringify([{ name: "" }]))).toEqual([]);
  });
});

describe("projectDoc", () => {
  it("composes name, description, and keywords", () => {
    expect(projectDoc({ name: "N", description: "D", keywords: ["k1", "k2"] })).toBe("N\nD\nKeywords: k1, k2");
    expect(projectDoc({ name: "N", description: "D", keywords: [] })).toBe("N\nD");
  });
});

describe("hashing", () => {
  it("projectHash changes only when the project's own doc changes", () => {
    const a = { name: "N", description: "D", keywords: ["k"] };
    expect(projectHash(a)).toBe(projectHash({ ...a }));
    expect(projectHash(a)).not.toBe(projectHash({ ...a, description: "D2" }));
  });

  it("portfolioHash is order- and keyword-order-insensitive but content-sensitive", () => {
    const reordered: Project[] = [valid[1], valid[0]];
    expect(portfolioHash(valid)).toBe(portfolioHash(reordered));
    expect(portfolioHash(valid)).toBe(
      portfolioHash([
        { name: "A", description: "first", keywords: ["a"], path: "/tmp/a" },
        { name: "B", description: "second", keywords: ["x", "y"] },
      ]),
    );
    expect(portfolioHash(valid)).not.toBe(
      portfolioHash([...valid.slice(0, 1), { name: "B", description: "changed", keywords: ["y", "x"] }]),
    );
  });

  it("portfolioHash ignores path (path affects delivery, not mapping)", () => {
    expect(portfolioHash(valid)).toBe(
      portfolioHash([
        { name: "B", description: "second", keywords: ["y", "x"] },
        { name: "A", description: "first", keywords: ["a"], path: "/different/path" },
      ]),
    );
  });
});
