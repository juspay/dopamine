import { describe, expect, it } from "vitest";
import {
  type Project,
  facetHash,
  loadProjects,
  portfolioHash,
  projectDoc,
  projectFacets,
  projectHash,
} from "../schemas/projects.js";

const valid: Project[] = [
  { name: "B", description: "second", keywords: ["y", "x"], facets: [] },
  { name: "A", description: "first", keywords: ["a"], facets: [], path: "/tmp/a" },
];

describe("loadProjects", () => {
  it("parses a valid file and defaults keywords", () => {
    const projects = loadProjects(() => JSON.stringify([{ name: "X", description: "d" }]));
    expect(projects).toEqual([{ name: "X", description: "d", keywords: [], facets: [] }]);
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
    expect(projectDoc({ name: "N", description: "D", keywords: ["k1", "k2"], facets: [] })).toBe(
      "N\nD\nKeywords: k1, k2",
    );
    expect(projectDoc({ name: "N", description: "D", keywords: [], facets: [] })).toBe("N\nD");
  });
});

describe("avoid", () => {
  // `avoid` names subject matter the project only ingests, so it has to reach
  // the judge without reaching the embedding — embedding it would pull the
  // vector toward the very content it exists to reject.
  const base: Project = { name: "N", description: "D", keywords: ["k"], facets: [] };
  const withAvoid: Project = { ...base, avoid: "videos about cooking" };

  it("stays out of the embedded doc", () => {
    expect(projectDoc(withAvoid)).toBe(projectDoc(base));
    expect(projectHash(withAvoid)).toBe(projectHash(base));
  });

  it("still invalidates cached verdicts via portfolioHash", () => {
    expect(portfolioHash([withAvoid])).not.toBe(portfolioHash([base]));
  });
});

describe("facets", () => {
  const p: Project = { name: "N", description: "D", keywords: ["k"], facets: ["voice intake", "browser control"] };

  it("yields the project doc plus one entry per facet, uniquely keyed", () => {
    const fs = projectFacets(p);
    expect(fs.map((f) => f.key)).toEqual(["N", "N#0", "N#1"]);
    expect(fs.every((f) => f.project === "N")).toBe(true);
    expect(fs[0].text).toBe(projectDoc(p));
    // Facets carry the project name so the vector stays in the project's
    // neighbourhood instead of floating free in topic space.
    expect(fs[1].text).toBe("N. voice intake");
  });

  it("keys the base doc so vectors cached before facets existed stay valid", () => {
    // The base facet's key is the bare project name and its hash is the doc
    // hash, so adding a facet re-embeds only the facet.
    const base = projectFacets(p)[0];
    expect(base.key).toBe(p.name);
    expect(facetHash(base)).toBe(projectHash(p));
  });

  it("leaves a project with no facets on exactly one vector", () => {
    expect(projectFacets({ name: "N", description: "D", keywords: [], facets: [] })).toHaveLength(1);
  });

  it("invalidates cached verdicts when a facet changes", () => {
    // Facets change which candidates reach the judge, so verdicts formed from
    // the old shortlist must not survive the edit.
    expect(portfolioHash([p])).not.toBe(portfolioHash([{ ...p, facets: ["voice intake"] }]));
    expect(portfolioHash([p])).not.toBe(portfolioHash([{ ...p, facets: [] }]));
  });

  it("does not pull facet text into the embedded project doc", () => {
    // projectDoc feeds the BASE vector; a facet is its own vector, and folding
    // its text in here would recreate the centroid the split exists to avoid.
    expect(projectDoc(p)).not.toContain("voice intake");
  });
});

describe("hashing", () => {
  it("projectHash changes only when the project's own doc changes", () => {
    const a = { name: "N", description: "D", keywords: ["k"], facets: [] };
    expect(projectHash(a)).toBe(projectHash({ ...a }));
    expect(projectHash(a)).not.toBe(projectHash({ ...a, description: "D2" }));
  });

  it("portfolioHash is order- and keyword-order-insensitive but content-sensitive", () => {
    const reordered: Project[] = [valid[1], valid[0]];
    expect(portfolioHash(valid)).toBe(portfolioHash(reordered));
    expect(portfolioHash(valid)).toBe(
      portfolioHash([
        { name: "A", description: "first", keywords: ["a"], facets: [], path: "/tmp/a" },
        { name: "B", description: "second", keywords: ["x", "y"], facets: [] },
      ]),
    );
    expect(portfolioHash(valid)).not.toBe(
      portfolioHash([...valid.slice(0, 1), { name: "B", description: "changed", keywords: ["y", "x"], facets: [] }]),
    );
  });

  it("portfolioHash ignores path (path affects delivery, not mapping)", () => {
    expect(portfolioHash(valid)).toBe(
      portfolioHash([
        { name: "B", description: "second", keywords: ["y", "x"], facets: [] },
        { name: "A", description: "first", keywords: ["a"], facets: [], path: "/different/path" },
      ]),
    );
  });
});
