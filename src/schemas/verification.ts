import { z } from "zod";

/**
 * Schema for the VerifierAgent output.
 *
 * Uses z.string() with .describe() instead of z.enum() to avoid
 * Gemini "Too many states" errors in nested structures.
 */
export const ItemVerificationSchema = z.object({
  item_name: z.string().describe("Name of the actionable item"),
  research_summary: z.string().describe("Summary of research findings"),
  implementation_result: z.string().describe(
    'One of: "success", "partial_success", "failed", "skipped", "not_applicable"'
  ),
  is_url_live: z.string().describe('"yes", "no", "not_checked", or "no_url"'),
  notes: z.string().describe("Additional notes about this item"),
});

export const VerificationReportSchema = z.object({
  overall_score: z.string().describe(
    'One of: "verified_useful", "partially_verified", "not_verified", "outdated"'
  ),
  summary: z.string().describe("1-3 sentence summary recommendation"),
  item_results: z.array(ItemVerificationSchema).describe("Per-item verification results"),
  confidence: z.number().describe("0-10 confidence in this verification"),
});

export type ItemVerification = z.infer<typeof ItemVerificationSchema>;
export type VerificationReport = z.infer<typeof VerificationReportSchema>;
