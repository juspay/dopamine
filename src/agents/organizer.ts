/**
 * OrganizerAgent — port of organize_folders.py
 *
 * Reads classifications.json, creates videos/classified/{category}/ directories,
 * and creates relative symlinks pointing to ../../{username}_saved/{filename}.
 * Removes old symlinks before creating new ones.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";

/** Minimal classification entry shape — only category is needed. */
interface ClassificationEntry {
  category?: string;
}

export async function runOrganizerAgent(): Promise<void> {
  console.log("\n=== OrganizerAgent ===");

  const classifications = await loadState<Record<string, ClassificationEntry>>(
    CONFIG.STATE.CLASSIFICATIONS,
    {}
  );

  console.log(`  classifications.json: ${Object.keys(classifications).length} entries`);

  const classifiedDir = CONFIG.OUTPUT.CLASSIFIED;
  // Derive the saved-videos dir name from config (e.g. "{username}_saved") rather
  // than hardcoding it — keeps the symlink target correct for any account.
  const savedDirName = path.basename(CONFIG.VIDEOS_DIR);
  const categoryCounts = new Map<string, number>();

  for (const [filename, info] of Object.entries(classifications)) {
    const category = info.category || "Uncategorized";
    // Sanitize category name for use as directory name (mirrors Python)
    const safeCategory = category.replace(/\//g, "-").replace(/\\/g, "-");

    const categoryDir = path.join(classifiedDir, safeCategory);
    await fs.mkdir(categoryDir, { recursive: true });

    const symlinkPath = path.join(categoryDir, filename);
    // Relative target: from videos/classified/{category}/ back to videos/{username}_saved/
    const target = path.join("..", "..", savedDirName, filename);

    // Remove whatever is at symlinkPath (symlink OR stale regular file).
    // Checking only for isSymbolicLink() and skipping other types causes
    // fs.symlink() to throw EEXIST, crashing the entire agent run.
    try {
      await fs.lstat(symlinkPath);
      // lstat succeeded — something exists; remove it unconditionally.
      await fs.unlink(symlinkPath);
    } catch {
      // File doesn't exist — that's fine
    }

    await fs.symlink(target, symlinkPath);
    categoryCounts.set(safeCategory, (categoryCounts.get(safeCategory) ?? 0) + 1);
  }

  // Print summary
  console.log("Videos organized by category:");
  console.log("-".repeat(40));
  const sortedCategories = [...categoryCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  for (const [category, count] of sortedCategories) {
    console.log(`  ${category}: ${count}`);
  }
  console.log("-".repeat(40));
  const total = [...categoryCounts.values()].reduce((a, b) => a + b, 0);
  console.log(`  Total: ${total}`);
}
