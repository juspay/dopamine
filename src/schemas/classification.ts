import { z } from "zod";

// Canonical category taxonomy. Closed set — model MUST pick one, no inventing.
// Free-form `category` previously gave us 34 variants for 364 videos (e.g.
// "Travel", "Travel & Lifestyle", "Travel & Adventure", "Travel & Local",
// "Travel & Events", "Travel & Living"), breaking the dashboard grouping.
export const CATEGORIES = [
  "Tech & Coding",
  "AI & Machine Learning",
  "UI/UX Design",
  "Business & Marketing",
  "Education",
  "Finance",
  "Interior Design & Home",
  "Food & Cooking",
  "Travel & Lifestyle",
  "Fitness & Health",
  "Entertainment & Comedy",
  "Other",
] as const;

// NOTE: Gemini + disableTools + schema requires flat structures.
// Avoid z.union() — triggers "Too many states" error.
export const ClassificationSchema = z.object({
  category: z.enum(CATEGORIES).describe(
    "Pick exactly one from the closed taxonomy. No free-form values."
  ),
  subcategory: z.string().describe("More specific subcategory (free-form)"),
  tags: z.array(z.string()).describe("5-10 descriptive tags"),
  description: z.string().describe("1-2 sentence description of the video content"),
  language: z.string().describe("Primary language spoken or shown"),
  mood: z.string().describe(
    'Mood/tone: "educational", "entertaining", "inspirational", "tutorial", "promotional"'
  ),
});

export type Classification = z.infer<typeof ClassificationSchema>;
