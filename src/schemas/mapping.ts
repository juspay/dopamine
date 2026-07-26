import { z } from "zod";

/**
 * Judge output: one verdict per candidate project for a single video. Confidence
 * and applies drive whether/where a mapping surfaces; reason is shown in chips,
 * find_for_project, and IDEAS.md.
 */
/** One verdict. Exported so the parser can validate the array PER ITEM — the
 *  whole-object schema is all-or-nothing, so a single malformed verdict would
 *  otherwise discard every sibling verdict for the same video. */
export const MapVerdictSchema = z.object({
  project: z.string(),
  applies: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string().max(300),
});

export const MapJudgeSchema = z.object({
  results: z.array(MapVerdictSchema),
});

export type MapJudge = z.infer<typeof MapJudgeSchema>;
