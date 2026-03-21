import { z } from "zod";

// NOTE: Gemini + disableTools + schema requires flat structures.
// Avoid z.union() — triggers "Too many states" error.
export const ClassificationSchema = z.object({
  category: z.string().describe(
    'Auto-discovered category e.g. "Tech & Coding", "AI & Machine Learning", ' +
    '"Interior Design", "Food & Cooking", "Business & Marketing", "Fitness & Health"'
  ),
  subcategory: z.string().describe("More specific subcategory"),
  tags: z.array(z.string()).describe("5-10 descriptive tags"),
  description: z.string().describe("1-2 sentence description of the video content"),
  language: z.string().describe("Primary language spoken or shown"),
  mood: z.string().describe(
    'Mood/tone: "educational", "entertaining", "inspirational", "tutorial", "promotional"'
  ),
});

export type Classification = z.infer<typeof ClassificationSchema>;
