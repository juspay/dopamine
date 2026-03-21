/**
 * OrganizerAgent — port of organize_folders.py
 *
 * Reads classifications.json, creates videos/classified/{category}/ directories,
 * and creates relative symlinks pointing to ../../user_saved/{filename}.
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
  const categoryCounts = new Map<string, number>();

  for (const [filename, info] of Object.entries(classifications)) {
    const category = info.category || "Uncategorized";
    // Sanitize category name for use as directory name (mirrors Python)
    const safeCategory = category.replace(/\//g, "-").replace(/\\/g, "-");

    const categoryDir = path.join(classifiedDir, safeCategory);
    await fs.mkdir(categoryDir, { recursive: true });

    const symlinkPath = path.join(categoryDir, filename);
    // Relative target: from videos/classified/{category}/ back to videos/user_saved/
    const target = path.join("..", "..", "user_saved", filename);

    // Remove old symlink if it exists
    try {
      const stat = await fs.lstat(symlinkPath);
      if (stat.isSymbolicLink()) {
        await fs.unlink(symlinkPath);
      }
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
