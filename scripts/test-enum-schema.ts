// Quick test: verify the enum-constrained schema works with Gemini.
import "dotenv/config";
import { NeuroLink } from "@juspay/neurolink";
import { z } from "zod";

const CATEGORIES = [
  "Tech & Coding", "AI & Machine Learning", "UI/UX Design",
  "Business & Marketing", "Education", "Finance",
  "Interior Design & Home", "Food & Cooking", "Travel & Lifestyle",
  "Fitness & Health", "Entertainment & Comedy", "Other",
] as const;

const Schema = z.object({
  category: z.enum(CATEGORIES),
  subcategory: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  language: z.string(),
  mood: z.string(),
});

async function main() {
  const nl = new NeuroLink();
  const prompt = `Classify this video.
Username: tech_creator
Caption: New AI agent framework just dropped! Build agents with Vercel.

CATEGORY RULES — pick exactly one:
${CATEGORIES.map(c => `  - ${c}`).join("\n")}

Return JSON only.`;

  try {
    const r = await nl.generate({
      input: { text: prompt },
      provider: "vertex",
      model: "gemini-3.1-flash-image-preview",
      schema: Schema as unknown as z.ZodTypeAny,
      output: { format: "json" },
      disableTools: true,
      maxTokens: 1024,
      timeout: "60s",
    } as any);
    const parsed = Schema.parse(JSON.parse(r.content));
    console.log("OK:", parsed);
  } catch (e: any) {
    console.log("FAIL:", e?.message ?? String(e));
  } finally {
    await nl.shutdown();
  }
}
main();
