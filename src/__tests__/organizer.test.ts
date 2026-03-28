/**
 * Tests for the organizer agent's symlink-creation logic.
 *
 * We test the pure logic (category sanitization, symlink target calculation)
 * and the actual symlink creation using a real temp directory.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/** Sanitize category name for directory use. (mirrors organizer.ts) */
function sanitizeCategory(category: string): string {
  return category.replace(/\//g, "-").replace(/\\/g, "-");
}

describe("sanitizeCategory()", () => {
  it("replaces forward slashes with hyphens", () => {
    expect(sanitizeCategory("AI/ML")).toBe("AI-ML");
  });

  it("replaces backslashes with hyphens", () => {
    expect(sanitizeCategory("Tech\\Coding")).toBe("Tech-Coding");
  });

  it("handles multiple slashes", () => {
    expect(sanitizeCategory("A/B/C")).toBe("A-B-C");
  });

  it("returns unchanged string when no slashes present", () => {
    expect(sanitizeCategory("Tech & Coding")).toBe("Tech & Coding");
  });

  it("handles empty string", () => {
    expect(sanitizeCategory("")).toBe("");
  });
});

describe("organizer symlink logic", () => {
  let tmpDir: string;
  let classifiedDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-org-"));
    classifiedDir = path.join(tmpDir, "classified");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates category directory and symlink", async () => {
    const classifications: Record<string, { category?: string }> = {
      "user_1.mp4": { category: "Tech & Coding" },
    };

    for (const [filename, info] of Object.entries(classifications)) {
      const category = info.category || "Uncategorized";
      const safeCategory = sanitizeCategory(category);
      const categoryDir = path.join(classifiedDir, safeCategory);
      await fs.mkdir(categoryDir, { recursive: true });

      const symlinkPath = path.join(categoryDir, filename);
      const target = path.join("..", "..", "user_saved", filename);
      await fs.symlink(target, symlinkPath);
    }

    // Verify directory was created
    const stat = await fs.stat(path.join(classifiedDir, "Tech & Coding"));
    expect(stat.isDirectory()).toBe(true);

    // Verify symlink was created
    const linkStat = await fs.lstat(
      path.join(classifiedDir, "Tech & Coding", "user_1.mp4")
    );
    expect(linkStat.isSymbolicLink()).toBe(true);

    // Verify symlink target
    const linkTarget = await fs.readlink(
      path.join(classifiedDir, "Tech & Coding", "user_1.mp4")
    );
    expect(linkTarget).toBe(path.join("..", "..", "user_saved", "user_1.mp4"));
  });

  it("creates multiple category directories", async () => {
    const classifications: Record<string, { category?: string }> = {
      "user_1.mp4": { category: "Tech" },
      "user_2.mp4": { category: "Food" },
      "user_3.mp4": { category: "Tech" },
    };

    const categoryCounts = new Map<string, number>();

    for (const [filename, info] of Object.entries(classifications)) {
      const category = info.category || "Uncategorized";
      const safeCategory = sanitizeCategory(category);
      const categoryDir = path.join(classifiedDir, safeCategory);
      await fs.mkdir(categoryDir, { recursive: true });

      const symlinkPath = path.join(categoryDir, filename);
      const target = path.join("..", "..", "user_saved", filename);
      await fs.symlink(target, symlinkPath);
      categoryCounts.set(safeCategory, (categoryCounts.get(safeCategory) ?? 0) + 1);
    }

    expect(categoryCounts.get("Tech")).toBe(2);
    expect(categoryCounts.get("Food")).toBe(1);

    // Verify both symlinks exist in Tech directory
    const techFiles = await fs.readdir(path.join(classifiedDir, "Tech"));
    expect(techFiles.sort()).toEqual(["user_1.mp4", "user_3.mp4"]);
  });

  it("uses 'Uncategorized' when category is missing", async () => {
    const classifications: Record<string, { category?: string }> = {
      "user_1.mp4": {},
    };

    for (const [filename, info] of Object.entries(classifications)) {
      const category = info.category || "Uncategorized";
      const safeCategory = sanitizeCategory(category);
      const categoryDir = path.join(classifiedDir, safeCategory);
      await fs.mkdir(categoryDir, { recursive: true });

      const symlinkPath = path.join(categoryDir, filename);
      const target = path.join("..", "..", "user_saved", filename);
      await fs.symlink(target, symlinkPath);
    }

    const stat = await fs.stat(path.join(classifiedDir, "Uncategorized"));
    expect(stat.isDirectory()).toBe(true);
  });

  it("replaces existing symlink", async () => {
    const categoryDir = path.join(classifiedDir, "Tech");
    await fs.mkdir(categoryDir, { recursive: true });

    const symlinkPath = path.join(categoryDir, "user_1.mp4");

    // Create first symlink
    await fs.symlink("old_target", symlinkPath);

    // Replace it (mirroring the organizer logic)
    const stat = await fs.lstat(symlinkPath);
    if (stat.isSymbolicLink()) {
      await fs.unlink(symlinkPath);
    }
    await fs.symlink("new_target", symlinkPath);

    const target = await fs.readlink(symlinkPath);
    expect(target).toBe("new_target");
  });

  it("sanitizes category with slashes for directory name", async () => {
    const category = "AI/ML";
    const safeCategory = sanitizeCategory(category);
    const categoryDir = path.join(classifiedDir, safeCategory);
    await fs.mkdir(categoryDir, { recursive: true });

    const stat = await fs.stat(path.join(classifiedDir, "AI-ML"));
    expect(stat.isDirectory()).toBe(true);
  });
});
