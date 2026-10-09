// src/__tests__/research-split.test.ts
import { describe, expect, it } from "vitest";
import { splitResearchByItem } from "../agents/researcher.js";

describe("splitResearchByItem", () => {
  it("splits gemini-3.x output where each item is a '### N. Name' heading with numbered sub-sections", () => {
    const text = [
      "Intro line",
      "### 1. Alpha",
      "#### 1. Status",
      "alpha is maintained",
      "#### 2. Alternatives",
      "alpha rivals",
      "### 2. Beta",
      "#### 1. Status",
      "beta is archived",
      "### 3. Gamma",
      "gamma notes",
    ].join("\n");
    const [alpha, beta, gamma] = splitResearchByItem(text, 3);
    expect(alpha).toContain("alpha is maintained");
    expect(alpha).toContain("alpha rivals");
    expect(alpha).not.toContain("beta is archived");
    expect(beta).toContain("beta is archived");
    expect(beta).not.toContain("gamma notes");
    expect(gamma).toContain("gamma notes");
  });

  it("still splits plain numbered lists", () => {
    const [a, b] = splitResearchByItem("1. Alpha\nalpha body\n2. Beta\nbeta body", 2);
    expect(a).toContain("alpha body");
    expect(a).not.toContain("beta body");
    expect(b).toContain("beta body");
  });

  it("still splits 'Item N:' sections", () => {
    const [a, b] = splitResearchByItem("Item 1: Alpha\nalpha body\nItem 2: Beta\nbeta body", 2);
    expect(a).toContain("alpha body");
    expect(a).not.toContain("beta body");
    expect(b).toContain("beta body");
  });

  it("returns empty sections for empty text", () => {
    expect(splitResearchByItem("", 2)).toEqual(["", ""]);
  });
});
