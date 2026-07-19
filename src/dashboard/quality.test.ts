import { describe, expect, it } from "vitest";
import { type QualityInput, qualityScore, tierOf } from "./quality.js";

const base: QualityInput = {
  verification: "unknown",
  usefulness: "",
  confidence: 0,
  implementability: 0,
  appliesTo: [],
  tags: [],
  likes: 0,
};

describe("qualityScore", () => {
  it("scores an empty/unprocessed learning near zero", () => {
    // The herdr case: not_verifiable, no usefulness, no tags, no mapping.
    const empty: QualityInput = { ...base, verification: "not_verifiable" };
    expect(qualityScore(empty)).toBeLessThan(5);
  });

  it("ranks a verified, highly-useful, project-mapped learning far above an empty one", () => {
    const rich: QualityInput = {
      verification: "verified_useful",
      usefulness: "highly_useful",
      confidence: 8,
      implementability: 9,
      appliesTo: ["Dopamine"],
      tags: ["seo", "webdev"],
      likes: 61115,
    };
    const empty: QualityInput = { ...base, verification: "not_verifiable" };
    expect(qualityScore(rich)).toBeGreaterThan(qualityScore(empty) + 50);
  });

  it("rewards applicability to a real project", () => {
    const mapped: QualityInput = { ...base, verification: "partially_verified", appliesTo: ["Dopamine"] };
    const unmapped: QualityInput = { ...base, verification: "partially_verified", appliesTo: [] };
    expect(qualityScore(mapped)).toBeGreaterThan(qualityScore(unmapped));
  });

  it("is deterministic and order-independent for the same input", () => {
    const v: QualityInput = { ...base, verification: "useful" as string, confidence: 5, tags: ["a"] };
    expect(qualityScore(v)).toBe(qualityScore({ ...v }));
  });

  it("never throws on malformed numeric fields", () => {
    const nan: QualityInput = { ...base, confidence: Number.NaN, implementability: Number.NaN, likes: -3 };
    expect(Number.isFinite(qualityScore(nan))).toBe(true);
  });

  it("caps the social-proof contribution so likes cannot dominate", () => {
    const viral: QualityInput = { ...base, likes: 10_000_000 };
    const modest: QualityInput = { ...base, likes: 100 };
    // Likes add at most ~2 points; a viral empty video must still rank as thin-ish.
    expect(qualityScore(viral) - qualityScore(modest)).toBeLessThan(3);
  });

  it("never scores below zero for fractional/zero/negative likes", () => {
    for (const likes of [0, 0.5, 1e-9, -3, Number.NaN]) {
      expect(qualityScore({ ...base, likes })).toBeGreaterThanOrEqual(0);
    }
    // A tiny fractional like count must not score below a zero-like baseline.
    expect(qualityScore({ ...base, likes: 1e-9 })).toBe(qualityScore({ ...base, likes: 0 }));
  });
});

describe("tierOf", () => {
  it("flags an empty not_verifiable learning as thin", () => {
    expect(tierOf({ ...base, verification: "not_verifiable" })).toBe("thin");
  });

  it("does NOT flag a not_verifiable-but-highly-useful conceptual learning as thin", () => {
    expect(
      tierOf({ ...base, verification: "not_verifiable", usefulness: "highly_useful", tags: ["mindset"] }),
    ).not.toBe("thin");
  });

  it("marks a project-mapped learning as featured", () => {
    expect(tierOf({ ...base, verification: "partially_verified", appliesTo: ["Shooter"] })).toBe("featured");
  });

  it("marks a verified + highly-useful learning as featured even without a project mapping", () => {
    expect(tierOf({ ...base, verification: "verified_useful", usefulness: "highly_useful" })).toBe("featured");
  });

  it("marks a normal partially-verified learning as standard", () => {
    expect(tierOf({ ...base, verification: "partially_verified", usefulness: "useful", tags: ["x"] })).toBe("standard");
  });

  it("does NOT mark a highly-implementable learning as thin just because confidence is 0", () => {
    // confidence (verifier) and implementability (analyzer) are independent —
    // a bare zero confidence must not demote actionable content to thin.
    const actionable: QualityInput = {
      ...base,
      verification: "partially_verified",
      usefulness: "unknown",
      confidence: 0,
      implementability: 8,
      likes: 1000,
    };
    expect(tierOf(actionable)).toBe("standard");
  });

  it("keeps tier and score consistent — a thin item never outscores a standard one", () => {
    const a: QualityInput = {
      ...base,
      verification: "partially_verified",
      usefulness: "unknown",
      confidence: 0,
      implementability: 8,
      likes: 1000,
    };
    const b: QualityInput = {
      ...base,
      verification: "partially_verified",
      usefulness: "unknown",
      confidence: 2,
      implementability: 0,
    };
    // a is strictly better-signalled; it must not be tiered below b.
    const rank = { featured: 0, standard: 1, thin: 2 } as const;
    expect(rank[tierOf(a)]).toBeLessThanOrEqual(rank[tierOf(b)]);
    expect(qualityScore(a)).toBeGreaterThan(qualityScore(b));
  });
});
