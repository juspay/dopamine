/**
 * compare-instagram-state.ts
 *
 * The check behind "Instagram does not change": for every key that exists in the five
 * Instagram state files before a change, its record must be byte-identical afterwards.
 * New keys are ignored.
 *
 *   npm run check:instagram -- <beforeDir> <afterDir>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FILES = ["metadata.json", "classifications.json", "knowledge_base.json", "links_v2.json", "triage.json"] as const;

export interface InvariantReport {
  checkedKeys: number;
  /** "<file>:<key>" for each key whose value differs. */
  changed: string[];
  /** "<file>:<key>" for each key that is gone, or whose file is gone or unreadable. */
  removed: string[];
  ok: boolean;
}

/** key -> serialized value, or null when the file is missing or unreadable. */
async function readRecords(dir: string, file: string): Promise<Map<string, string> | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
  } catch {
    return null;
  }
  const records = new Map<string, string>();
  if (Array.isArray(parsed)) {
    // metadata.json: an array keyed by pk (or by id for an already-mapped item).
    parsed.forEach((entry, index) => {
      const e = entry as { pk?: unknown; id?: unknown } | null;
      const key = String(e?.pk ?? e?.id ?? `#${index}`);
      records.set(key, JSON.stringify(entry));
    });
  } else if (parsed !== null && typeof parsed === "object") {
    for (const [key, value] of Object.entries(parsed)) records.set(key, JSON.stringify(value));
  }
  return records;
}

export async function compareInstagramState(beforeDir: string, afterDir: string): Promise<InvariantReport> {
  const changed: string[] = [];
  const removed: string[] = [];
  let checkedKeys = 0;
  for (const file of FILES) {
    const before = await readRecords(beforeDir, file);
    if (before === null) continue;
    const after = (await readRecords(afterDir, file)) ?? new Map<string, string>();
    for (const [key, value] of before) {
      checkedKeys++;
      const now = after.get(key);
      if (now === undefined) removed.push(`${file}:${key}`);
      else if (now !== value) changed.push(`${file}:${key}`);
    }
  }
  return { checkedKeys, changed, removed, ok: changed.length === 0 && removed.length === 0 };
}

async function main(): Promise<void> {
  const [beforeDir, afterDir] = process.argv.slice(2);
  if (!beforeDir || !afterDir) {
    console.error("Usage: npm run check:instagram -- <beforeDir> <afterDir>");
    process.exit(2);
  }
  const report = await compareInstagramState(beforeDir, afterDir);
  console.log(`Checked ${report.checkedKeys} instagram records.`);
  for (const key of report.changed) console.log(`  CHANGED  ${key}`);
  for (const key of report.removed) console.log(`  REMOVED  ${key}`);
  console.log(report.ok ? "OK: every existing record is byte-identical." : "NOT OK: instagram records differ.");
  process.exit(report.ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err: unknown) => {
    console.error("check:instagram failed:", err);
    process.exit(2);
  });
}
