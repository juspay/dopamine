import { describe, it, expect } from "vitest";
import { needsClassification, type ClassificationEntry } from "../agents/classifier.js";

const entry = (over: Partial<ClassificationEntry> = {}): ClassificationEntry =>
  ({
    category: "Tech & Coding",
    subcategory: "",
    tags: [],
    description: "",
    language: "",
    mood: "",
    pk: null,
    code: null,
    username: null,
    ...over,
  }) as ClassificationEntry;

describe("needsClassification (classifier resume predicate)", () => {
  it("absent entry → needs classifying (the orphan disk-file case)", () => {
    // An mp4 on disk with no classification entry — what the disk sweep must catch.
    expect(needsClassification(undefined)).toBe(true);
  });

  it("valid, error-free entry → already done (skip)", () => {
    expect(needsClassification(entry())).toBe(false);
  });

  it("previously errored entry → retry", () => {
    expect(needsClassification(entry({ error: "timeout" }))).toBe(true);
  });

  it("empty category → retry", () => {
    expect(needsClassification(entry({ category: "" as ClassificationEntry["category"] }))).toBe(true);
  });
});
