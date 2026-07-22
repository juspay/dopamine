import fs from "node:fs";
import path from "node:path";
import type { ProjectBriefs } from "../schemas/brief.js";
import type { Project } from "../schemas/projects.js";

/** A learning as consumed by the brief agent (kept here as the shared shape). */
export interface IdeaVideo {
  id: string;
  title: string;
  takeaways: string[];
  toolNames: string[];
  sourceUrl: string;
}

/** Minimal async fs surface used here — injectable for tests, wrapping node:fs in prod. */
export interface FsLike {
  readFile(path: string, encoding: "utf8"): Promise<string>;
  writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  access(path: string): Promise<void>;
}

const realFs: FsLike = {
  readFile: (p, enc) => fs.promises.readFile(p, enc),
  writeFile: (p, d, enc) => fs.promises.writeFile(p, d, enc),
  rename: (from, to) => fs.promises.rename(from, to),
  access: (p) => fs.promises.access(p),
};

const IDEAS_HEADER = `# Ideas from Dopamine

Auto-generated action brief from saved-video learnings that may apply to this
project. Managed between the dopamine:brief markers — edit or delete freely; the
region is refreshed when the underlying learnings change.
`;

/**
 * Neutralise HTML-comment delimiters in model/LLM-derived text so an action's
 * title/detail can never forge a `<!-- dopamine:brief:... -->` marker (a forged
 * marker would corrupt the replaceable region). Also flatten newlines so one
 * field can't inject extra markdown structure.
 */
function mdSafe(text: string): string {
  return text.replace(/<!--/g, "<! --").replace(/-->/g, "-- >").replace(/\r?\n/g, " ").trim();
}

async function readOr(fsLike: FsLike, file: string, fallback: string): Promise<string> {
  try {
    return await fsLike.readFile(file, "utf8");
  } catch {
    return fallback;
  }
}

async function writeAtomic(fsLike: FsLike, file: string, content: string): Promise<void> {
  const tmp = `${file}.tmp`;
  await fsLike.writeFile(tmp, content, "utf8");
  await fsLike.rename(tmp, file);
}

// ---------------------------------------------------------------------------
// Action-brief section — one replaceable, marked region PER PROJECT in that
// project's IDEAS.md. Keyed by a per-project slug so distinct projects that
// share a repo path coexist instead of clobbering each other, and so a project
// whose brief disappears has its region cleaned up rather than left stale.
// ---------------------------------------------------------------------------

/** Marker-safe slug (alphanumerics, `_`, `-`) — also regex-safe by construction. */
function projectSlug(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "_");
}

const briefStart = (slug: string, hash: string): string => `<!-- dopamine:brief:${slug}:start:${hash} -->`;
const briefEnd = (slug: string): string => `<!-- dopamine:brief:${slug}:end -->`;
/** Match THIS project's brief region (any hash) so a changed brief replaces it. */
function briefRegionRe(slug: string): RegExp {
  return new RegExp(`<!-- dopamine:brief:${slug}:start:[^>]*-->[\\s\\S]*?<!-- dopamine:brief:${slug}:end -->`);
}

function briefSection(actions: { title: string; detail: string }[], slug: string, hash: string): string {
  const body = actions.map((a, i) => `${i + 1}. **${mdSafe(a.title)}** — ${mdSafe(a.detail)}`).join("\n");
  return [briefStart(slug, hash), "", "## What to try (from Dopamine)", "", body, "", briefEnd(slug)].join("\n");
}

/**
 * Write/refresh each project's action brief in its repo's IDEAS.md as a single
 * per-project marked region. Iterates the CURRENT projects (not just the briefs
 * map) so it can also strip a region whose project no longer has a brief.
 *  - same hash already present → skip;
 *  - different hash present → replace that region (no stale accumulation);
 *  - no region yet → append;
 *  - project has no/empty brief → remove any existing region (cleanup).
 * Skips projects with no configured path or a missing path.
 */
export async function writeBriefIdeas(
  briefs: ProjectBriefs,
  projects: Project[],
  opts: { fsImpl?: FsLike } = {},
): Promise<void> {
  const fsLike = opts.fsImpl ?? realFs;
  let n = 0;
  for (const proj of projects) {
    if (!proj.path) continue;
    try {
      await fsLike.access(proj.path);
    } catch {
      continue; // configured path doesn't exist
    }
    const ideasPath = path.join(proj.path, "IDEAS.md");
    const slug = projectSlug(proj.name);
    const region = briefRegionRe(slug);
    const existing = await readOr(fsLike, ideasPath, "");
    const brief = briefs[proj.name];

    if (!brief || brief.actions.length === 0) {
      // Cleanup: drop a now-stale region if one exists.
      if (region.test(existing)) {
        const stripped = existing
          .replace(region, "")
          .replace(/\n{3,}/g, "\n\n")
          .trimEnd();
        await writeAtomic(fsLike, ideasPath, stripped === "" ? "" : `${stripped}\n`);
        n++;
      }
      continue;
    }

    if (existing.includes(briefStart(slug, brief.hash))) continue; // already current
    const section = briefSection(brief.actions, slug, brief.hash);
    const next = region.test(existing)
      ? existing.replace(region, section)
      : `${(existing === "" ? IDEAS_HEADER : existing).trimEnd()}\n\n${section}\n`;
    await writeAtomic(fsLike, ideasPath, next);
    n++;
  }
  if (n > 0) console.log(`  IDEAS.md: wrote/updated ${n} project brief section(s).`);
}
