/** Test the analyzer on an entry that's known to drop items. */
import "dotenv/config";
import { NeuroLink } from "@juspay/neurolink";
import fs from "node:fs";
import { z } from "zod";

// Inlined schema (matches src/schemas/analysis.ts)
const ActionableItemSchema = z.object({
  type: z.string(),
  name: z.string(),
  description: z.string(),
  install_command: z.string(),
  code: z.string(),
  url: z.string(),
  verification_steps: z.array(z.string()),
});
const AnalysisSchema = z.object({
  actionable_items: z.array(ActionableItemSchema),
  implementability_score: z.number(),
  usefulness_prediction: z.string(),
});

const ANALYSIS_PROMPT = `You are an expert technology analyst. Given a knowledge-base entry about a video, extract ALL actionable items that a developer could implement, install, or try.

For each actionable item, determine:
- type: "tool_install" | "code_snippet" | "api_setup" | "workflow" | "technique"
- name: what to implement
- description: clear step-by-step instructions for implementation
- install_command: shell command if applicable (npm install X, pip install X, brew install X), otherwise empty string
- code: any code to write/run, otherwise empty string
- url: URL to find it, otherwise empty string
- verification_steps: how to verify it works (list of steps)

Also rate:
- implementability_score: 0-10 (10 = can be implemented right now with a command)
- usefulness_prediction: "highly_useful" | "useful" | "somewhat_useful" | "not_useful"

Be thorough. Extract every tool, library, technique, and workflow mentioned.
Return ONLY valid JSON matching the schema provided. No markdown fences.`;

const STRONGER_PROMPT = `You are an expert technology analyst. Extract ALL actionable items from this video knowledge-base entry.

**Important rules:**
- Look at ALL fields: transcript, visual_description, key_takeaways, topics, links_and_resources. Tools and techniques are often described in visual_description even if the transcript is short.
- A "tool" mentioned by name (e.g. "Lordicon.com", "Figma", "Notion") IS an actionable item — extract it even if the transcript doesn't explicitly say "install X".
- A "technique" or "workflow" described in steps IS an actionable item — extract it even if there's no install command.
- A "GitHub repository" or "website" mentioned IS an actionable item — extract it as type:"tool_install" with url filled in.
- If the entry has zero technology/tools/techniques (purely entertainment, lifestyle, news), then return [] — that's valid. But DO NOT return [] if there are tools mentioned.

For each actionable item, determine:
- type: "tool_install" | "code_snippet" | "api_setup" | "workflow" | "technique"
- name: what to implement (e.g. tool name)
- description: clear step-by-step instructions
- install_command: shell command if applicable, otherwise ""
- code: any code, otherwise ""
- url: URL, otherwise ""
- verification_steps: how to verify it works

Also rate:
- implementability_score: 0-10 (10 = can be implemented right now)
- usefulness_prediction: "highly_useful" | "useful" | "somewhat_useful" | "not_useful"

Return ONLY valid JSON matching the schema provided. No markdown fences.`;

function buildContextPrompt(prompt: string, entry: any): string {
  const parts: string[] = [prompt, "\n\n--- VIDEO KNOWLEDGE BASE ENTRY ---\n"];
  parts.push(`Category: ${entry.category}`);
  if (entry.transcript) parts.push(`\nTranscript:\n${entry.transcript}`);
  if (entry.visual_description) parts.push(`\nVisual Description:\n${entry.visual_description}`);
  if (entry.key_takeaways?.length) parts.push(`\nKey Takeaways:\n${entry.key_takeaways.map((t: string) => `- ${t}`).join("\n")}`);
  if (entry.topics?.length) parts.push(`\nTopics: ${entry.topics.join(", ")}`);
  if (entry.links_and_resources?.length) {
    parts.push(`\nLinks & Resources:`);
    for (const link of entry.links_and_resources) {
      parts.push(`  - ${link.url ?? "N/A"}: ${link.description ?? ""}`);
    }
  }
  return parts.join("\n");
}

async function test(label: string, model: string, prompt: string, entry: any) {
  const neurolink = new NeuroLink();
  const text = buildContextPrompt(prompt, entry);
  const t0 = Date.now();
  try {
    const r = await neurolink.generate({
      input: { text },
      provider: "vertex",
      model,
      schema: AnalysisSchema as unknown as z.ZodTypeAny,
      output: { format: "json" },
      disableTools: true,
      maxTokens: 8192,
      timeout: "120s",
    } as any);
    const parsed = AnalysisSchema.parse(JSON.parse(r.content));
    console.log(`${label} [${model}] OK in ${Date.now() - t0}ms`);
    console.log(`  items=${parsed.actionable_items.length} score=${parsed.implementability_score} useful=${parsed.usefulness_prediction}`);
    for (const it of parsed.actionable_items.slice(0, 3)) {
      console.log(`    - ${it.type}: ${it.name}`);
    }
  } catch (e: any) {
    console.log(`${label} [${model}] FAIL in ${Date.now() - t0}ms: ${(e?.message ?? String(e)).slice(0, 250)}`);
  }
}

async function main() {
  const kb = JSON.parse(fs.readFileSync("videos/knowledge_base.json", "utf8"));
  const targets = [
    "testuser_3430224396189972753.mp4",
    "testuser_3833726773334538656.mp4",
    "testuser_3359152903431917331.mp4",
  ];

  for (const file of targets) {
    const entry = kb[file];
    console.log("\n=== " + file + " (" + entry.category + ") ===");
    await test("current prompt", "gemini-3.1-flash-image-preview", ANALYSIS_PROMPT, entry);
    await test("stronger prompt", "gemini-3.1-flash-image-preview", STRONGER_PROMPT, entry);
    await test("2.5-flash + stronger", "gemini-2.5-flash", STRONGER_PROMPT, entry);
  }
}
main().catch(console.error);
