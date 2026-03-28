import { describe, it, expect } from "vitest";
import { ClassificationSchema } from "../schemas/classification.js";

describe("ClassificationSchema", () => {
  const validData = {
    category: "Tech & Coding",
    subcategory: "Web Development",
    tags: ["react", "typescript", "frontend", "nextjs", "web"],
    description: "A tutorial on building React components with TypeScript.",
    language: "English",
    mood: "educational",
  };

  it("accepts valid classification data", () => {
    const result = ClassificationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("Tech & Coding");
      expect(result.data.tags).toHaveLength(5);
    }
  });

  it("rejects missing category", () => {
    const { category, ...rest } = validData;
    const result = ClassificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing subcategory", () => {
    const { subcategory, ...rest } = validData;
    const result = ClassificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing tags", () => {
    const { tags, ...rest } = validData;
    const result = ClassificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects tags that is not an array", () => {
    const result = ClassificationSchema.safeParse({ ...validData, tags: "not-array" });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const { description, ...rest } = validData;
    const result = ClassificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing language", () => {
    const { language, ...rest } = validData;
    const result = ClassificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing mood", () => {
    const { mood, ...rest } = validData;
    const result = ClassificationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts empty tags array", () => {
    const result = ClassificationSchema.safeParse({ ...validData, tags: [] });
    expect(result.success).toBe(true);
  });

  it("rejects completely empty object", () => {
    const result = ClassificationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string values for string fields", () => {
    const result = ClassificationSchema.safeParse({ ...validData, category: 123 });
    expect(result.success).toBe(false);
  });
});
