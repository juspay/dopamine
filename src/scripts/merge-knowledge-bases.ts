/**
 * merge-knowledge-bases.ts
 *
 * Merges videos/knowledge_base.json and videos/knowledge_base_batch2.json
 * into a single videos/knowledge_base.json.
 *
 * Batch2 entries override batch1 entries on key collision.
 * After merging, knowledge_base_batch2.json is renamed to .bak.
 */

import fs from "node:fs";
import path from "node:path";

const videosDir = path.resolve("videos");
const kb1Path   = path.join(videosDir, "knowledge_base.json");
const kb2Path   = path.join(videosDir, "knowledge_base_batch2.json");
const backupPath = path.join(videosDir, "knowledge_base_batch2.json.bak");

if (!fs.existsSync(kb2Path)) {
  console.log("knowledge_base_batch2.json not found — nothing to merge.");
  process.exit(0);
}

const kb1 = JSON.parse(fs.readFileSync(kb1Path, "utf8")) as Record<string, unknown>;
const kb2 = JSON.parse(fs.readFileSync(kb2Path, "utf8")) as Record<string, unknown>;

const kb1Count = Object.keys(kb1).length;
const kb2Count = Object.keys(kb2).length;

console.log(`knowledge_base.json:        ${kb1Count} entries`);
console.log(`knowledge_base_batch2.json: ${kb2Count} entries`);

const merged = { ...kb1, ...kb2 };
const mergedCount = Object.keys(merged).length;
const overlap = kb1Count + kb2Count - mergedCount;

console.log(`Merged result:              ${mergedCount} entries (${overlap} overlapping keys)`);

fs.writeFileSync(kb1Path, JSON.stringify(merged, null, 2), "utf8");
console.log(`Wrote merged knowledge_base.json`);

fs.renameSync(kb2Path, backupPath);
console.log(`Renamed knowledge_base_batch2.json -> knowledge_base_batch2.json.bak`);

console.log("\nDone! The codebase now uses a single knowledge_base.json.");
