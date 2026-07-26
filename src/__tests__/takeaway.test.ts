import { describe, expect, it } from "vitest";
import { KnowledgeSchema, takeawayText, takeawayTitleText } from "../schemas/knowledge.js";

describe("takeawayText", () => {
  it("prefixes the timestamp when present", () => {
    expect(takeawayText({ timestamp: "0:05", takeaway: "Use X" })).toBe("[0:05] Use X");
  });
  it("omits the prefix when timestamp is empty", () => {
    expect(takeawayText({ timestamp: "", takeaway: "Use X" })).toBe("Use X");
  });
  it("passes a legacy string through unchanged (backward-compat)", () => {
    expect(takeawayText("Use X")).toBe("Use X");
  });
  it("tolerates null / undefined / partial objects", () => {
    expect(takeawayText(undefined)).toBe("");
    expect(takeawayText(null)).toBe("");
    expect(takeawayText({})).toBe("");
  });
});

describe("takeawayTitleText", () => {
  it("never includes the timestamp prefix", () => {
    expect(takeawayTitleText({ timestamp: "0:05", takeaway: "Use X" })).toBe("Use X");
  });
  it("is empty when the takeaway text is empty, even with a timestamp (regression: title leaked '[0:00] ')", () => {
    expect(takeawayTitleText({ timestamp: "0:00", takeaway: "" })).toBe("");
  });
  it("passes a legacy string through unchanged (backward-compat)", () => {
    expect(takeawayTitleText("Use X")).toBe("Use X");
  });
  it("tolerates null / undefined / partial objects", () => {
    expect(takeawayTitleText(undefined)).toBe("");
    expect(takeawayTitleText(null)).toBe("");
    expect(takeawayTitleText({})).toBe("");
  });
});

describe("KnowledgeSchema.key_takeaways", () => {
  it("accepts structured {timestamp, takeaway} objects natively", () => {
    const r = KnowledgeSchema.safeParse({
      transcript: "t",
      visual_description: "v",
      links_and_resources: [],
      topics: [],
      key_takeaways: [{ timestamp: "0:01", takeaway: "a" }],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.key_takeaways[0]).toEqual({ timestamp: "0:01", takeaway: "a" });
  });
});
