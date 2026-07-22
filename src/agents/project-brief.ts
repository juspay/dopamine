// Per-project action brief: distil the learnings mapped to a project into a few
// concrete, prioritized actions. Incremental — a project's brief is only
// re-synthesized when its learning-set (or the model) changes.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import type { NeuroLink } from "@juspay/neurolink";
import { CONFIG } from "../pipeline/config.js";
import type { BriefAction, ProjectBriefs } from "../schemas/brief.js";
import { BriefLLMSchema } from "../schemas/brief.js";
import { type Project, loadProjects } from "../schemas/projects.js";
import { hasSearchSchema, openSearchDb } from "../search/db.js";
import { safeJsonParse } from "../utils/json-repair.js";
import type { IdeaVideo } from "./ideas-writer.js";
import { writeBriefIdeas } from "./ideas-writer.js";
import type { Confidence, MappingSet } from "./project-mapper.js";

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
const MAX_ACTIONS = 5;
const TITLE_MAX = 120;
const DETAIL_MAX = 400;

export type BriefVideo = IdeaVideo & { docHash: string };
export type BriefLearning = {
  id: string;
  title: string;
  takeaways: string[];
  toolNames: string[];
  reason: string;
  confidence: Confidence;
  docHash: string;
};

/** Group medium+ confidence mappings by project, resolving each to its learning fields. */
export function collectProjectLearnings(
  mappings: MappingSet,
  videosById: Map<string, BriefVideo>,
  minConfidence: Confidence = "medium",
): Map<string, BriefLearning[]> {
  const floor = RANK[minConfidence];
  const out = new Map<string, BriefLearning[]>();
  for (const [videoId, list] of Object.entries(mappings)) {
    const v = videosById.get(videoId);
    if (!v) continue;
    for (const m of list) {
      // Fail CLOSED on an unrecognized confidence (undefined < floor is false,
      // which would wrongly keep it).
      if ((RANK[m.confidence] ?? -1) < floor) continue;
      const arr = out.get(m.project) ?? [];
      arr.push({
        id: v.id,
        title: v.title,
        takeaways: v.takeaways,
        toolNames: v.toolNames,
        reason: m.reason,
        confidence: m.confidence,
        docHash: v.docHash,
      });
      out.set(m.project, arr);
    }
  }
  return out;
}

// Unit/record separators (0x1f/0x1e) delimit concatenated fields so distinct
// learning-sets can never collide onto the same hash. Built via fromCharCode to
// keep the source free of control bytes.
const US = String.fromCharCode(31);
const RS = String.fromCharCode(30);

/**
 * Stable, order-independent hash gating re-synthesis. Includes each learning's
 * docHash and confidence so a re-analyzed video (new content, same title) or a
 * re-judged confidence forces a fresh brief — matching the mapper's content gate.
 */
export function briefHash(project: Project, learnings: BriefLearning[], model: string): string {
  const parts = learnings
    .map((l) => [l.id, l.docHash, l.confidence, l.reason].join(US))
    .sort()
    .join(RS);
  const material = [model, project.name, project.description, parts].join(RS);
  return createHash("sha256").update(material).digest("hex");
}

export function briefPrompt(project: Project, learnings: BriefLearning[]): string {
  return [
    `Project: ${project.name} — ${project.description}`,
    "",
    "You are advising on this project. Below are saved learnings judged relevant to it.",
    "Produce 3-5 CONCRETE, prioritized actions to try in this project — most impactful first.",
    "Each action: an imperative title, 1-2 sentences of specific detail (what to do and why for THIS project),",
    "and basedOn = the videoIds it draws on. Combine related learnings; do NOT merely restate a learning.",
    "If only one learning is given, return a single focused action.",
    "",
    "LEARNINGS:",
    ...learnings.map(
      (l) =>
        `- [${l.id}] ${l.title} — ${l.takeaways.slice(0, 3).join("; ")}${l.toolNames.length ? ` (tools: ${l.toolNames.join(", ")})` : ""} [why: ${l.reason}]`,
    ),
  ].join("\n");
}

/** Validate/clamp the model output: ≤5 well-formed actions, basedOn pruned to known ids. */
export function parseBrief(raw: unknown, knownIds: Set<string>): BriefAction[] {
  if (typeof raw !== "object" || raw === null) return [];
  const actions = (raw as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) return [];
  const out: BriefAction[] = [];
  for (const a of actions) {
    if (typeof a !== "object" || a === null) continue;
    const { title, detail, basedOn } = a as Record<string, unknown>;
    if (typeof title !== "string" || typeof detail !== "string") continue;
    const trimmedTitle = title.trim();
    const trimmedDetail = detail.trim();
    if (trimmedTitle === "" && trimmedDetail === "") continue;
    const ids = Array.isArray(basedOn)
      ? basedOn.filter((x): x is string => typeof x === "string" && knownIds.has(x))
      : [];
    out.push({
      title: trimmedTitle.slice(0, TITLE_MAX),
      detail: trimmedDetail.slice(0, DETAIL_MAX),
      basedOn: [...new Set(ids)],
    });
    if (out.length >= MAX_ACTIONS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface BriefDeps {
  projects: Project[];
  mappings: MappingSet;
  videos: BriefVideo[];
  prior: ProjectBriefs;
  model: string;
  now: () => string;
  minMappings: number;
  generate: (prompt: string) => Promise<unknown>;
}

/**
 * Compute briefs for the current projects. Incremental: a project whose learning
 * hash is unchanged reuses its cached brief with NO LLM call. Only current
 * projects are emitted, so removed projects are pruned implicitly.
 */
export async function runProjectBrief(d: BriefDeps): Promise<ProjectBriefs> {
  const videosById = new Map(d.videos.map((v) => [v.id, v]));
  const byProject = collectProjectLearnings(d.mappings, videosById);
  const out: ProjectBriefs = {};
  for (const project of d.projects) {
    const learnings = byProject.get(project.name) ?? [];
    if (learnings.length < d.minMappings) continue;
    const hash = briefHash(project, learnings, d.model);
    const cached = d.prior[project.name];
    if (cached && cached.hash === hash) {
      out[project.name] = cached;
      continue;
    }
    try {
      const raw = await d.generate(briefPrompt(project, learnings));
      const actions = parseBrief(raw, new Set(learnings.map((l) => l.id)));
      out[project.name] = { hash, generatedAt: d.now(), actions };
    } catch (err) {
      // One project's LLM/parse failure must not discard the whole run — keep
      // the last good brief for this project if we have one, and carry on.
      console.warn(`  Brief for ${project.name} failed: ${(err as Error).message}`);
      if (cached) out[project.name] = cached;
    }
  }
  return out;
}

type SqliteDb = ReturnType<typeof openSearchDb>;

/** Load id → learning fields (incl. doc_hash) for every indexed video. */
function loadBriefVideos(db: SqliteDb): BriefVideo[] {
  const rows = db.prepare("SELECT id, title, takeaways_json, source_url, doc_hash FROM videos").all() as unknown as {
    id: string;
    title: string;
    takeaways_json: string;
    source_url: string;
    doc_hash: string;
  }[];
  const toolStmt = db.prepare("SELECT name FROM tools WHERE video_id = ? LIMIT 5");
  return rows.map((r) => {
    // A single corrupt takeaways_json row must not crash the whole step
    // (safeJsonParse throws, rather than returning null, on unrecoverable input).
    let takeaways: string[] = [];
    try {
      const parsed = safeJsonParse(r.takeaways_json);
      if (Array.isArray(parsed)) takeaways = parsed as string[];
    } catch {
      takeaways = [];
    }
    return {
      id: r.id,
      title: r.title,
      takeaways,
      toolNames: (toolStmt.all(r.id) as unknown as { name: string }[]).map((t) => t.name),
      sourceUrl: r.source_url,
      docHash: r.doc_hash,
    };
  });
}

async function loadJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeAtomic(file: string, data: string): Promise<void> {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, file);
}

export async function runProjectBriefAgent(neurolink: NeuroLink): Promise<void> {
  console.log("\n=== Project Brief ===");
  const projects = loadProjects(() => readFileSync(CONFIG.PROJECTS_CONFIG, "utf8"));
  if (projects.length === 0) {
    console.log("  No projects.json (or empty) — skipping project brief.");
    return;
  }

  const mappingsFile = await loadJson<{ mappings: MappingSet }>(CONFIG.STATE.PROJECT_MAPPINGS, { mappings: {} });
  if (Object.keys(mappingsFile.mappings).length === 0) {
    console.log("  No project mappings yet — skipping project brief.");
    return;
  }

  const db = openSearchDb(CONFIG.STATE.SEARCH_DB);
  if (!hasSearchSchema(db)) {
    db.close();
    console.warn("  No search index yet — skipping project brief.");
    return;
  }

  try {
    const videos = loadBriefVideos(db);
    const prior = await loadJson<ProjectBriefs>(CONFIG.STATE.PROJECT_BRIEFS, {});
    const generate = async (prompt: string): Promise<unknown> => {
      const response = await neurolink.generate({
        input: { text: prompt },
        provider: "vertex",
        model: CONFIG.BRIEF_MODEL,
        schema: BriefLLMSchema,
        output: { format: "json" },
        disableTools: true,
      });
      return safeJsonParse(response.content);
    };

    const briefs = await runProjectBrief({
      projects,
      mappings: mappingsFile.mappings,
      videos,
      prior,
      model: CONFIG.BRIEF_MODEL,
      now: () => new Date().toISOString(),
      minMappings: CONFIG.BRIEF_MIN_MAPPINGS,
      generate,
    });

    await writeAtomic(CONFIG.STATE.PROJECT_BRIEFS, JSON.stringify(briefs, null, 2));
    const total = Object.values(briefs).reduce((a, b) => a + b.actions.length, 0);
    console.log(`  Briefs: ${Object.keys(briefs).length} project(s), ${total} action(s).`);

    await writeBriefIdeas(briefs, projects);
  } finally {
    db.close();
  }
}
