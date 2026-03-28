import { describe, it, expect } from "vitest";
import { ActionableItemSchema, AnalysisSchema } from "../schemas/analysis.js";

describe("ActionableItemSchema", () => {
  const validItem = {
    type: "tool_install",
    name: "prettier",
    description: "Install and configure Prettier for code formatting.",
    install_command: "npm install -D prettier",
    code: "",
    url: "https://prettier.io",
    verification_steps: ["Run npx prettier --check .", "Verify no errors"],
  };

  it("accepts a valid actionable item", () => {
    const result = ActionableItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it("rejects missing type", () => {
    const { type, ...rest } = validItem;
    const result = ActionableItemSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const { name, ...rest } = validItem;
    const result = ActionableItemSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing verification_steps", () => {
    const { verification_steps, ...rest } = validItem;
    const result = ActionableItemSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts empty strings for optional-like fields", () => {
    const result = ActionableItemSchema.safeParse({
      ...validItem,
      install_command: "",
      code: "",
      url: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("AnalysisSchema", () => {
  const validAnalysis = {
    actionable_items: [
      {
        type: "code_snippet",
        name: "debounce utility",
        description: "Create a debounce function for input handling.",
        install_command: "",
        code: "function debounce(fn, ms) { ... }",
        url: "",
        verification_steps: ["Test with rapid clicks"],
      },
    ],
    implementability_score: 8,
    usefulness_prediction: "highly_useful",
  };

  it("accepts valid analysis data", () => {
    const result = AnalysisSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionable_items).toHaveLength(1);
      expect(result.data.implementability_score).toBe(8);
    }
  });

  it("accepts empty actionable_items array", () => {
    const result = AnalysisSchema.safeParse({
      ...validAnalysis,
      actionable_items: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing implementability_score", () => {
    const { implementability_score, ...rest } = validAnalysis;
    const result = AnalysisSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects non-number implementability_score", () => {
    const result = AnalysisSchema.safeParse({
      ...validAnalysis,
      implementability_score: "high",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing usefulness_prediction", () => {
    const { usefulness_prediction, ...rest } = validAnalysis;
    const result = AnalysisSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing actionable_items", () => {
    const { actionable_items, ...rest } = validAnalysis;
    const result = AnalysisSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects completely empty object", () => {
    const result = AnalysisSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
