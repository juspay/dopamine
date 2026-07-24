import { z } from "zod";

// visual_description is flattened to string — the original Python returned string|array,
// which is a union type that causes "Too many states" on Gemini.
// The LLM includes timestamps inline naturally (e.g., "[0:05] Slide shows...").
export const KnowledgeSchema = z.object({
  transcript: z
    .string()
    .describe(
      "Full word-for-word transcript. Include speaker labels if multiple speakers. " +
        "If no speech, describe the audio. Be extremely thorough.",
    ),
  visual_description: z
    .string()
    .describe(
      "Detailed description of what is shown on screen — slides, code, demos, websites, " +
        "apps, text overlays, diagrams. Include timestamps inline where content changes.",
    ),
  links_and_resources: z
    .array(
      z.object({
        url: z.string().nullable().describe("Full URL or null if not determinable"),
        description: z.string(),
        timestamp: z.string(),
      }),
    )
    .describe("Every URL, website, tool, product, or resource mentioned or shown"),
  key_takeaways: z
    .array(
      z.object({
        timestamp: z.string().describe("Timestamp like '0:05', or '' if none"),
        takeaway: z.string().describe("The takeaway text"),
      }),
    )
    .describe(
      "The genuine, specific takeaways the video conveys — typically 3-7 for a tutorial/product/" +
        "educational video; few or zero for pure entertainment or personal-lifestyle content. " +
        "Do NOT invent takeaways for content that has none.",
    ),
  topics: z.array(z.string()).describe("Specific topics and technologies discussed"),
});

/** A takeaway is a structured {timestamp, takeaway} object (new) or a bare
 *  string (legacy store entries written before the schema was enriched). */
export type Takeaway = { timestamp?: string; takeaway?: string } | string;

/** Stored knowledge. `key_takeaways` is a union so the 390 legacy string
 *  entries already in the store stay valid alongside the new structured objects
 *  that fresh extractions produce. */
export type Knowledge = Omit<z.infer<typeof KnowledgeSchema>, "key_takeaways"> & {
  key_takeaways: Takeaway[];
};

/** Render a takeaway to a display string, timestamp-prefixed when present.
 *  Backward-compatible with legacy string takeaways. */
export function takeawayText(t: Takeaway | null | undefined): string {
  if (t == null) return "";
  if (typeof t === "string") return t;
  const text = t.takeaway ?? "";
  return t.timestamp ? `[${t.timestamp}] ${text}` : text;
}
