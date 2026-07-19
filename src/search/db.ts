import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  creator TEXT NOT NULL,
  taken_at TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  verification TEXT NOT NULL DEFAULT 'unknown',
  implementability REAL NOT NULL DEFAULT 0,
  usefulness TEXT NOT NULL DEFAULT 'unknown',
  takeaways_json TEXT NOT NULL DEFAULT '[]',
  topics_json TEXT NOT NULL DEFAULT '[]',
  doc_hash TEXT NOT NULL DEFAULT ''
);
CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
  id UNINDEXED, title, transcript, visual_description,
  takeaways, topics, tags, tools, caption,
  tokenize = 'porter unicode61'
);
CREATE TABLE IF NOT EXISTS embeddings (
  video_id TEXT PRIMARY KEY REFERENCES videos(id),
  model TEXT NOT NULL,
  dims INTEGER NOT NULL,
  vector BLOB NOT NULL,
  text_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tools (
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  url_status TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  video_id TEXT NOT NULL REFERENCES videos(id)
);
CREATE INDEX IF NOT EXISTS tools_video_id ON tools(video_id);
CREATE TABLE IF NOT EXISTS index_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_vectors (
  project TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  dims INTEGER NOT NULL,
  vector BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS project_mappings (
  video_id TEXT NOT NULL REFERENCES videos(id),
  project TEXT NOT NULL,
  confidence TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (video_id, project)
);
CREATE INDEX IF NOT EXISTS project_mappings_project ON project_mappings(project);
`;

/**
 * Columns added to an existing table AFTER its initial ship. `CREATE TABLE IF
 * NOT EXISTS` never alters a table that already exists, so a DB created by an
 * older build keeps the old columns and any query for the new one throws
 * "no such column". Each entry is idempotently ALTERed in on open — a no-op
 * when the column is already present (fresh DBs), a heal when it isn't.
 * Table and column names are hardcoded literals (no injection surface).
 */
const ADDED_COLUMNS: { table: string; column: string; decl: string }[] = [
  { table: "project_vectors", column: "model", decl: "TEXT NOT NULL DEFAULT ''" },
];

/** Migrate in any columns added after a table's original creation. */
export function ensureColumns(db: DatabaseSync): void {
  for (const { table, column, decl } of ADDED_COLUMNS) {
    const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
    }
  }
}

export function openSearchDb(dbPath: string, opts: { readonly?: boolean } = {}): DatabaseSync {
  if (opts.readonly) {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    // Wait out concurrent indexer writes instead of failing with SQLITE_BUSY.
    db.exec("PRAGMA busy_timeout = 5000");
    return db;
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  // WAL lets the MCP server keep reading while the pipeline's indexer writes.
  // synchronous=NORMAL is the standard WAL pairing: it skips per-transaction
  // fsyncs (painfully slow on CI runners) and is safe for a rebuildable index.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(SCHEMA);
  ensureColumns(db);
  return db;
}

/** True when the search schema exists (guards readonly opens of empty/foreign files). */
export function hasSearchSchema(db: DatabaseSync): boolean {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type IN ('table','view') AND name = 'videos'")
    .get() as { n: number };
  return row.n > 0;
}

export function vectorToBlob(vec: readonly number[]): Uint8Array {
  return new Uint8Array(Float32Array.from(vec).buffer);
}

/** Copies before viewing: SQLite BLOBs are not guaranteed 4-byte aligned. */
export function blobToVector(blob: Uint8Array): Float32Array {
  const copy = blob.slice();
  return new Float32Array(copy.buffer, 0, copy.byteLength / 4);
}
