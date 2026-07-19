// Side-effect import so .env loads before config.js evaluates (ESM hoisting).
import "dotenv/config";

import fs from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { NeuroLink } from "@juspay/neurolink";
import { CONFIG } from "../pipeline/config.js";
import { acquireLock, releaseLock } from "../pipeline/lock.js";
import { MapJudgeSchema } from "../schemas/mapping.js";
import { type Project, loadProjects, portfolioHash, projectDoc, projectHash } from "../schemas/projects.js";
import { blobToVector, hasSearchSchema, openSearchDb, vectorToBlob } from "../search/db.js";
import { cosineSim } from "../search/rank.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { exponentialBackoff } from "../utils/rate-limit.js";
import { type FsLike, type IdeaVideo, writeIdeas } from "./ideas-writer.js";

const REASON_MAX = 140;

export type Confidence = "high" | "medium" | "low";

export interface ProjectMapping {
  project: string;
  confidence: Confidence;
  reason: string;
}

/** videoId → mappings (empty array = judged, nothing applied — still "processed"). */
export type MappingSet = Record<string, ProjectMapping[]>;

export interface ProjectMappingsFile {
  portfolioHash: string;
  /** videoId → search-index doc hash at judge time; a change re-judges the video. */
  videoHashes: Record<string, string>;
  mappings: MappingSet;
}

export interface ProjectVector {
  name: string;
  vector: Float32Array;
}

// ---------------------------------------------------------------------------
// Pure pieces
// ---------------------------------------------------------------------------

/** Top-K projects by cosine similarity above a floor. */
export function prefilter(videoVec: ArrayLike<number>, projects: ProjectVector[], topK: number, min: number): string[] {
  return projects
    .map((p) => ({ name: p.name, sim: cosineSim(videoVec, p.vector) }))
    .filter((p) => p.sim >= min)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, topK)
    .map((p) => p.name);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * Keep only applies:true verdicts for known candidates; clamp reason length.
 * Deduped by resolved project name — the LLM can return the same project twice
 * (literal or case-variant), and a duplicate (video, project) pair would violate
 * the project_mappings primary key on write.
 */
export function parseJudgement(judge: unknown, candidateNames: string[]): ProjectMapping[] {
  const parsed = MapJudgeSchema.safeParse(judge);
  if (!parsed.success) return [];
  const out: ProjectMapping[] = [];
  const seen = new Set<string>();
  for (const r of parsed.data.results) {
    if (!r.applies) continue;
    const match = candidateNames.find((n) => n.toLowerCase() === r.project.toLowerCase());
    if (!match || seen.has(match.toLowerCase())) continue;
    seen.add(match.toLowerCase());
    out.push({ project: match, confidence: r.confidence, reason: truncate(r.reason.trim(), REASON_MAX) });
  }
  return out;
}

export interface JudgeVideo {
  id: string;
  title: string;
  takeaways: string[];
  toolNames: string[];
}

export function judgePrompt(video: JudgeVideo, projects: Project[]): string {
  return [
    "You decide which of the listed projects a saved-video learning is genuinely useful for.",
    "Applies means the learning could realistically inform or improve that specific project — not merely share a topic.",
    "For EACH project return applies (boolean), confidence (high|medium|low), and a reason (<140 chars, concrete).",
    "",
    `LEARNING: ${video.title}`,
    `Takeaways: ${video.takeaways.slice(0, 5).join(" | ") || "-"}`,
    `Tools: ${video.toolNames.join(", ") || "-"}`,
    "",
    "PROJECTS:",
    ...projects.map((p) => `- ${p.name}: ${p.description}`),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export type EmbedFn = (text: string) => Promise<number[]>;
export type JudgeFn = (prompt: string) => Promise<unknown>;

/**
 * Embed each project once, reusing cached vectors whose doc hash AND embedding
 * model are unchanged. The model is part of the cache key so bumping
 * EMBEDDING_MODEL re-embeds projects into the same space as the re-embedded
 * videos — cosine across mismatched models is meaningless. Prunes removed projects.
 */
export async function embedProjects(
  db: DatabaseSync,
  projects: Project[],
  embed: EmbedFn,
  model: string,
): Promise<ProjectVector[]> {
  const currentNames = new Set(projects.map((p) => p.name));
  const existing = db.prepare("SELECT project FROM project_vectors").all() as { project: string }[];
  const delVec = db.prepare("DELETE FROM project_vectors WHERE project = ?");
  for (const row of existing) {
    if (!currentNames.has(row.project)) delVec.run(row.project);
  }

  const getVec = db.prepare("SELECT hash, model, vector FROM project_vectors WHERE project = ?");
  const upsert = db.prepare(`
    INSERT INTO project_vectors (project, hash, model, dims, vector) VALUES (?,?,?,?,?)
    ON CONFLICT(project) DO UPDATE SET hash=excluded.hash, model=excluded.model, dims=excluded.dims, vector=excluded.vector
  `);

  const out: ProjectVector[] = [];
  for (const p of projects) {
    const hash = projectHash(p);
    const cached = getVec.get(p.name) as { hash: string; model: string; vector: Uint8Array } | undefined;
    if (cached && cached.hash === hash && cached.model === model) {
      out.push({ name: p.name, vector: blobToVector(cached.vector) });
      continue;
    }
    const vec = await embed(projectDoc(p));
    upsert.run(p.name, hash, model, vec.length, vectorToBlob(vec));
    out.push({ name: p.name, vector: Float32Array.from(vec) });
  }
  return out;
}

interface VideoEmbeddingRow {
  id: string;
  title: string;
  takeaways_json: string;
  source_url: string;
  doc_hash: string;
  vector: Uint8Array;
}

type LoadedVideo = IdeaVideo & { vector: Float32Array; docHash: string };

/** Only videos embedded with `model` — so their vectors share the project vectors' space. */
function loadJudgeVideos(db: DatabaseSync, model: string): LoadedVideo[] {
  const rows = db
    .prepare(
      "SELECT v.id, v.title, v.takeaways_json, v.source_url, v.doc_hash, e.vector FROM videos v JOIN embeddings e ON e.video_id = v.id WHERE e.model = ?",
    )
    .all(model) as unknown as VideoEmbeddingRow[];
  const toolStmt = db.prepare("SELECT name FROM tools WHERE video_id = ? LIMIT 5");
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    takeaways: JSON.parse(r.takeaways_json) as string[],
    toolNames: (toolStmt.all(r.id) as unknown as { name: string }[]).map((t) => t.name),
    sourceUrl: r.source_url,
    docHash: r.doc_hash,
    vector: blobToVector(r.vector),
  }));
}

function writeMappingsTable(db: DatabaseSync, mappings: MappingSet): void {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM project_mappings");
    const ins = db.prepare("INSERT INTO project_mappings (video_id, project, confidence, reason) VALUES (?,?,?,?)");
    for (const [videoId, list] of Object.entries(mappings)) {
      for (const m of list) ins.run(videoId, m.project, m.confidence, m.reason);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export interface MapperOverrides {
  dbPath?: string;
  projectsPath?: string;
  mappingsPath?: string;
  ideasStatePath?: string;
  lockPath?: string;
  embeddingModel?: string;
  embed?: EmbedFn;
  judge?: JudgeFn;
  now?: () => string;
  fsImpl?: FsLike;
}

interface LoadedMappings {
  mappings: MappingSet;
  videoHashes: Record<string, string>;
}

function loadMappingsFile(mappingsPath: string, hash: string): LoadedMappings {
  try {
    const parsed = JSON.parse(fs.readFileSync(mappingsPath, "utf8")) as ProjectMappingsFile;
    // Portfolio changed → discard old verdicts and re-map from scratch.
    if (parsed.portfolioHash !== hash || typeof parsed.mappings !== "object") return { mappings: {}, videoHashes: {} };
    return { mappings: parsed.mappings, videoHashes: parsed.videoHashes ?? {} };
  } catch {
    return { mappings: {}, videoHashes: {} };
  }
}

async function saveMappingsFile(mappingsPath: string, file: ProjectMappingsFile): Promise<void> {
  const tmp = `${mappingsPath}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(file, null, 2), "utf8");
  await fs.promises.rename(tmp, mappingsPath);
}

function neurolinkJudge(neurolink: NeuroLink): JudgeFn {
  return async (prompt: string) => {
    const result = await exponentialBackoff(
      async () => {
        const response = await neurolink.generate({
          input: { text: prompt },
          provider: "vertex",
          model: CONFIG.MAP_MODEL,
          schema: MapJudgeSchema,
          output: { format: "json" },
          disableTools: true,
          maxTokens: 1024,
          timeout: "120s",
        });
        return safeJsonParse(response.content);
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_BASE_DELAY_MS,
    );
    if (!result.success) throw new Error(result.error);
    return result.value;
  };
}

const FLUSH_EVERY = 25;

interface JudgeState {
  mappings: MappingSet;
  videoHashes: Record<string, string>;
}

/**
 * Judge each not-yet-processed video against its prefiltered candidates,
 * mutating `state` in place. A video is skipped only if it was already judged
 * AND its search-index doc hash is unchanged, so a later re-extraction refreshes
 * its mapping. No candidates / null judge → recorded as processed-with-nothing;
 * a judge error leaves it unmarked so the next run retries. Returns the count judged.
 */
async function judgeVideos(
  videos: LoadedVideo[],
  projects: Project[],
  projectVecs: ProjectVector[],
  state: JudgeState,
  judge: JudgeFn | null,
  flush: () => Promise<void>,
): Promise<number> {
  const { mappings, videoHashes } = state;
  let judged = 0;
  for (const video of videos) {
    if (video.id in mappings && videoHashes[video.id] === video.docHash) continue; // unchanged, already judged
    const candidates = prefilter(video.vector, projectVecs, CONFIG.MAP_PREFILTER_TOPK, CONFIG.MAP_PREFILTER_MIN);
    if (candidates.length === 0 || judge === null) {
      mappings[video.id] = [];
      videoHashes[video.id] = video.docHash;
      continue;
    }
    const candidateProjects = projects.filter((p) => candidates.includes(p.name));
    try {
      mappings[video.id] = parseJudgement(await judge(judgePrompt(video, candidateProjects)), candidates);
      videoHashes[video.id] = video.docHash;
      judged++;
      // Persist periodically so a crash mid-backfill resumes instead of restarting.
      if (judged % FLUSH_EVERY === 0) {
        await flush();
        console.log(`  …judged ${judged} so far (checkpointed).`);
      }
    } catch (err) {
      console.warn(`  Judge failed for ${video.id} — will retry next run: ${String(err).slice(0, 120)}`);
    }
  }
  return judged;
}

export async function runProjectMapper(neurolink: NeuroLink | null, overrides: MapperOverrides = {}): Promise<void> {
  console.log("\n=== Project Mapping ===");
  const projectsPath = overrides.projectsPath ?? CONFIG.PROJECTS_CONFIG;
  const mappingsPath = overrides.mappingsPath ?? CONFIG.STATE.PROJECT_MAPPINGS;

  const projects = loadProjects(() => fs.readFileSync(projectsPath, "utf8"));
  if (projects.length === 0) {
    console.log("  No projects.json (or empty) — skipping project mapping.");
    return;
  }

  const lockPath = overrides.lockPath ?? `${mappingsPath}.lock`;
  if (!acquireLock(lockPath)) {
    console.warn("  Another project-mapping run holds the lock — skipping.");
    return;
  }

  const db = openSearchDb(overrides.dbPath ?? CONFIG.STATE.SEARCH_DB);
  if (!hasSearchSchema(db)) {
    db.close();
    releaseLock(lockPath);
    console.warn("  No search index yet (run search:index first) — skipping project mapping.");
    return;
  }

  const model = overrides.embeddingModel ?? CONFIG.EMBEDDING_MODEL;
  try {
    const embed = overrides.embed ?? (await defaultEmbed());
    if (embed === null) {
      console.warn("  Embeddings unavailable — skipping project mapping.");
      return;
    }

    const hash = portfolioHash(projects);
    const state = loadMappingsFile(mappingsPath, hash);
    const projectVecs = await embedProjects(db, projects, embed, model);
    const videos = loadJudgeVideos(db, model);
    const judge = overrides.judge ?? (neurolink ? neurolinkJudge(neurolink) : null);

    // Each checkpoint rewrites BOTH the table and the JSON so they never drift —
    // on a portfolio change or a crash, find_for_project (table) and the dashboard
    // (JSON) always reflect the same generation.
    const flush = async () => {
      writeMappingsTable(db, state.mappings);
      await saveMappingsFile(mappingsPath, {
        portfolioHash: hash,
        videoHashes: state.videoHashes,
        mappings: state.mappings,
      });
    };
    const judged = await judgeVideos(videos, projects, projectVecs, state, judge, flush);
    await flush();

    const totalMapped = Object.values(state.mappings).filter((m) => m.length > 0).length;
    console.log(`  Project mapping: ${videos.length} video(s), ${judged} judged this run, ${totalMapped} mapped.`);

    await writeIdeas(state.mappings, videos, projects, {
      statePath: overrides.ideasStatePath ?? CONFIG.STATE.IDEAS_STATE,
      now: overrides.now ?? (() => new Date().toISOString()),
      fsImpl: overrides.fsImpl,
    });
  } finally {
    db.close();
    releaseLock(lockPath);
  }
}

async function defaultEmbed(): Promise<EmbedFn | null> {
  try {
    const { createAIProvider } = await import("@juspay/neurolink");
    const provider = await createAIProvider("vertex");
    return (text: string) => provider.embed(text, CONFIG.EMBEDDING_MODEL);
  } catch (err) {
    console.warn(`  Could not init embedding provider: ${String(err).slice(0, 150)}`);
    return null;
  }
}

if (process.argv[1]?.endsWith("project-mapper.js")) {
  const neurolink = new NeuroLink();
  runProjectMapper(neurolink)
    .catch((err) => {
      console.error("Project mapping failed:", err);
      process.exitCode = 1;
    })
    .finally(() => neurolink.shutdown());
}
