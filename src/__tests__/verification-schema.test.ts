import { describe, it, expect } from "vitest";
import {
  ItemVerificationSchema,
  VerificationReportSchema,
} from "../schemas/verification.js";

describe("ItemVerificationSchema", () => {
  const validItem = {
    item_name: "prettier",
    research_summary: "Prettier is an opinionated code formatter.",
    implementation_result: "success",
    is_url_live: "yes",
    notes: "Works as documented.",
  };

  it("accepts valid item verification", () => {
    const result = ItemVerificationSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("rejects missing item_name", () => {
    const { item_name, ...rest } = validItem;
    const result = ItemVerificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing research_summary", () => {
    const { research_summary, ...rest } = validItem;
    const result = ItemVerificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing implementation_result", () => {
    const { implementation_result, ...rest } = validItem;
    const result = ItemVerificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing is_url_live", () => {
    const { is_url_live, ...rest } = validItem;
    const result = ItemVerificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing notes", () => {
    const { notes, ...rest } = validItem;
    const result = ItemVerificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("VerificationReportSchema", () => {
  const validReport = {
    overall_score: "verified_useful",
    summary: "All tools verified successfully. Recommended for implementation.",
    item_results: [
      {
        item_name: "prettier",
        research_summary: "Prettier is an opinionated code formatter.",
        implementation_result: "success",
        is_url_live: "yes",
        notes: "Works as documented.",
      },
    ],
    confidence: 9,
  };

  it("accepts valid verification report", () => {
    const result = VerificationReportSchema.safeParse(validReport);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.item_results).toHaveLength(1);
      expect(result.data.confidence).toBe(9);
    }
  });

  it("accepts empty item_results array", () => {
    const result = VerificationReportSchema.safeParse({
      ...validReport,
      item_results: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing overall_score", () => {
    const { overall_score, ...rest } = validReport;
    const result = VerificationReportSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing summary", () => {
    const { summary, ...rest } = validReport;
    const result = VerificationReportSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing confidence", () => {
    const { confidence, ...rest } = validReport;
    const result = VerificationReportSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects non-number confidence", () => {
    const result = VerificationReportSchema.safeParse({
      ...validReport,
      confidence: "high",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing item_results", () => {
    const { item_results, ...rest } = validReport;
    const result = VerificationReportSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid nested item in item_results", () => {
    const result = VerificationReportSchema.safeParse({
      ...validReport,
      item_results: [{ item_name: "only-name" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects completely empty object", () => {
    const result = VerificationReportSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
