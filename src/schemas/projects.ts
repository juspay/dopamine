import crypto from "node:crypto";
import { z } from "zod";

export const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  /** Absolute repo path; only projects with an existing path get IDEAS.md drops. */
  path: z.string().optional(),
});

export const ProjectsSchema = z.array(ProjectSchema);

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Load + validate projects.json. A missing or invalid file yields [] with a
 * warning — the mapper then no-ops rather than crashing the pipeline.
 */
export function loadProjects(readFile: () => string): Project[] {
  let raw: string;
  try {
    raw = readFile();
  } catch {
    return [];
  }
  try {
    return ProjectsSchema.parse(JSON.parse(raw));
  } catch (err) {
    console.warn(`  projects.json is invalid — skipping project mapping: ${String(err).slice(0, 150)}`);
    return [];
  }
}

/** Text embedded and shown to the judge for a project. */
export function projectDoc(p: Project): string {
  const kw = p.keywords.length > 0 ? `\nKeywords: ${p.keywords.join(", ")}` : "";
  return `${p.name}\n${p.description}${kw}`;
}

/** Stable per-project hash — re-embed only when a project's own doc changes. */
export function projectHash(p: Project): string {
  return crypto.createHash("sha256").update(projectDoc(p), "utf8").digest("hex");
}

/**
 * Order-insensitive hash of the whole portfolio. Bumping it forces a full
 * re-map; the prefilter keeps the LLM cost proportional to plausible pairs.
 */
export function portfolioHash(projects: Project[]): string {
  const normalized = [...projects]
    .map((p) => ({ name: p.name, description: p.description, keywords: [...p.keywords].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return crypto.createHash("sha256").update(JSON.stringify(normalized), "utf8").digest("hex");
}
