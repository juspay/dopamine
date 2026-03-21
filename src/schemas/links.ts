import { z } from "zod";

export const LinksSchema = z.object({
  links: z.array(z.object({
    name: z.string().describe("Tool/product/resource name"),
    url: z.string().nullable().describe(
      "Full https:// URL shown on screen or known. null if truly unknown."
    ),
    type: z.enum(["shown_on_screen", "mentioned_verbally", "inferred_from_context"]),
    description: z.string().describe("What it is and why mentioned"),
    timestamp: z.string().describe("Approximate timestamp in the video"),
  })),
});

export type Links = z.infer<typeof LinksSchema>;
