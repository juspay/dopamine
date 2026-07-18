import { z } from "zod";

/**
 * LLM output for the daily digest. Caps are generous at the schema layer —
 * hard truncation to display lengths happens in code, so a slightly-long
 * model answer degrades gracefully instead of failing validation.
 */
export const DigestSchema = z.object({
  headline: z.string().max(120),
  lines: z.array(z.string().max(160)),
});

export type Digest = z.infer<typeof DigestSchema>;
