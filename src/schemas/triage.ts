// Actionability triage: each saved video gets a tier deciding how far it flows
// into the apply-loop. Only apply-now / evaluate-later reach analysis, mapping,
// and briefs; reference stays searchable; skip is saved-for-enjoyment only.

import { z } from "zod";

export const TIERS = ["apply-now", "evaluate-later", "reference-only", "skip"] as const;
export type Tier = (typeof TIERS)[number];

/** Display-only sentinel for a video with no triage verdict yet (never triaged,
 *  or skipped by runTriage because it lacked a category / errored). Kept distinct
 *  from the real reference-only tier so the dashboard never conflates "not yet
 *  triaged" with "the LLM judged this reference-only" — mirrors verification's
 *  "unknown" sentinel. Not an LLM-assignable tier. */
export const UNTRIAGED = "untriaged" as const;
export type ActionabilityDisplay = Tier | typeof UNTRIAGED;

/** Tiers that feed analysis → verification → mapping → brief. */
export const APPLY_TIERS: ReadonlySet<Tier> = new Set<Tier>(["apply-now", "evaluate-later"]);
export function feedsApplyLoop(tier: Tier): boolean {
  return APPLY_TIERS.has(tier);
}

// Structured output from the triage LLM call (no hash — the agent stamps it).
export const TriageLLMSchema = z.object({
  tier: z.enum(TIERS),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});

export interface TriageEntry {
  tier: Tier;
  confidence: "high" | "medium" | "low";
  reason: string;
  hash: string; // gate: re-triage only when the classifier signal changes
}

export type TriageFile = Record<string, TriageEntry>; // keyed by video id
