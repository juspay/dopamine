import { z } from "zod";

// visual_description is flattened to string — the original Python returned string|array,
// which is a union type that causes "Too many states" on Gemini.
// The LLM includes timestamps inline naturally (e.g., "[0:05] Slide shows...").
export const KnowledgeSchema = z.object({
  transcript: z.string().describe(
    "Full word-for-word transcript. Include speaker labels if multiple speakers. " +
    'If no speech, describe the audio. Be extremely thorough.'
  ),
  visual_description: z.string().describe(
    "Detailed description of what is shown on screen — slides, code, demos, websites, " +
    "apps, text overlays, diagrams. Include timestamps inline where content changes."
  ),
  links_and_resources: z.array(z.object({
    url: z.string().nullable().describe("Full URL or null if not determinable"),
    description: z.string(),
    timestamp: z.string(),
  })).describe("Every URL, website, tool, product, or resource mentioned or shown"),
  key_takeaways: z.array(z.string()).describe("3-7 bullet point takeaways"),
  topics: z.array(z.string()).describe("Specific topics and technologies discussed"),
});

export type Knowledge = z.infer<typeof KnowledgeSchema>;
