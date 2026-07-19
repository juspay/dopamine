import fs from "node:fs";
import path from "node:path";
import type { Project } from "../schemas/projects.js";
import type { MappingSet, ProjectMapping } from "./project-mapper.js";

export interface IdeaVideo {
  id: string;
  title: string;
  takeaways: string[];
  toolNames: string[];
  sourceUrl: string;
}

interface IdeasState {
  /** "videoId::project" pairs already written, so a block is appended once. */
  written: string[];
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

Auto-appended learnings from saved videos that may apply to this project.
Each entry is added once; edit or delete freely.
`;

/**
 * Neutralise HTML-comment delimiters in model/LLM-derived text so a `reason`
 * (or title/takeaway) can never forge a `<!-- dopamine:... -->` marker — a
 * forged marker would make the idempotency check skip a real, different entry.
 * Also flatten newlines so one field can't inject extra markdown structure.
 */
function mdSafe(text: string): string {
  return text.replace(/<!--/g, "<! --").replace(/-->/g, "-- >").replace(/\r?\n/g, " ").trim();
}

export function ideaBlock(video: IdeaVideo, reason: string, marker: string): string {
  const takeaway = video.takeaways[0] ?? "";
  const tools = video.toolNames.join(", ");
  return [
    `### ${mdSafe(video.title)}`,
    "",
    mdSafe(reason),
    "",
    ...(takeaway ? [`- **Takeaway:** ${mdSafe(takeaway)}`] : []),
    ...(tools ? [`- **Tools:** ${mdSafe(tools)}`] : []),
    ...(video.sourceUrl ? [`- **Source:** ${mdSafe(video.sourceUrl)}`] : []),
    "",
    marker,
  ].join("\n");
}

async function readOr(fsLike: FsLike, file: string, fallback: string): Promise<string> {
  try {
    return await fsLike.readFile(file, "utf8");
  } catch {
    return fallback;
  }
}

/** Load the written-pairs set, tolerating a missing OR corrupt state file. */
async function loadWrittenState(fsLike: FsLike, statePath: string): Promise<string[]> {
  try {
    const parsed = JSON.parse(await readOr(fsLike, statePath, '{"written":[]}')) as IdeasState;
    return Array.isArray(parsed.written) ? parsed.written.filter((w) => typeof w === "string") : [];
  } catch {
    // Corrupt state → treat as empty; the in-file marker still prevents duplicate blocks.
    return [];
  }
}

async function writeAtomic(fsLike: FsLike, file: string, content: string): Promise<void> {
  const tmp = `${file}.tmp`;
  await fsLike.writeFile(tmp, content, "utf8");
  await fsLike.rename(tmp, file);
}

export interface WriteIdeasOptions {
  statePath: string;
  now: () => string;
  fsImpl?: FsLike;
}

/**
 * Append one idea block to <path>/IDEAS.md, unless the marker is already present.
 * Returns "written" | "present" | "skip" (path missing / no video). Idempotent.
 */
async function appendIdea(
  fsLike: FsLike,
  project: Project,
  video: IdeaVideo | undefined,
  reason: string,
  videoId: string,
): Promise<"written" | "present" | "skip"> {
  if (!project.path || !video) return "skip";
  try {
    await fsLike.access(project.path);
  } catch {
    return "skip"; // configured path doesn't exist
  }
  const ideasPath = path.join(project.path, "IDEAS.md");
  const marker = `<!-- dopamine:${videoId} -->`;
  const existing = await readOr(fsLike, ideasPath, "");
  if (existing.includes(marker)) return "present";
  const base = existing === "" ? IDEAS_HEADER : existing;
  await writeAtomic(fsLike, ideasPath, `${base.trimEnd()}\n\n${ideaBlock(video, reason, marker)}\n`);
  return "written";
}

/**
 * Append idea blocks to <project.path>/IDEAS.md for each HIGH-confidence mapping
 * whose project has an existing path. Idempotent per (video, project): guarded
 * by both ideas_state.json and an in-file marker. Never runs git or any command
 * in the target repo; only writes IDEAS.md.
 */
export async function writeIdeas(
  mappings: MappingSet,
  videos: IdeaVideo[],
  projects: Project[],
  opts: WriteIdeasOptions,
): Promise<void> {
  const fsLike = opts.fsImpl ?? realFs;
  const projByName = new Map(projects.map((p) => [p.name, p]));
  const videosById = new Map(videos.map((v) => [v.id, v]));

  const written = new Set(await loadWrittenState(fsLike, opts.statePath));
  let appended = 0;

  for (const { videoId, mapping } of highConfidenceDrops(mappings, written)) {
    const proj = projByName.get(mapping.project);
    if (!proj) continue;
    const outcome = await appendIdea(fsLike, proj, videosById.get(videoId), mapping.reason, videoId);
    if (outcome === "skip") continue;
    written.add(`${videoId}::${mapping.project}`);
    if (outcome === "written") appended++;
  }

  await writeAtomic(fsLike, opts.statePath, JSON.stringify({ written: [...written] }, null, 2));
  if (appended > 0) console.log(`  IDEAS.md: appended ${appended} high-confidence idea(s).`);
}

/** Flatten mappings to the high-confidence (video, project) pairs not yet written. */
function* highConfidenceDrops(
  mappings: MappingSet,
  written: Set<string>,
): Generator<{ videoId: string; mapping: ProjectMapping }> {
  for (const [videoId, list] of Object.entries(mappings)) {
    for (const mapping of list) {
      if (mapping.confidence === "high" && !written.has(`${videoId}::${mapping.project}`)) {
        yield { videoId, mapping };
      }
    }
  }
}
