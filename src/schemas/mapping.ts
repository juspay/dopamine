import { z } from "zod";

/**
 * Judge output: one verdict per candidate project for a single video. `applies`
 * drives whether a mapping surfaces; reason is shown in chips, find_for_project,
 * and IDEAS.md. Confidence is deliberately NOT asked for — it is derived from
 * measured similarity in project-mapper.ts, because the judge's self-report was
 * uncorrelated with the evidence (it never once returned "low" across ~250
 * verdicts). Asking for a field we discard only adds a way for an otherwise
 * valid verdict to fail validation.
 */
/** One verdict. Exported so the parser can validate the array PER ITEM — the
 *  whole-object schema is all-or-nothing, so a single malformed verdict would
 *  otherwise discard every sibling verdict for the same video. */
export const MapVerdictSchema = z.object({
  project: z.string(),
  applies: z.boolean(),
  reason: z.string().max(300),
});

export const MapJudgeSchema = z.object({
  results: z.array(MapVerdictSchema),
});

export type MapJudge = z.infer<typeof MapJudgeSchema>;
