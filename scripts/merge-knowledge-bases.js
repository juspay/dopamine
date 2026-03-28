#!/usr/bin/env node
/**
 * merge-knowledge-bases.js
 *
 * Merges videos/knowledge_base.json and videos/knowledge_base_batch2.json
 * into a single videos/knowledge_base.json.
 *
 * Batch2 entries override batch1 entries on key collision (same as the
 * runtime spread `{ ...kb1, ...kb2 }` that was used before).
 *
 * After merging, knowledge_base_batch2.json is renamed to
 * knowledge_base_batch2.json.bak so it is no longer loaded.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const videosDir = path.resolve(__dirname, "..", "videos");

const kb1Path = path.join(videosDir, "knowledge_base.json");
const kb2Path = path.join(videosDir, "knowledge_base_batch2.json");
const backupPath = path.join(videosDir, "knowledge_base_batch2.json.bak");

// Load both files
const kb1 = JSON.parse(fs.readFileSync(kb1Path, "utf8"));
const kb2Exists = fs.existsSync(kb2Path);

if (!kb2Exists) {
  console.log("knowledge_base_batch2.json not found — nothing to merge.");
  process.exit(0);
}

const kb2 = JSON.parse(fs.readFileSync(kb2Path, "utf8"));

const kb1Count = Object.keys(kb1).length;
const kb2Count = Object.keys(kb2).length;

console.log(`knowledge_base.json:        ${kb1Count} entries`);
console.log(`knowledge_base_batch2.json: ${kb2Count} entries`);

// Merge: batch2 entries win on collision (matches previous runtime behaviour)
const merged = { ...kb1, ...kb2 };
const mergedCount = Object.keys(merged).length;
const overlap = kb1Count + kb2Count - mergedCount;

console.log(`Merged result:              ${mergedCount} entries (${overlap} overlapping keys)`);

// Write merged file
fs.writeFileSync(kb1Path, JSON.stringify(merged, null, 2), "utf8");
console.log(`Wrote merged knowledge_base.json`);

// Backup batch2
fs.renameSync(kb2Path, backupPath);
console.log(`Renamed knowledge_base_batch2.json -> knowledge_base_batch2.json.bak`);

console.log("\nDone! The codebase now uses a single knowledge_base.json.");
