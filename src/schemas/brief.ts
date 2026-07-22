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

export interface BriefAction {
  title: string;
  detail: string;
  basedOn: string[]; // videoIds this action draws on
}

export interface ProjectBrief {
  hash: string; // gate: recompute only when the project's learning-set changes
  generatedAt: string;
  actions: BriefAction[];
}

export type ProjectBriefs = Record<string, ProjectBrief>; // keyed by project name
