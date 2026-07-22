import { describe, it, expect } from "vitest";
import { BriefLLMSchema } from "../schemas/brief.js";

describe("BriefLLMSchema", () => {
  it("accepts a well-formed brief", () => {
    const ok = BriefLLMSchema.safeParse({ actions: [{ title: "t", detail: "d", basedOn: ["v1"] }] });
    expect(ok.success).toBe(true);
  });
  it("rejects a missing actions array and wrong item shapes", () => {
    expect(BriefLLMSchema.safeParse({}).success).toBe(false);
    expect(BriefLLMSchema.safeParse({ actions: [{ title: "t" }] }).success).toBe(false);
    expect(BriefLLMSchema.safeParse({ actions: [{ title: 1, detail: "d", basedOn: [] }] }).success).toBe(false);
  });
});
