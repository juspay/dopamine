import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getVideoFiles, extractPkFromFilename } from "../utils/video.js";

describe("extractPkFromFilename()", () => {
  it("extracts numeric pk from standard filename", () => {
    expect(extractPkFromFilename("username_12345.mp4")).toBe("12345");
  });

  it("extracts pk when username contains underscores", () => {
    expect(extractPkFromFilename("user_name_67890.mp4")).toBe("67890");
  });

  it("returns null when no underscore exists", () => {
    expect(extractPkFromFilename("nounderscores.mp4")).toBeNull();
  });

  it("returns null when part after last underscore is not numeric", () => {
    expect(extractPkFromFilename("user_abc.mp4")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractPkFromFilename("")).toBeNull();
  });

  it("handles case-insensitive .MP4 extension", () => {
    expect(extractPkFromFilename("user_999.MP4")).toBe("999");
  });

  it("returns null for non-.mp4 extension with underscore and digits", () => {
    // The function strips .mp4 specifically, so .avi stays and "123.avi" is non-numeric
    expect(extractPkFromFilename("user_123.avi")).toBeNull();
  });

  it("handles very large pk numbers", () => {
    expect(extractPkFromFilename("user_99999999999999.mp4")).toBe("99999999999999");
  });
});

describe("getVideoFiles()", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns .mp4 files sorted alphabetically as absolute paths", async () => {
    await fs.writeFile(path.join(tmpDir, "b_2.mp4"), "");
    await fs.writeFile(path.join(tmpDir, "a_1.mp4"), "");
    await fs.writeFile(path.join(tmpDir, "c_3.mp4"), "");

    const result = await getVideoFiles(tmpDir);
    expect(result).toEqual([
      path.join(tmpDir, "a_1.mp4"),
      path.join(tmpDir, "b_2.mp4"),
      path.join(tmpDir, "c_3.mp4"),
    ]);
  });

  it("excludes non-mp4 files", async () => {
    await fs.writeFile(path.join(tmpDir, "video.mp4"), "");
    await fs.writeFile(path.join(tmpDir, "image.jpg"), "");
    await fs.writeFile(path.join(tmpDir, "readme.txt"), "");

    const result = await getVideoFiles(tmpDir);
    expect(result).toEqual([path.join(tmpDir, "video.mp4")]);
  });

  it("handles case-insensitive .MP4 extension", async () => {
    await fs.writeFile(path.join(tmpDir, "vid.MP4"), "");
    const result = await getVideoFiles(tmpDir);
    expect(result).toEqual([path.join(tmpDir, "vid.MP4")]);
  });

  it("returns empty array for empty directory", async () => {
    const result = await getVideoFiles(tmpDir);
    expect(result).toEqual([]);
  });

  it("returns empty array for non-existent directory", async () => {
    const result = await getVideoFiles("/nonexistent/path/12345");
    expect(result).toEqual([]);
  });
});
