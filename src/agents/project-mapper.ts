// Side-effect import so .env loads before config.js evaluates (ESM hoisting).
import "dotenv/config";

import fs from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { NeuroLink } from "@juspay/neurolink";
import { CONFIG } from "../pipeline/config.js";
import { acquireLock, releaseLock } from "../pipeline/lock.js";
import { MapJudgeSchema, MapVerdictSchema } from "../schemas/mapping.js";
import { type Project, loadProjects, portfolioHash, projectDoc, projectHash } from "../schemas/projects.js";
import { blobToVector, hasSearchSchema, openSearchDb, vectorToBlob } from "../search/db.js";
import { cosineSim } from "../search/rank.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { exponentialBackoff } from "../utils/rate-limit.js";
import type { IdeaVideo } from "./ideas-writer.js";
import { loadTriageTiers, makeApplyGate } from "./triage.js";

const REASON_MAX = 140;

/** Minimum length for a single-token reason to count as substantive. */
const LONE_TOKEN_MIN = 20;

/** A genuine rationale is at least a short phrase. The observed degenerate
 *  outputs were "" and the bare word "Can" — a hollow reason signals the
 *  verdict itself is unreliable, so the mapping is dropped rather than
 *  surfaced. Not a plain character floor: terse but real reasons ("Same tech",
 *  "Shared auth flow") must survive, which a 10-char cutoff would have eaten.
 *  A lone token still passes if it is long enough to carry meaning. */
function isDegenerateReason(reason: string): boolean {
  const words = reason.split(/\s+/).filter(Boolean).length;
  if (words === 0) return true;
  return words < 2 && reason.length < LONE_TOKEN_MIN;
}

export type Confidence = "high" | "medium" | "low";

export interface ProjectMapping {
  project: string;
  confidence: Confidence;
  reason: string;
}

/** videoId → mappings (empty array = judged, nothing applied — still "processed"). */
export type MappingSet = Record<string, ProjectMapping[]>;

/** Bump when judging behaviour changes (candidate selection, prompt, parsing,
 *  token budget) so verdicts cached under the old behaviour are re-judged.
 *  Without this, a video
 *  recorded as "nothing applies" stays that way until its own content changes —
 *  which is how the truncation bug's empty results would have persisted. */
export const JUDGE_VERSION = 2;

export interface ProjectMappingsFile {
  portfolioHash: string;
  /** JUDGE_VERSION that produced these verdicts; a mismatch invalidates them. */
  judgeVersion?: number;
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

/** Corpus-wide mean and spread of one project's similarity to every video. */
export interface ProjectBaseline {
  mean: number;
  sd: number;
}
export type ProjectBaselines = Record<string, ProjectBaseline>;

/**
 * How close each project sits to the corpus as a whole.
 *
 * Embedding similarities are not comparable across projects. Measured over 227
 * eligible videos, per-project mean cosine ranged 0.558 (WorkForge) to 0.607
 * (Curator) while each project's own spread was only sd≈0.03 — so a project's
 * baseline offset outweighed the entire relevance signal, and ranking by raw
 * cosine mostly ranked projects by how central their vector is. Curator was
 * offered as a candidate for 84% of the corpus and WorkForge for 4%, which
 * reflects vector centrality, not what those videos were about.
 *
 * Subtracting each project's own baseline makes the scores comparable.
 */
export function projectBaselines(videoVecs: ArrayLike<number>[], projects: ProjectVector[]): ProjectBaselines {
  const out: ProjectBaselines = {};
  for (const p of projects) {
    const sims = videoVecs.map((v) => cosineSim(v, p.vector));
    const mean = sims.reduce((a, b) => a + b, 0) / sims.length;
    const variance = sims.reduce((a, b) => a + (b - mean) ** 2, 0) / sims.length;
    out[p.name] = { mean, sd: Math.sqrt(variance) };
  }
  return out;
}

/**
 * Top-K projects a video is closest to, above a floor.
 *
 * With `baselines`, a project scores by how many standard deviations above its
 * own corpus baseline this video sits, and `min` is read in those units — a
 * video has to be unusually close to a project, not merely close in absolute
 * terms. Without them it falls back to raw cosine, since the standardisation
 * needs a corpus large enough for the spread to mean anything.
 */
export function prefilter(
  videoVec: ArrayLike<number>,
  projects: ProjectVector[],
  topK: number,
  min: number,
  baselines?: ProjectBaselines,
): string[] {
  return projects
    .map((p) => {
      const sim = cosineSim(videoVec, p.vector);
      const base = baselines?.[p.name];
      // sd of 0 means every video is equidistant from this project, so the
      // standardised score is undefined — leave it on the raw scale rather
      // than dividing by zero.
      const score = base && base.sd > 0 ? (sim - base.mean) / base.sd : sim;
      return { name: p.name, score };
    })
    .filter((p) => p.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((p) => p.name);
}

/** Truncate on a word boundary where one is reasonably close, so a reason
 * never gets clipped mid-word (e.g. "discoverabilit…"). Falls back to a hard
 * cut when the tail has no space to break on (e.g. one long unbroken token). */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  // Cut by code point, not UTF-16 unit, so an emoji straddling the boundary is
  // never split into a lone surrogate.
  const sliced = Array.from(text)
    .slice(0, max - 1)
    .join("");
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.trimEnd()}…`;
}

/**
 * Keep only applies:true verdicts for known candidates; clamp reason length.
 * Deduped by resolved project name — the LLM can return the same project twice
 * (literal or case-variant), and a duplicate (video, project) pair would violate
 * the project_mappings primary key on write.
 */
export function parseJudgement(judge: unknown, candidateNames: string[]): ProjectMapping[] {
  // Validate PER VERDICT, not over the whole payload. The strict object schema
  // is all-or-nothing: a single verdict missing `reason` used to discard every
  // other verdict for that video, including valid applies:true ones — which is
  // how ~93% of positive judgements were being silently lost.
  const results = (judge as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const out: ProjectMapping[] = [];
  const seen = new Set<string>();
  for (const raw of results) {
    const verdict = MapVerdictSchema.safeParse(raw);
    if (!verdict.success) continue;
    const r = verdict.data;
    if (!r.applies) continue;
    const match = candidateNames.find((n) => n.toLowerCase() === r.project.toLowerCase());
    if (!match || seen.has(match.toLowerCase())) continue;
    const reason = r.reason.trim();
    // Mark the project seen BEFORE the quality check, so a degenerate first
    // verdict for a project can't be silently replaced by a later duplicate —
    // the model's first answer for a project is the one that counts.
    seen.add(match.toLowerCase());
    if (isDegenerateReason(reason)) continue;
    out.push({ project: match, confidence: r.confidence, reason: truncate(reason, REASON_MAX) });
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
    "Decide, for each project, whether this saved-video learning would actually change what its maintainer builds.",
    "",
    "Default to applies=false. The bar is not 'related to' — it is 'I would open the repo because of this'.",
    "",
    "REJECT (applies=false) when the only link is:",
    "  - a shared language, framework, or platform ('both use JavaScript', 'both are SvelteKit')",
    "  - a shared broad topic ('both involve AI', 'both are developer tools')",
    "  - subject matter the project merely PROCESSES or INGESTS rather than is built from",
    "  - a generic best practice that would apply equally to any software project",
    "  - a tool the project could theoretically adopt but has no stated need for",
    "",
    "ACCEPT (applies=true) only when you can name the concrete thing that changes: a specific",
    "technique to adopt, a named tool to install, a defect to avoid, or a decision to revisit.",
    "If your reason could be copy-pasted onto a different project unchanged, it is not specific enough — reject.",
    "",
    "CONFIDENCE — how sure you are of the verdict itself, NOT how strong the link is.",
    "A weak link is an applies=false, not a low-confidence applies=true.",
    "  high   = you would defend this call; another reviewer would reach the same one",
    "  medium = you believe it, but a reasonable reviewer could disagree",
    "  low    = you lean toward this verdict but are genuinely unsure",
    "Prefer low over flipping a borderline call — a low verdict is recorded and",
    "filtered separately downstream, so answering honestly costs nothing.",
    "",
    "For EACH project return applies (boolean), confidence (high|medium|low), and reason (<140 chars).",
    "The reason must state the SPECIFIC change, or — when rejecting — why the apparent link is superficial.",
    "",
    `LEARNING: ${video.title}`,
    `Takeaways: ${video.takeaways.slice(0, 5).join(" | ") || "-"}`,
    `Tools: ${video.toolNames.join(", ") || "-"}`,
    "",
    "PROJECTS:",
    ...projects.map(
      (p) => `- ${p.name}: ${p.description}${p.avoid ? `\n    NOT applicable merely because: ${p.avoid}` : ""}`,
    ),
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
  lockPath?: string;
  /** Triage state to gate on. Overridable so a test never reads the real
   *  CWD-relative videos/triage.json — an ambient file would silently gate the
   *  fixture's video ids out of the run. */
  triagePath?: string;
  embeddingModel?: string;
  embed?: EmbedFn;
  judge?: JudgeFn;
}

interface LoadedMappings {
  mappings: MappingSet;
  videoHashes: Record<string, string>;
}

function loadMappingsFile(mappingsPath: string, hash: string): LoadedMappings {
  try {
    const parsed = JSON.parse(fs.readFileSync(mappingsPath, "utf8")) as ProjectMappingsFile;
    // Portfolio changed, or the verdicts predate the current judging behaviour
    // → discard and re-map from scratch.
    if (parsed.portfolioHash !== hash || typeof parsed.mappings !== "object") return { mappings: {}, videoHashes: {} };
    if ((parsed.judgeVersion ?? 1) !== JUDGE_VERSION) {
      console.log(`  Judge version changed (${parsed.judgeVersion ?? 1} → ${JUDGE_VERSION}) — re-judging all videos.`);
      return { mappings: {}, videoHashes: {} };
    }
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
          // MAP_MODEL is a thinking model: reasoning tokens are drawn from this
          // same budget, so a low cap starves the actual JSON. Measured at 1024,
          // only 1 of 10 responses was schema-valid (avg 126 chars, truncated
          // mid-object); at 4096 it was 10 of 10. Do not lower without re-measuring.
          maxTokens: 4096,
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
  // Baselines come from every loaded video, not just the unjudged ones, so the
  // threshold means the same thing on an incremental run as on a full rebuild.
  // Below the floor the sample is too small for a spread to be meaningful, so
  // we stay on raw cosine.
  const useBaselines = videos.length >= CONFIG.MAP_BASELINE_MIN_VIDEOS;
  const baselines = useBaselines
    ? projectBaselines(
        videos.map((v) => v.vector),
        projectVecs,
      )
    : undefined;
  const floor = useBaselines ? CONFIG.MAP_PREFILTER_MIN_Z : CONFIG.MAP_PREFILTER_MIN;
  let judged = 0;
  for (const video of videos) {
    if (video.id in mappings && videoHashes[video.id] === video.docHash) continue; // unchanged, already judged
    const candidates = prefilter(video.vector, projectVecs, CONFIG.MAP_PREFILTER_TOPK, floor, baselines);
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
    // Triage gate: only apply-now / evaluate-later videos are candidates for
    // mapping — personal/entertainment content never reaches the judge, so it
    // can't be rationalized onto a project. No-op until triage has run.
    const applyGate = makeApplyGate(await loadTriageTiers(overrides.triagePath ?? CONFIG.STATE.TRIAGE));
    const videos = loadJudgeVideos(db, model).filter((v) => applyGate(v.id));
    const judge = overrides.judge ?? (neurolink ? neurolinkJudge(neurolink) : null);

    // Each checkpoint rewrites BOTH the table and the JSON so they never drift —
    // on a portfolio change or a crash, find_for_project (table) and the dashboard
    // (JSON) always reflect the same generation.
    const flush = async () => {
      writeMappingsTable(db, state.mappings);
      await saveMappingsFile(mappingsPath, {
        portfolioHash: hash,
        judgeVersion: JUDGE_VERSION,
        videoHashes: state.videoHashes,
        mappings: state.mappings,
      });
    };
    // Authoritative gate: drop mappings already written for videos the gate now
    // excludes (re-triaged to skip/reference-only, or predating triage), so a
    // re-triage retires the spurious mappings the triage feature was built to
    // eliminate instead of leaving them in the dashboard/briefs. No-op on an
    // empty tier map (applyGate admits everything until triage has run).
    let prunedMappings = 0;
    for (const id of Object.keys(state.mappings)) {
      if (!applyGate(id)) {
        delete state.mappings[id];
        delete state.videoHashes[id];
        prunedMappings++;
      }
    }
    if (prunedMappings > 0) console.log(`  Project mapping: pruned ${prunedMappings} stale mapping(s) now gated out.`);

    const judged = await judgeVideos(videos, projects, projectVecs, state, judge, flush);
    await flush();

    const totalMapped = Object.values(state.mappings).filter((m) => m.length > 0).length;
    console.log(`  Project mapping: ${videos.length} video(s), ${judged} judged this run, ${totalMapped} mapped.`);

    // IDEAS.md is written by the later Project Brief step (writeBriefIdeas) from
    // the synthesized brief, replacing the old per-learning drops.
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
