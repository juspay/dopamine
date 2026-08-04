import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_HIGH_Z,
  CONFIDENCE_MEDIUM_Z,
  confidenceFromScore,
  parseJudgement,
  prefilterScored,
  type ProjectVector,
} from "../agents/project-mapper.js";

describe("confidenceFromScore", () => {
  it("splits on the refitted cut points, inclusive at each boundary", () => {
    expect(confidenceFromScore(CONFIDENCE_HIGH_Z)).toBe("high");
    expect(confidenceFromScore(3.2)).toBe("high");
    expect(confidenceFromScore(CONFIDENCE_MEDIUM_Z)).toBe("medium");
    expect(confidenceFromScore(CONFIDENCE_HIGH_Z - 0.01)).toBe("medium");
    expect(confidenceFromScore(CONFIDENCE_MEDIUM_Z - 0.01)).toBe("low");
    expect(confidenceFromScore(0)).toBe("low");
  });

  it("keeps the buckets far enough apart to mean different things", () => {
    // The cut points were refitted to human agreement (17% / 36% / 86%). The
    // failure they guard against is a future edit that drifts them together
    // again: the previous high cut sat close enough to medium that the two
    // buckets scored 44% and 38%, so "high" carried almost no information.
    expect(CONFIDENCE_HIGH_Z).toBeGreaterThan(CONFIDENCE_MEDIUM_Z);
    expect(CONFIDENCE_HIGH_Z - CONFIDENCE_MEDIUM_Z).toBeGreaterThanOrEqual(1.0);
  });
});

describe("parseJudgement confidence source", () => {
  const verdicts = {
    results: [
      { project: "Weak", applies: true, reason: "a real sounding reason" },
      { project: "Strong", applies: true, reason: "another real reason" },
    ],
  };

  it("assigns confidence from the measured score", () => {
    const out = parseJudgement(verdicts, ["Weak", "Strong"], {
      Weak: CONFIDENCE_MEDIUM_Z - 0.15,
      Strong: CONFIDENCE_HIGH_Z + 0.5,
    });
    expect(out.find((m) => m.project === "Weak")?.confidence).toBe("low");
    expect(out.find((m) => m.project === "Strong")?.confidence).toBe("high");
  });

  it("records a scoreless match as low rather than promoting it", () => {
    // A candidate always carries a score, so a missing one is bookkeeping drift.
    // It must not become a chip or a brief action on the strength of an absence.
    const out = parseJudgement(verdicts, ["Weak", "Strong"], { Strong: CONFIDENCE_HIGH_Z + 0.5 });
    expect(out.find((m) => m.project === "Weak")?.confidence).toBe("low");
    expect(out.find((m) => m.project === "Strong")?.confidence).toBe("high");
  });

  it("ignores a confidence the judge volunteers", () => {
    // The field is no longer requested; a model that sends it anyway must not
    // be able to talk its way into a higher bucket than the evidence supports.
    const volunteered = {
      results: [{ project: "Weak", applies: true, confidence: "high", reason: "a real sounding reason" }],
    };
    expect(parseJudgement(volunteered, ["Weak"], { Weak: CONFIDENCE_MEDIUM_Z - 0.15 })[0].confidence).toBe("low");
  });
});

describe("prefilterScored", () => {
  const projects: ProjectVector[] = [
    { key: "A", project: "A", vector: Float32Array.from([1, 0, 0]) },
    { key: "B", project: "B", vector: Float32Array.from([0, 1, 0]) },
  ];

  it("returns the same names as prefilter, carrying the score that drives confidence", () => {
    const scored = prefilterScored([1, 0.2, 0], projects, 2, 0);
    expect(scored.map((s) => s.name)).toEqual(["A", "B"]);
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
  });

  it("applies the floor and topK exactly as the name-only form does", () => {
    expect(prefilterScored([1, 0.1, 0], projects, 4, 0.5).map((s) => s.name)).toEqual(["A"]);
    expect(prefilterScored([1, 1, 1], projects, 1, 0)).toHaveLength(1);
  });
});
