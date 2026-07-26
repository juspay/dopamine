// Shapes for the per-project action brief: an LLM-synthesized set of concrete,
// prioritized actions distilled from the learnings mapped to a project.

import { z } from "zod";

// Structured-output schema handed to NeuroLink. The model returns only the
// actions; hash/generatedAt are stamped by the agent.
export const BriefLLMSchema = z.object({
  actions: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      basedOn: z.array(z.string()),
    }),
  ),
});

/** Fewer distinct sources than this and an action is one video's hunch, not a
 *  corroborated pattern. */
export const CORROBORATION_MIN = 2;

export interface BriefAction {
  title: string;
  detail: string;
  basedOn: string[]; // videoIds this action draws on
  /** Drawn from a single video — presented as a hunch, not a recommendation.
   *  Optional: briefs cached before this field existed lack it, so read it via
   *  `isExploratoryAction` rather than directly. */
  exploratory?: boolean;
}

export interface ProjectBrief {
  hash: string; // gate: recompute only when the project's learning-set changes
  generatedAt: string;
  actions: BriefAction[];
  /** Distinct learnings the whole brief rests on. Optional for the same
   *  backwards-compatibility reason as `exploratory`. */
  sourceCount?: number;
}

/** Single source of truth for "is this a hunch?", tolerant of briefs written
 *  before the flag existed. */
export function isExploratoryAction(a: Pick<BriefAction, "basedOn" | "exploratory">): boolean {
  return a.exploratory ?? a.basedOn.length < CORROBORATION_MIN;
}

/** Distinct learnings behind a brief, falling back to the union of its actions'
 *  sources for briefs generated before `sourceCount` was stamped. */
export function briefSourceCount(b: Pick<ProjectBrief, "actions" | "sourceCount">): number {
  return b.sourceCount ?? new Set(b.actions.flatMap((a) => a.basedOn)).size;
}

export type ProjectBriefs = Record<string, ProjectBrief>; // keyed by project name
