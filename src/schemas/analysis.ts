import { z } from "zod";

/**
 * Schema for the AnalyzerAgent output.
 *
 * NOTE: Gemini + disableTools + schema requires flat / simple structures.
 * We avoid z.union() to prevent "Too many states" errors.
 * The `type` field uses z.string() with .describe() instead of z.enum() because
 * Gemini's structured-output mode chokes on enums inside nested arrays.
 */
export const ActionableItemSchema = z.object({
  type: z.string().describe(
    'One of: "tool_install", "code_snippet", "api_setup", "workflow", "technique"'
  ),
  name: z.string().describe("What to implement — tool name, technique name, etc."),
  description: z.string().describe("How to implement it — step-by-step instructions"),
  install_command: z.string().describe(
    "Shell command to install (npm install X, pip install X, brew install X). Empty string if not applicable."
  ),
  code: z.string().describe("Any code to run. Empty string if not applicable."),
  url: z.string().describe("URL to find it. Empty string if not applicable."),
  verification_steps: z.array(z.string()).describe("Steps to verify it works after implementation"),
});

export const AnalysisSchema = z.object({
  actionable_items: z.array(ActionableItemSchema).describe(
    "Array of things that can be implemented or tried from this video"
  ),
  implementability_score: z.number().describe("0-10 how implementable is this content"),
  usefulness_prediction: z.string().describe(
    'One of: "highly_useful", "useful", "somewhat_useful", "not_useful"'
  ),
});

export type ActionableItem = z.infer<typeof ActionableItemSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
