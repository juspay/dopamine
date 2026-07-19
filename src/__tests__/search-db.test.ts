import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { blobToVector, openSearchDb, vectorToBlob } from "../search/db.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-searchdb-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("schema migration", () => {
  it("adds project_vectors.model to a DB created by an older build", () => {
    const p = path.join(tmpDir, "search.db");
    // Simulate an old DB: project_vectors WITHOUT the model column.
    const old = new DatabaseSync(p);
    old.exec(
      "CREATE TABLE project_vectors (project TEXT PRIMARY KEY, hash TEXT NOT NULL, dims INTEGER NOT NULL, vector BLOB NOT NULL)",
    );
    old
      .prepare("INSERT INTO project_vectors (project, hash, dims, vector) VALUES (?,?,?,?)")
      .run("P", "h", 2, vectorToBlob([1, 2]));
    old.close();

    // Opening through openSearchDb heals the schema without losing the row.
    const db = openSearchDb(p);
    const cols = (db.prepare("PRAGMA table_info(project_vectors)").all() as { name: string }[]).map((c) => c.name);
    expect(cols).toContain("model");
    const row = db.prepare("SELECT model FROM project_vectors WHERE project = ?").get("P") as { model: string };
    expect(row.model).toBe(""); // healed rows default to empty → treated as a cache miss, re-embedded
    openSearchDb(p).close(); // idempotent: re-opening an already-healed DB is a no-op
    db.close();
  });
});

describe("openSearchDb", () => {
  it("creates the schema and is idempotent on reopen", () => {
    const p = path.join(tmpDir, "search.db");
    const db = openSearchDb(p);
    db.prepare("INSERT INTO index_meta (key, value) VALUES (?, ?)").run("k", "v");
    db.close();
    const db2 = openSearchDb(p);
    const row = db2.prepare("SELECT value FROM index_meta WHERE key = ?").get("k") as { value: string };
    expect(row.value).toBe("v");
    db2.close();
  });

  it("creates the project_vectors and project_mappings tables", () => {
    const p = path.join(tmpDir, "search.db");
    const db = openSearchDb(p);
    db.prepare(
      "INSERT INTO videos (id, title, category, creator, taken_at, source_url, verification, implementability, usefulness, takeaways_json, topics_json, doc_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run("v1", "t", "c", "u", "", "", "unknown", 0, "unknown", "[]", "[]", "h");
    db.prepare("INSERT INTO project_vectors (project, hash, dims, vector) VALUES (?,?,?,?)").run(
      "P",
      "h",
      2,
      vectorToBlob([1, 2]),
    );
    db.prepare("INSERT INTO project_mappings (video_id, project, confidence, reason) VALUES (?,?,?,?)").run(
      "v1",
      "P",
      "high",
      "why",
    );
    const row = db
      .prepare("SELECT confidence FROM project_mappings WHERE video_id = ? AND project = ?")
      .get("v1", "P") as {
      confidence: string;
    };
    expect(row.confidence).toBe("high");
    db.close();
  });

  it("round-trips a Float32 vector through a BLOB", () => {
    const p = path.join(tmpDir, "search.db");
    const db = openSearchDb(p);
    db.prepare(
      "INSERT INTO videos (id, title, category, creator, taken_at, source_url, verification, implementability, usefulness, takeaways_json, topics_json, doc_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run("v1", "t", "c", "u", "", "", "unknown", 0, "unknown", "[]", "[]", "h");
    const vec = [0.25, -1.5, 3.75];
    db.prepare("INSERT INTO embeddings (video_id, model, dims, vector, text_hash) VALUES (?,?,?,?,?)").run(
      "v1",
      "m",
      3,
      vectorToBlob(vec),
      "h",
    );
    const row = db.prepare("SELECT vector FROM embeddings WHERE video_id = ?").get("v1") as { vector: Uint8Array };
    expect(Array.from(blobToVector(row.vector))).toEqual(vec);
    db.close();
  });
});
