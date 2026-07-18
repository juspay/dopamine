import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { blobToVector, openSearchDb, vectorToBlob } from "../search/db.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-searchdb-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
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
