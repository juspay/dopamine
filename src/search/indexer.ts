// Side-effect import so .env loads before config.js evaluates (same rationale
// as runner.ts: ESM hoists imports, so dotenv.config() statements run too late).
import "dotenv/config";

import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createAIProvider } from "@juspay/neurolink";
import { normalizeToolUrl } from "../dashboard/data-builder.js";
import { deriveTitle } from "../dashboard/title.js";
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";
import { type Takeaway, takeawayText } from "../schemas/knowledge.js";
import { exponentialBackoff } from "../utils/rate-limit.js";
import { makeVideoId } from "../utils/video-id.js";
import { openSearchDb, vectorToBlob } from "./db.js";
import { composeDoc, sha256Hex } from "./doc.js";

// ---------------------------------------------------------------------------
// Narrow views of the pipeline state files (only the fields the index needs)
// ---------------------------------------------------------------------------

interface KbEntry {
  category?: string;
  transcript?: string | string[];
  visual_description?: string | Array<{ timestamp?: string; description?: string }>;
  key_takeaways?: Takeaway[];
  topics?: string[];
  username?: string;
}

interface ClassEntry {
  category?: string;
  tags?: string[];
  description?: string;
  code?: string | null;
  username?: string | null;
}

interface CatEntry {
  filename: string;
  description?: string;
  category?: string;
  tags?: string[];
  taken_at?: string;
  caption?: string;
  instagram_user?: string;
}

interface AnalysisEntry {
  actionable_items?: { name?: string; item_name?: string; type?: string; description?: string; url?: string }[];
  implementability_score?: number;
  usefulness_prediction?: string;
}

interface ResearchEntry {
  items?: { item_name?: string; url_status?: string }[];
}

interface VerifEntry {
  overall_score?: string;
}

interface LinksEntry {
  links?: { name?: string; url?: string; description?: string }[];
}

export interface SearchStates {
  knowledge: Record<string, KbEntry>;
  classifications: Record<string, ClassEntry>;
  catalog: CatEntry[];
  analysis: Record<string, AnalysisEntry>;
  research: Record<string, ResearchEntry>;
  verifications: Record<string, VerifEntry>;
  linksV2: Record<string, LinksEntry>;
}

export interface SearchToolRow {
  name: string;
  type: string;
  url: string;
  urlStatus: string;
  description: string;
}

export interface SearchRecord {
  id: string;
  title: string;
  category: string;
  creator: string;
  takenAt: string;
  sourceUrl: string;
  verification: string;
  implementability: number;
  usefulness: string;
  takeaways: string[];
  topics: string[];
  tags: string[];
  transcript: string;
  visualDescription: string;
  caption: string;
  tools: SearchToolRow[];
  /** Pre-joined tool text — FTS-indexed and part of the content hash. */
  toolsText: string;
  doc: string;
  /** Hash of the embedded doc — gates re-embedding (combined with model). */
  docHash: string;
  /** Hash of the exact FTS-indexed values — gates FTS row refresh. */
  contentHash: string;
}

function flattenText(raw: KbEntry["transcript"]): string {
  if (!raw) return "";
  const out = Array.isArray(raw) ? raw.map((i) => (typeof i === "string" ? i : String(i))).join("\n") : String(raw);
  return out.includes("[object Object]") ? "" : out;
}

function flattenVisual(raw: KbEntry["visual_description"]): string {
  if (!raw) return "";
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const ts = item.timestamp ?? "";
          const desc = item.description ?? "";
          return ts ? `[${ts}] ${desc}` : desc;
        }
        return String(item);
      })
      .join("\n");
  }
  const out = String(raw);
  return out.includes("[object Object]") ? "" : out;
}

function toolsFromAnalysis(anEntry: AnalysisEntry | undefined, urlStatusByName: Map<string, string>): SearchToolRow[] {
  const tools: SearchToolRow[] = [];
  for (const item of anEntry?.actionable_items ?? []) {
    const name = String(item.name ?? item.item_name ?? "").trim();
    if (!name) continue;
    tools.push({
      name,
      type: String(item.type ?? ""),
      url: normalizeToolUrl(item.url),
      urlStatus: urlStatusByName.get(name) ?? "",
      description: String(item.description ?? ""),
    });
  }
  return tools;
}

function toolsFromLinks(linksEntry: LinksEntry | undefined, existing: SearchToolRow[]): SearchToolRow[] {
  const tools: SearchToolRow[] = [];
  const seen = new Set(existing.map((t) => t.name.toLowerCase()));
  for (const link of linksEntry?.links ?? []) {
    const name = String(link.name ?? "").trim();
    const url = normalizeToolUrl(link.url);
    if (!name || url === "" || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    tools.push({ name, type: "link", url, urlStatus: "", description: String(link.description ?? "") });
  }
  return tools;
}

function buildToolRows(
  anEntry: AnalysisEntry | undefined,
  resEntry: ResearchEntry | undefined,
  linksEntry: LinksEntry | undefined,
): SearchToolRow[] {
  const urlStatusByName = new Map<string, string>();
  for (const ri of resEntry?.items ?? []) {
    if (ri.item_name) urlStatusByName.set(ri.item_name, ri.url_status ?? "");
  }
  const tools = toolsFromAnalysis(anEntry, urlStatusByName);
  return [...tools, ...toolsFromLinks(linksEntry, tools)];
}

type FtsSource = Pick<
  SearchRecord,
  "id" | "title" | "transcript" | "visualDescription" | "takeaways" | "topics" | "tags" | "toolsText" | "caption"
>;

/**
 * The exact 9 values inserted into videos_fts. The content hash is computed
 * over these same values, so the FTS refresh gate can never drift from what
 * FTS actually stores (unlike the embedding doc, which is truncated).
 */
function ftsValues(r: FtsSource): string[] {
  return [
    r.id,
    r.title,
    r.transcript,
    r.visualDescription,
    r.takeaways.join("\n"),
    r.topics.join("\n"),
    r.tags.join("\n"),
    r.toolsText,
    r.caption,
  ];
}

interface RecordInputs {
  filename: string;
  catEntry: CatEntry | undefined;
  classEntry: ClassEntry | undefined;
  kbEntry: KbEntry | undefined;
  anEntry: AnalysisEntry | undefined;
  verifEntry: VerifEntry | undefined;
  resEntry: ResearchEntry | undefined;
  linksEntry: LinksEntry | undefined;
}

/**
 * No verification record: distinguish "analysed but had no actionable items to
 * verify" (definitive → not_verifiable) from "never analysed" (→ unknown).
 * Mirrors the dashboard data-builder's derivation.
 */
function resolveVerification(anEntry: AnalysisEntry | undefined, verifEntry: VerifEntry | undefined): string {
  const analysedNoItems = !!anEntry && (anEntry.actionable_items?.length ?? 0) === 0;
  return verifEntry?.overall_score ?? (analysedNoItems ? "not_verifiable" : "unknown");
}

function buildRecord(inputs: RecordInputs): SearchRecord {
  const { filename, catEntry, classEntry, kbEntry, anEntry, verifEntry, resEntry, linksEntry } = inputs;

  const title = deriveTitle(catEntry?.description, takeawayText(kbEntry?.key_takeaways?.[0]), classEntry?.description);
  const category = classEntry?.category ?? kbEntry?.category ?? catEntry?.category ?? "Other";
  const creator = classEntry?.username ?? kbEntry?.username ?? catEntry?.instagram_user ?? "";
  const code = classEntry?.code ?? null;
  const verification = resolveVerification(anEntry, verifEntry);

  const tools = buildToolRows(anEntry, resEntry, linksEntry);
  const takeaways = (kbEntry?.key_takeaways ?? []).map(takeawayText);
  const topics = kbEntry?.topics ?? [];
  const tags = classEntry?.tags ?? catEntry?.tags ?? [];
  const transcript = flattenText(kbEntry?.transcript);
  const visualDescription = flattenVisual(kbEntry?.visual_description);
  const caption = catEntry?.caption ?? "";
  const toolsText = tools.map((t) => `${t.name} ${t.description}`).join("\n");

  const doc = composeDoc({
    title,
    category,
    tags,
    topics,
    takeaways,
    tools: tools.map((t) => ({ name: t.name, description: t.description })),
    description: classEntry?.description ?? "",
    transcript,
  });

  const base = {
    id: makeVideoId(filename),
    title,
    category,
    creator,
    takenAt: catEntry?.taken_at ?? "",
    sourceUrl: code ? `https://www.instagram.com/reel/${code}/` : "",
    verification,
    implementability: anEntry?.implementability_score ?? 0,
    usefulness: anEntry?.usefulness_prediction ?? "unknown",
    takeaways,
    topics,
    tags,
    transcript,
    visualDescription,
    caption,
    tools,
    toolsText,
  };

  return {
    ...base,
    doc,
    docHash: sha256Hex(doc),
    contentHash: sha256Hex(ftsValues(base).join("\u001F")),
  };
}

export function buildSearchRecords(states: SearchStates): SearchRecord[] {
  const catalogByFilename = new Map(states.catalog.map((c) => [c.filename, c]));
  const allFilenames = new Set<string>([
    ...states.catalog.map((c) => c.filename),
    ...Object.keys(states.classifications),
    ...Object.keys(states.knowledge),
  ]);

  const records: SearchRecord[] = [];
  for (const filename of allFilenames) {
    records.push(
      buildRecord({
        filename,
        catEntry: catalogByFilename.get(filename),
        classEntry: states.classifications[filename],
        kbEntry: states.knowledge[filename],
        anEntry: states.analysis[filename],
        verifEntry: states.verifications[filename],
        resEntry: states.research[filename],
        linksEntry: states.linksV2[filename],
      }),
    );
  }
  return records;
}

export type Embedder = (texts: string[]) => Promise<number[][]>;

const EMBED_BATCH_SIZE = 32;

export interface IndexMeta {
  /** generatedAt of the dashboard data the corpus state reflects (spec: corpus_generated_at). */
  corpusGeneratedAt?: string;
}

function pruneAndUpsert(db: DatabaseSync, records: SearchRecord[]): void {
  const currentIds = new Set(records.map((r) => r.id));

  db.exec("BEGIN");
  try {
    // Tools are cheap (~1k rows): rebuild wholesale instead of diffing.
    // Cleared first so pruning parent video rows doesn't trip the FK.
    db.exec("DELETE FROM tools");

    // Prune ids that no longer exist in the state files (children before parent —
    // node:sqlite enforces foreign keys by default)
    const existing = db.prepare("SELECT id FROM videos").all() as { id: string }[];
    const delVideo = db.prepare("DELETE FROM videos WHERE id = ?");
    const delFts = db.prepare("DELETE FROM videos_fts WHERE id = ?");
    const delEmb = db.prepare("DELETE FROM embeddings WHERE video_id = ?");
    for (const row of existing) {
      if (!currentIds.has(row.id)) {
        delEmb.run(row.id);
        delFts.run(row.id);
        delVideo.run(row.id);
      }
    }

    const insTool = db.prepare(
      "INSERT INTO tools (name, type, url, url_status, description, video_id) VALUES (?,?,?,?,?,?)",
    );
    const getHash = db.prepare("SELECT doc_hash FROM videos WHERE id = ?");
    const upsertVideo = db.prepare(`
      INSERT INTO videos (id, title, category, creator, taken_at, source_url, verification,
                          implementability, usefulness, takeaways_json, topics_json, doc_hash)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, category=excluded.category, creator=excluded.creator,
        taken_at=excluded.taken_at, source_url=excluded.source_url,
        verification=excluded.verification, implementability=excluded.implementability,
        usefulness=excluded.usefulness, takeaways_json=excluded.takeaways_json,
        topics_json=excluded.topics_json, doc_hash=excluded.doc_hash
    `);
    const insFts = db.prepare(`
      INSERT INTO videos_fts (id, title, transcript, visual_description, takeaways, topics, tags, tools, caption)
      VALUES (?,?,?,?,?,?,?,?,?)
    `);

    for (const r of records) {
      const prev = getHash.get(r.id) as { doc_hash: string } | undefined;
      const contentChanged = prev?.doc_hash !== r.contentHash;
      upsertVideo.run(
        r.id,
        r.title,
        r.category,
        r.creator,
        r.takenAt,
        r.sourceUrl,
        r.verification,
        r.implementability,
        r.usefulness,
        JSON.stringify(r.takeaways),
        JSON.stringify(r.topics),
        r.contentHash,
      );
      if (prev === undefined || contentChanged) {
        delFts.run(r.id);
        insFts.run(...ftsValues(r));
      }
      for (const t of r.tools) {
        insTool.run(t.name, t.type, t.url, t.urlStatus, t.description, r.id);
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

async function embedPending(db: DatabaseSync, records: SearchRecord[], embedder: Embedder, model: string) {
  const getEmb = db.prepare("SELECT text_hash FROM embeddings WHERE video_id = ?");
  const pending = records.filter((r) => {
    const row = getEmb.get(r.id) as { text_hash: string } | undefined;
    return row?.text_hash !== sha256Hex(model + r.doc);
  });

  const upsertEmb = db.prepare(`
    INSERT INTO embeddings (video_id, model, dims, vector, text_hash) VALUES (?,?,?,?,?)
    ON CONFLICT(video_id) DO UPDATE SET
      model=excluded.model, dims=excluded.dims, vector=excluded.vector, text_hash=excluded.text_hash
  `);

  let embedded = 0;
  let failed = 0;
  for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBED_BATCH_SIZE);
    const result = await exponentialBackoff(
      () => embedder(batch.map((r) => r.doc)),
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_BASE_DELAY_MS,
    );
    if (!result.success) {
      failed += batch.length;
      console.warn(`  Embedding batch failed (${batch.length} video(s) skipped): ${result.error.slice(0, 150)}`);
      continue;
    }
    for (const [j, vec] of result.value.entries()) {
      const r = batch[j];
      upsertEmb.run(r.id, model, vec.length, vectorToBlob(vec), sha256Hex(model + r.doc));
      embedded++;
    }
  }
  return { pending: pending.length, embedded, failed };
}

/**
 * Upsert records, prune deleted ids, and (re-)embed any record whose
 * model+doc hash is missing or stale. Embedding failures are logged and
 * skipped — the FTS side of the index still updates, and the next run
 * retries the missing vectors.
 */
export async function indexRecords(
  db: DatabaseSync,
  records: SearchRecord[],
  embedder: Embedder,
  model: string,
  meta: IndexMeta = {},
): Promise<void> {
  pruneAndUpsert(db, records);
  const { pending, embedded, failed } = await embedPending(db, records, embedder, model);

  const setMeta = db.prepare(
    "INSERT INTO index_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  );
  setMeta.run("built_at", new Date().toISOString());
  setMeta.run("model", model);
  if (meta.corpusGeneratedAt) {
    setMeta.run("corpus_generated_at", meta.corpusGeneratedAt);
  }

  console.log(
    `  Search index: ${records.length} video(s), ${pending} needed embedding (${embedded} embedded, ${failed} failed).`,
  );
}

async function defaultEmbedder(): Promise<Embedder> {
  const provider = await createAIProvider("vertex");
  return (texts: string[]) => provider.embedMany(texts, CONFIG.EMBEDDING_MODEL);
}

export async function runSearchIndexer(options: { dbPath?: string; embedder?: Embedder } = {}): Promise<void> {
  console.log("\n=== Search Indexer ===");
  const states: SearchStates = {
    knowledge: await loadState(CONFIG.STATE.KNOWLEDGE_BASE, {}),
    classifications: await loadState(CONFIG.STATE.CLASSIFICATIONS, {}),
    catalog: await loadState(CONFIG.STATE.CATALOG, []),
    analysis: await loadState(CONFIG.STATE.ANALYSIS, {}),
    research: await loadState(CONFIG.STATE.RESEARCH, {}),
    verifications: await loadState(CONFIG.STATE.VERIFICATIONS, {}),
    linksV2: await loadState(CONFIG.STATE.LINKS_V2, {}),
  };
  const dashboardMeta = await loadState<{ generatedAt?: string }>(path.resolve("dashboard", "data", "meta.json"), {});
  const records = buildSearchRecords(states);
  const db = openSearchDb(options.dbPath ?? CONFIG.STATE.SEARCH_DB);
  try {
    const embedder = options.embedder ?? (await defaultEmbedder());
    await indexRecords(db, records, embedder, CONFIG.EMBEDDING_MODEL, {
      corpusGeneratedAt: dashboardMeta.generatedAt,
    });
  } finally {
    db.close();
  }
}

if (process.argv[1]?.endsWith("indexer.js")) {
  runSearchIndexer().catch((err) => {
    console.error("Search indexer failed:", err);
    process.exit(1);
  });
}
