import crypto from "node:crypto";
import { z } from "zod";

export const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  /**
   * Subject matter this project merely PROCESSES or is adjacent to, which the
   * judge must not mistake for applicability. A pipeline that ingests cooking
   * videos is not improved by a cooking video; without this, its own
   * description makes the whole corpus look relevant to it.
   */
  avoid: z.string().optional(),
  /**
   * Distinct reasons a learning lands on this project, each embedded as its own
   * vector and scored against its own baseline.
   *
   * One vector cannot serve a project whose applicable set is genuinely
   * multi-topic. Because a candidate's score is standardised against that
   * project's own similarity distribution, widening the description is close to
   * zero-sum: it lifts similarity to every video, the baseline mean rises with
   * it, and true pairs gain nothing. Measured on 171 human-confirmed pairs,
   * broadening Curator's description moved its reach 74% → 70%; splitting the
   * same material into facets moved it 74% → 93%, and Neurolink 75% → 98%,
   * lifting the portfolio ceiling 82% → 94% while candidate density went UP
   * (31% → 32%) — recall that is not paid for in precision.
   *
   * Write each facet as one coherent reason, not a restatement of the project.
   */
  facets: z.array(z.string().min(1)).default([]),
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

/** One embeddable text per project vector: the project doc plus each facet. */
export interface ProjectFacet {
  /** Vector identity — cache key and baseline key. Unique across the portfolio. */
  key: string;
  project: string;
  text: string;
}

/**
 * Every vector a project contributes.
 *
 * The base doc keeps the bare project name as its key so vectors cached before
 * facets existed stay valid; facets are suffixed. A facet is embedded with the
 * project name prefixed so the vector still sits in the project's neighbourhood
 * rather than floating free in topic space.
 */
export function projectFacets(p: Project): ProjectFacet[] {
  return [
    { key: p.name, project: p.name, text: projectDoc(p) },
    ...p.facets.map((f, i) => ({ key: `${p.name}#${i}`, project: p.name, text: `${p.name}. ${f}` })),
  ];
}

/** Hash of one facet's embeddable text — the per-vector re-embed trigger. */
export function facetHash(f: ProjectFacet): string {
  return crypto.createHash("sha256").update(f.text, "utf8").digest("hex");
}

/**
 * Order-insensitive hash of the whole portfolio. Bumping it forces a full
 * re-map; the prefilter keeps the LLM cost proportional to plausible pairs.
 */
export function portfolioHash(projects: Project[]): string {
  // `avoid` belongs here but NOT in projectDoc: it changes what the judge is
  // told (so cached mappings must be invalidated) while leaving the embedding
  // alone — embedding it would pull the vector toward the very content it
  // exists to reject.
  // `facets` belongs here too: they change which candidates reach the judge, so
  // verdicts cached before a facet edit were formed from a different shortlist.
  const normalized = [...projects]
    .map((p) => ({
      name: p.name,
      description: p.description,
      keywords: [...p.keywords].sort(),
      avoid: p.avoid ?? "",
      facets: [...p.facets],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return crypto.createHash("sha256").update(JSON.stringify(normalized), "utf8").digest("hex");
}
