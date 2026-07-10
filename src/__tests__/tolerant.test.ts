import { describe, it, expect } from "vitest";
import { tolerantOutput } from "../schemas/tolerant.js";
import { ClassificationSchema } from "../schemas/classification.js";
import { AnalysisSchema } from "../schemas/analysis.js";
import { KnowledgeSchema } from "../schemas/knowledge.js";
import { VerificationReportSchema } from "../schemas/verification.js";
import { LinksSchema } from "../schemas/links.js";

describe("tolerantOutput", () => {
  it("coerces top-level null string → '' and keeps enums strict (classification)", () => {
    const T = tolerantOutput(ClassificationSchema);
    const ok = T.safeParse({
      category: "Other",
      subcategory: null,
      tags: null,
      description: null,
      language: null,
      mood: null,
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect((ok.data as { subcategory: string }).subcategory).toBe("");
      expect((ok.data as { tags: string[] }).tags).toEqual([]);
    }
    // enum still strict
    expect(tolerantOutput(ClassificationSchema).safeParse({ category: "Nope" }).success).toBe(false);
  });

  it("coerces a null number → 0 (analysis implementability_score)", () => {
    const T = tolerantOutput(AnalysisSchema);
    const r = T.safeParse({ actionable_items: null, implementability_score: null, usefulness_prediction: null });
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as { implementability_score: number }).implementability_score).toBe(0);
  });

  it("recurses into arrays of objects (knowledge links_and_resources with null fields)", () => {
    const T = tolerantOutput(KnowledgeSchema);
    const r = T.safeParse({
      transcript: null,
      visual_description: null,
      key_takeaways: null,
      topics: null,
      links_and_resources: [{ url: null, description: null, timestamp: null }],
    });
    expect(r.success).toBe(true);
  });

  it("tolerates null nested strings in verification item_results", () => {
    const T = tolerantOutput(VerificationReportSchema);
    const r = T.safeParse({
      overall_score: null,
      summary: null,
      confidence: null,
      item_results: [
        { item_name: null, research_summary: null, implementation_result: null, is_url_live: null, notes: null },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("keeps a genuine nested enum strict (links type)", () => {
    const T = tolerantOutput(LinksSchema);
    const bad = T.safeParse({
      links: [{ name: "x", url: null, type: "not_an_enum", description: "d", timestamp: "t" }],
    });
    expect(bad.success).toBe(false);
    const good = T.safeParse({
      links: [{ name: null, url: null, type: "shown_on_screen", description: null, timestamp: null }],
    });
    expect(good.success).toBe(true);
  });

  it("coerces an OBJECT where a string is expected → JSON string (the real Gemini flake)", () => {
    const T = tolerantOutput(KnowledgeSchema);
    const r = T.safeParse({
      transcript: { weird: "object" },
      visual_description: "ok",
      key_takeaways: [],
      topics: [{ x: 1 }, "b"],
      links_and_resources: [],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const d = r.data as { transcript: string; topics: string[] };
      expect(d.transcript).toContain("weird"); // object → JSON string
      expect(typeof d.topics[0]).toBe("string"); // object element in a string[] coerced
    }
  });

  it("a completely broken top-level value yields defaults instead of throwing", () => {
    const T = tolerantOutput(KnowledgeSchema);
    for (const broken of [null, "not-json", 42, []]) {
      const r = T.safeParse(broken);
      expect(r.success).toBe(true);
      if (r.success) expect((r.data as { transcript: string }).transcript).toBe("");
    }
  });
});
