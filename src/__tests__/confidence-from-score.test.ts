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
  it("splits on the observed quartiles, inclusive at each boundary", () => {
    expect(confidenceFromScore(CONFIDENCE_HIGH_Z)).toBe("high");
    expect(confidenceFromScore(3.2)).toBe("high");
    expect(confidenceFromScore(CONFIDENCE_MEDIUM_Z)).toBe("medium");
    expect(confidenceFromScore(CONFIDENCE_HIGH_Z - 0.01)).toBe("medium");
    expect(confidenceFromScore(CONFIDENCE_MEDIUM_Z - 0.01)).toBe("low");
    expect(confidenceFromScore(0)).toBe("low");
  });
});

describe("parseJudgement confidence source", () => {
  const verdicts = {
    results: [
      { project: "Weak", applies: true, confidence: "high", reason: "a real sounding reason" },
      { project: "Strong", applies: true, confidence: "high", reason: "another real reason" },
    ],
  };

  it("overrides the judge's confidence with the measured score", () => {
    // The judge called both "high"; only one has the evidence for it.
    const out = parseJudgement(verdicts, ["Weak", "Strong"], { Weak: 1.1, Strong: 2.4 });
    expect(out.find((m) => m.project === "Weak")?.confidence).toBe("low");
    expect(out.find((m) => m.project === "Strong")?.confidence).toBe("high");
  });

  it("keeps the judge's confidence when no score is supplied for that project", () => {
    const out = parseJudgement(verdicts, ["Weak", "Strong"], { Strong: 2.4 });
    expect(out.find((m) => m.project === "Weak")?.confidence).toBe("high");
    expect(out.find((m) => m.project === "Strong")?.confidence).toBe("high");
  });

  it("falls back entirely when scores are omitted", () => {
    expect(parseJudgement(verdicts, ["Weak", "Strong"]).every((m) => m.confidence === "high")).toBe(true);
  });
});

describe("prefilterScored", () => {
  const projects: ProjectVector[] = [
    { name: "A", vector: Float32Array.from([1, 0, 0]) },
    { name: "B", vector: Float32Array.from([0, 1, 0]) },
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
