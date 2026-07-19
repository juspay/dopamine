import { z } from "zod";

/**
 * Judge output: one verdict per candidate project for a single video. Confidence
 * and applies drive whether/where a mapping surfaces; reason is shown in chips,
 * find_for_project, and IDEAS.md.
 */
export const MapJudgeSchema = z.object({
  results: z.array(
    z.object({
      project: z.string(),
      applies: z.boolean(),
      confidence: z.enum(["high", "medium", "low"]),
      reason: z.string().max(300),
    }),
  ),
});

export type MapJudge = z.infer<typeof MapJudgeSchema>;
