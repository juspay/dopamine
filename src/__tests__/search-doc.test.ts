import { describe, expect, it } from "vitest";
import { COMPOSED_DOC_MAX_CHARS, composeDoc, sha256Hex, type ComposedDocInput } from "../search/doc.js";

const base: ComposedDocInput = {
  title: "T",
  category: "Tech & Coding",
  tags: ["a", "b"],
  topics: ["topic1"],
  takeaways: ["do X", "do Y"],
  tools: [
    { name: "toolA", description: "descA" },
    { name: "toolB", description: "" },
  ],
  description: "desc",
  transcript: "spoken words",
};

describe("composeDoc", () => {
  it("orders fields with transcript last", () => {
    const doc = composeDoc(base);
    expect(doc.indexOf("T")).toBeLessThan(doc.indexOf("do X"));
    expect(doc.endsWith("spoken words")).toBe(true);
    expect(doc).toContain("toolA: descA");
    expect(doc).toContain("toolB");
  });

  it("skips empty parts without blank lines", () => {
    const doc = composeDoc({ ...base, tags: [], description: "" });
    expect(doc).not.toMatch(/\n\n/);
  });

  it("truncates to the budget, sacrificing transcript first", () => {
    const doc = composeDoc({ ...base, transcript: "x".repeat(10_000) });
    expect(doc.length).toBe(COMPOSED_DOC_MAX_CHARS);
    expect(doc).toContain("do X");
  });
});

describe("sha256Hex", () => {
  it("is stable and input-sensitive", () => {
    expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
    expect(sha256Hex("abc")).not.toBe(sha256Hex("abd"));
    expect(sha256Hex("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});
