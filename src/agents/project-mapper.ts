// Side-effect import so .env loads before config.js evaluates (ESM hoisting).
import "dotenv/config";

import fs from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { NeuroLink } from "@juspay/neurolink";
import { CONFIG } from "../pipeline/config.js";
import { acquireLock, releaseLock } from "../pipeline/lock.js";
import { MapJudgeSchema, MapVerdictSchema } from "../schemas/mapping.js";
import { type Project, facetHash, loadProjects, portfolioHash, projectFacets } from "../schemas/projects.js";
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
 *  token budget, how confidence is assigned) so verdicts cached under the old
 *  behaviour are re-judged. Without this, a video recorded as "nothing applies"
 *  stays that way until its own content changes — which is how the truncation
 *  bug's empty results would have persisted. */
export const JUDGE_VERSION = 6;

export interface ProjectMappingsFile {
  portfolioHash: string;
  /** JUDGE_VERSION that produced these verdicts; a mismatch invalidates them. */
  judgeVersion?: number;
  /** videoId → search-index doc hash at judge time; a change re-judges the video. */
  videoHashes: Record<string, string>;
  mappings: MappingSet;
}

export interface ProjectVector {
  /** Vector identity: the project name for a base doc, `Name#i` for a facet.
   *  Baselines and the vector cache are keyed by this, never by `project` —
   *  a project with facets contributes several vectors and they must not
   *  collapse onto one baseline. */
  key: string;
  /** Project this vector votes for. Several vectors may share it. */
  project: string;
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
    out[p.key] = { mean, sd: Math.sqrt(variance) };
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
  return prefilterScored(videoVec, projects, topK, min, baselines).map((p) => p.name);
}

/** A candidate and how far above the project's own baseline it scored. */
export interface ScoredCandidate {
  name: string;
  score: number;
}

/**
 * As `prefilter`, but keeps the score — the only measured evidence we have
 * about how well a video matches a project, and the basis for confidence.
 *
 * A project scores as its BEST facet (max-pooling), so one project appears at
 * most once no matter how many vectors it contributed. Pooling happens before
 * the floor and topK are applied: otherwise a project with many facets would
 * crowd the shortlist with several copies of itself and push other projects out.
 */
export function prefilterScored(
  videoVec: ArrayLike<number>,
  projects: ProjectVector[],
  topK: number,
  min: number,
  baselines?: ProjectBaselines,
): ScoredCandidate[] {
  const best = new Map<string, number>();
  for (const p of projects) {
    const sim = cosineSim(videoVec, p.vector);
    const base = baselines?.[p.key];
    // sd of 0 means every video is equidistant from this project, so the
    // standardised score is undefined — leave it on the raw scale rather
    // than dividing by zero.
    const score = base && base.sd > 0 ? (sim - base.mean) / base.sd : sim;
    const prev = best.get(p.project);
    if (prev === undefined || score > prev) best.set(p.project, score);
  }
  return [...best.entries()]
    .map(([name, score]) => ({ name, score }))
    .filter((p) => p.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Confidence from measured evidence rather than the judge's self-report.
 *
 * The judge does not calibrate: across ~250 verdicts under three prompt
 * rubrics and both enum orderings it never once returned "low", and its
 * high/medium split is flat against the actual similarity — of the mappings
 * in the weakest z-band 78% were called high, against 86% in the strongest.
 * The standardised similarity, by contrast, is a real measurement, and it is
 * already computed to choose candidates.
 *
 * Cut points are the observed quartiles over 130 live mappings (p25 1.25,
 * median 1.50, p75 1.77), so a level names which quarter of the evidence a
 * mapping falls in: bottom quarter low, middle half medium, top quarter high.
 * All three bands are populated, which the judge's own labels never were.
 *
 * The quartiles rather than rounder numbers because `low` is a filter, not a
 * note — appliesToFor drops it from the dashboard chips and project-brief
 * gates actions at medium+. Simulated over the same 130 mappings:
 *
 *   cut points        high/med/low   videos keeping a chip   feeds briefs
 *   2.00 / 1.50       21/ 44/ 65     45 of 80                65
 *   1.75 / 1.25       36/ 61/ 33     66 of 80                97
 *   2.50 / 1.75        3/ 33/ 94     30 of 80                36
 *
 * At 2.00/1.50 thirty-five videos lose every chip they have, which trades a
 * dead confidence signal for a hole in coverage. The quartile split makes the
 * filter mean something while leaving the mappings themselves visible.
 */
export function confidenceFromScore(score: number): Confidence {
  if (score >= CONFIDENCE_HIGH_Z) return "high";
  if (score >= CONFIDENCE_MEDIUM_Z) return "medium";
  return "low";
}

/**
 * Refitted against 78 human-labelled videos. The previous cut points were
 * quartiles of the corpus's own score distribution, which describes the shape
 * of the data and says nothing about whether a mapping is right. Measured
 * against how often a human actually agreed:
 *
 *   band          n     agreed
 *   0.50–1.25    192      17%
 *   1.25–2.50    170      36%
 *   >= 2.50       14      86%
 *
 * The old high cut of 1.75 pooled a 21%-agreement band with an 86% one and
 * landed at 44% overall — six points from medium's 38%, so "high" carried
 * almost no information. Moving it to 2.50 separates the buckets properly.
 * `high` is now rare and genuinely trustworthy rather than merely common.
 */
export const CONFIDENCE_HIGH_Z = 2.5;
/** Below this, agreement collapses to ~17% — the level `low` is meant to mark. */
export const CONFIDENCE_MEDIUM_Z = 1.25;

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
export function parseJudgement(
  judge: unknown,
  candidateNames: string[],
  /** name → prefilter score, the sole source of confidence. A candidate always
   *  carries one; a missing score means bookkeeping drift, not a weak match, so
   *  it lands in `low` — recorded, but filtered out of chips and brief actions
   *  rather than silently promoted. */
  scores: Record<string, number>,
): ProjectMapping[] {
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
    const score = scores[match];
    const confidence = score === undefined ? "low" : confidenceFromScore(score);
    out.push({ project: match, confidence, reason: truncate(reason, REASON_MAX) });
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
    "These projects are NOT alternatives and you are NOT picking the best fit. Judge each one",
    "on its own, as if it were the only project on the page. One learning routinely applies to",
    "several: an open-source agent framework can change the agent runtime AND the model layer",
    "that would wrap it AND the mobile client that would drive it. Accepting one project is not",
    "evidence against any other, and there is no limit on how many may apply.",
    "",
    "The bar is not 'related to' — it is 'a maintainer would act on this'. Do not require a",
    "stated need: a tool this project could adopt to do its job better DOES apply, which is most",
    "of what is worth surfacing.",
    "",
    "REJECT (applies=false) when the only link is:",
    "  - a shared language, framework, or platform ('both use JavaScript', 'both are SvelteKit')",
    "  - a shared broad topic ('both involve AI', 'both are developer tools')",
    "  - subject matter the project merely PROCESSES or INGESTS rather than is built from",
    "  - a generic best practice that would apply equally to any software project",
    "",
    "ACCEPT (applies=true) when you can name the concrete thing that changes: a specific",
    "technique to adopt, a named tool to install, a defect to avoid, or a decision to revisit.",
    "The same concrete thing may genuinely serve several of these projects — a shared reason",
    "across two projects is a real overlap, not a sign the reason is too vague. What makes a",
    "reason too vague is naming nothing specific at all.",
    "",
    "A weak link is an applies=false. There is no partial credit and nothing downstream",
    "rescues a borderline accept — the strength of each accepted match is measured",
    "separately, not taken from your answer. Judge only whether it applies at all.",
    "",
    "For EACH project return applies (boolean) and reason (<140 chars).",
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
  // Keyed by facet, not project: dropping a facet must evict exactly its vector
  // and leave the project's others alone.
  const facets = projects.flatMap(projectFacets);
  const currentKeys = new Set(facets.map((f) => f.key));
  const existing = db.prepare("SELECT project FROM project_vectors").all() as { project: string }[];
  const delVec = db.prepare("DELETE FROM project_vectors WHERE project = ?");
  for (const row of existing) {
    if (!currentKeys.has(row.project)) delVec.run(row.project);
  }

  const getVec = db.prepare("SELECT hash, model, vector FROM project_vectors WHERE project = ?");
  const upsert = db.prepare(`
    INSERT INTO project_vectors (project, hash, model, dims, vector) VALUES (?,?,?,?,?)
    ON CONFLICT(project) DO UPDATE SET hash=excluded.hash, model=excluded.model, dims=excluded.dims, vector=excluded.vector
  `);

  const out: ProjectVector[] = [];
  for (const f of facets) {
    const hash = facetHash(f);
    const cached = getVec.get(f.key) as { hash: string; model: string; vector: Uint8Array } | undefined;
    if (cached && cached.hash === hash && cached.model === model) {
      out.push({ key: f.key, project: f.project, vector: blobToVector(cached.vector) });
      continue;
    }
    const vec = await embed(f.text);
    upsert.run(f.key, hash, model, vec.length, vectorToBlob(vec));
    out.push({ key: f.key, project: f.project, vector: Float32Array.from(vec) });
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
    const scored = prefilterScored(video.vector, projectVecs, CONFIG.MAP_PREFILTER_TOPK, floor, baselines);
    const candidates = scored.map((c) => c.name);
    if (candidates.length === 0 || judge === null) {
      mappings[video.id] = [];
      videoHashes[video.id] = video.docHash;
      continue;
    }
    const scores = Object.fromEntries(scored.map((c) => [c.name, c.score]));
    const candidateProjects = projects.filter((p) => candidates.includes(p.name));
    try {
      mappings[video.id] = parseJudgement(await judge(judgePrompt(video, candidateProjects)), candidates, scores);
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
