import type { DatabaseSync } from "node:sqlite";
import { blobToVector } from "./db.js";
import { cosineSim, rrfMerge } from "./rank.js";

const CANDIDATE_POOL = 50;

export interface SearchHit {
  id: string;
  title: string;
  category: string;
  creator: string;
  takeaways: string[];
  topTools: string[];
  verification: string;
  sourceUrl: string;
  score: number;
}

export interface SearchResult {
  mode: "hybrid" | "fts_only";
  hits: SearchHit[];
}

/**
 * Neutralise FTS5 operators by quoting every term; OR them for recall (bm25
 * ranks). Quoting alone makes AND/OR/NOT literal search terms, so nothing is
 * dropped from the user's query.
 */
export function toFtsQuery(raw: string): string {
  const terms = raw
    .split(/\s+/)
    .map((t) => t.replace(/["']/g, ""))
    .filter((t) => t !== "");
  if (terms.length === 0) return '""';
  return terms.map((t) => `"${t}"`).join(" OR ");
}

/** Clamp an untrusted limit-ish value to a sane positive integer. */
export function clampLimit(raw: unknown, fallback: number, max = 100): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(raw)));
}

interface VideoRow {
  id: string;
  title: string;
  category: string;
  creator: string;
  taken_at: string;
  source_url: string;
  verification: string;
  implementability: number;
  usefulness: string;
  takeaways_json: string;
  topics_json: string;
}

function hydrateHit(db: DatabaseSync, id: string, score: number): SearchHit | null {
  const row = db.prepare("SELECT * FROM videos WHERE id = ?").get(id) as VideoRow | undefined;
  if (!row) return null;
  const toolRows = db.prepare("SELECT name FROM tools WHERE video_id = ? LIMIT 3").all(id) as { name: string }[];
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    creator: row.creator,
    takeaways: JSON.parse(row.takeaways_json) as string[],
    topTools: toolRows.map((t) => t.name),
    verification: row.verification,
    sourceUrl: row.source_url,
    score,
  };
}

export function hybridSearch(
  db: DatabaseSync,
  queryText: string,
  queryVector: ArrayLike<number> | null,
  opts: { category?: string; limit?: number; queryModel?: string } = {},
): SearchResult {
  const limit = clampLimit(opts.limit, 10);

  const ftsIds = (
    db
      .prepare("SELECT id FROM videos_fts WHERE videos_fts MATCH ? ORDER BY bm25(videos_fts) LIMIT ?")
      .all(toFtsQuery(queryText), CANDIDATE_POOL) as { id: string }[]
  ).map((r) => r.id);

  let semanticIds: string[] = [];
  if (queryVector !== null) {
    // Cosine across embedding models is meaningless — when the caller says which
    // model produced the query vector, only compare against same-model rows.
    const embRows = (
      opts.queryModel
        ? db.prepare("SELECT video_id, vector FROM embeddings WHERE model = ?").all(opts.queryModel)
        : db.prepare("SELECT video_id, vector FROM embeddings").all()
    ) as {
      video_id: string;
      vector: Uint8Array;
    }[];
    semanticIds = embRows
      .map((r) => ({ id: r.video_id, sim: cosineSim(queryVector, blobToVector(r.vector)) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, CANDIDATE_POOL)
      .map((r) => r.id);
  }

  // "hybrid" only when semantic retrieval actually contributed candidates —
  // a query vector whose model matches no stored rows is keyword-only in effect.
  const usedSemantic = semanticIds.length > 0;
  const merged = rrfMerge(usedSemantic ? [ftsIds, semanticIds] : [ftsIds]);

  const hits: SearchHit[] = [];
  for (const { id, score } of merged) {
    const hit = hydrateHit(db, id, score);
    if (!hit) continue;
    if (opts.category && hit.category !== opts.category) continue;
    hits.push(hit);
    if (hits.length >= limit) break;
  }
  return { mode: usedSemantic ? "hybrid" : "fts_only", hits };
}

export interface VideoDetail extends Omit<SearchHit, "score" | "topTools"> {
  takenAt: string;
  implementability: number;
  usefulness: string;
  topics: string[];
  transcript: string;
  visualDescription: string;
  caption: string;
  tools: { name: string; type: string; url: string; urlStatus: string; description: string }[];
}

export function getVideo(db: DatabaseSync, id: string): VideoDetail | null {
  const row = db.prepare("SELECT * FROM videos WHERE id = ?").get(id) as VideoRow | undefined;
  if (!row) return null;
  const fts = db.prepare("SELECT transcript, visual_description, caption FROM videos_fts WHERE id = ?").get(id) as
    | { transcript: string; visual_description: string; caption: string }
    | undefined;
  const tools = db.prepare("SELECT name, type, url, url_status, description FROM tools WHERE video_id = ?").all(id) as {
    name: string;
    type: string;
    url: string;
    url_status: string;
    description: string;
  }[];
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    creator: row.creator,
    takenAt: row.taken_at,
    sourceUrl: row.source_url,
    verification: row.verification,
    implementability: row.implementability,
    usefulness: row.usefulness,
    takeaways: JSON.parse(row.takeaways_json) as string[],
    topics: JSON.parse(row.topics_json) as string[],
    transcript: fts?.transcript ?? "",
    visualDescription: fts?.visual_description ?? "",
    caption: fts?.caption ?? "",
    tools: tools.map((t) => ({
      name: t.name,
      type: t.type,
      url: t.url,
      urlStatus: t.url_status,
      description: t.description,
    })),
  };
}

export interface ToolHit {
  name: string;
  type: string;
  url: string;
  urlStatus: string;
  description: string;
  videoId: string;
  videoTitle: string;
}

export function searchTools(db: DatabaseSync, query: string, type?: string, limit = 15): ToolHit[] {
  const safeLimit = clampLimit(limit, 15);
  const like = `%${query.toLowerCase()}%`;
  const rows = db
    .prepare(`
      SELECT t.name, t.type, t.url, t.url_status, t.description, t.video_id, v.title AS video_title
      FROM tools t JOIN videos v ON v.id = t.video_id
      WHERE (LOWER(t.name) LIKE ? OR LOWER(t.description) LIKE ?)
        AND (? = '' OR t.type = ?)
      ORDER BY CASE WHEN t.url_status = 'live' THEN 0 ELSE 1 END, t.name
      LIMIT ?
    `)
    .all(like, like, type ?? "", type ?? "", safeLimit) as {
    name: string;
    type: string;
    url: string;
    url_status: string;
    description: string;
    video_id: string;
    video_title: string;
  }[];
  return rows.map((r) => ({
    name: r.name,
    type: r.type,
    url: r.url,
    urlStatus: r.url_status,
    description: r.description,
    videoId: r.video_id,
    videoTitle: r.video_title,
  }));
}

export type Confidence = "high" | "medium" | "low";
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

export interface ProjectHit {
  videoId: string;
  title: string;
  confidence: Confidence;
  reason: string;
  takeaways: string[];
  topTools: string[];
  verification: string;
  sourceUrl: string;
}

/** Learnings mapped to `project` (case-insensitive), best confidence first. */
export function findForProject(db: DatabaseSync, project: string, minConfidence: Confidence = "low"): ProjectHit[] {
  const floor = CONFIDENCE_RANK[minConfidence];
  const rows = db
    .prepare(`
      SELECT m.video_id, m.confidence, m.reason, v.title, v.verification, v.source_url, v.takeaways_json,
             v.implementability
      FROM project_mappings m JOIN videos v ON v.id = m.video_id
      WHERE LOWER(m.project) = LOWER(?)
    `)
    .all(project) as {
    video_id: string;
    confidence: Confidence;
    reason: string;
    title: string;
    verification: string;
    source_url: string;
    takeaways_json: string;
    implementability: number;
  }[];
  const toolStmt = db.prepare("SELECT name FROM tools WHERE video_id = ? LIMIT 3");
  return rows
    .filter((r) => (CONFIDENCE_RANK[r.confidence] ?? 0) >= floor)
    .sort(
      (a, b) =>
        (CONFIDENCE_RANK[b.confidence] ?? 0) - (CONFIDENCE_RANK[a.confidence] ?? 0) ||
        b.implementability - a.implementability,
    )
    .map((r) => ({
      videoId: r.video_id,
      title: r.title,
      confidence: r.confidence,
      reason: r.reason,
      takeaways: JSON.parse(r.takeaways_json) as string[],
      topTools: (toolStmt.all(r.video_id) as unknown as { name: string }[]).map((t) => t.name),
      verification: r.verification,
      sourceUrl: r.source_url,
    }));
}

/** Distinct project names present in the mapping table (for unknown-project help). */
export function listMappedProjects(db: DatabaseSync): string[] {
  return (
    db.prepare("SELECT DISTINCT project FROM project_mappings ORDER BY project").all() as { project: string }[]
  ).map((r) => r.project);
}

export interface CorpusStats {
  totalVideos: number;
  totalTools: number;
  categories: { name: string; count: number }[];
  embeddedVideos: number;
  builtAt: string;
  corpusGeneratedAt: string;
  model: string;
}

export function stats(db: DatabaseSync): CorpusStats {
  const total = (db.prepare("SELECT COUNT(*) AS n FROM videos").get() as { n: number }).n;
  const tools = (db.prepare("SELECT COUNT(*) AS n FROM tools").get() as { n: number }).n;
  const embedded = (db.prepare("SELECT COUNT(*) AS n FROM embeddings").get() as { n: number }).n;
  const categories = db
    .prepare("SELECT category AS name, COUNT(*) AS count FROM videos GROUP BY category ORDER BY count DESC")
    .all() as { name: string; count: number }[];
  const metaRows = db.prepare("SELECT key, value FROM index_meta").all() as { key: string; value: string }[];
  const meta = new Map(metaRows.map((m) => [m.key, m.value]));
  return {
    totalVideos: total,
    totalTools: tools,
    categories,
    embeddedVideos: embedded,
    builtAt: meta.get("built_at") ?? "",
    corpusGeneratedAt: meta.get("corpus_generated_at") ?? "",
    model: meta.get("model") ?? "",
  };
}
