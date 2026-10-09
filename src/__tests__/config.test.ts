// src/__tests__/config.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";

describe("CONFIG — multi-provider additions", () => {
  it("YT_DOWNLOAD_MAX_SECONDS defaults to 300", () => {
    expect(CONFIG.YT_DOWNLOAD_MAX_SECONDS).toBe(300);
  });
  it("SOURCES defaults to 'instagram'", () => {
    expect(CONFIG.SOURCES).toBe("instagram");
  });
  it("IG_COLLECTOR defaults to 'instagrapi'", () => {
    expect(CONFIG.IG_COLLECTOR).toBe("instagrapi");
  });
  it("YOUTUBE_VIDEOS_DIR is absolute and ends with videos/youtube", () => {
    expect(path.isAbsolute(CONFIG.YOUTUBE_VIDEOS_DIR)).toBe(true);
    expect(CONFIG.YOUTUBE_VIDEOS_DIR).toMatch(/videos[/\\]youtube$/);
  });
  it("STATE.YOUTUBE_KNOWN_IDS ends with youtube_known_ids.json", () => {
    expect(CONFIG.STATE.YOUTUBE_KNOWN_IDS).toMatch(/youtube_known_ids\.json$/);
  });
  it("exposes a YOUTUBE credentials object", () => {
    expect(CONFIG.YOUTUBE).toBeDefined();
    expect("clientId" in CONFIG.YOUTUBE).toBe(true);
  });
  it("exposes action-brief config", () => {
    expect(CONFIG.BRIEF_MODEL).toBeTruthy();
    expect(CONFIG.BRIEF_MIN_MAPPINGS).toBeGreaterThanOrEqual(1);
    expect(CONFIG.STATE.PROJECT_BRIEFS).toMatch(/project_briefs\.json$/);
  });
  it("COLLECTOR_TIMEOUT_MS defaults to 11 minutes", () => {
    expect(CONFIG.COLLECTOR_TIMEOUT_MS).toBe(11 * 60 * 1000);
  });
  it("DOWNLOAD_TIMEOUT_MS defaults to 45 minutes", () => {
    expect(CONFIG.DOWNLOAD_TIMEOUT_MS).toBe(45 * 60 * 1000);
  });
  it("STATE.METADATA_INCOMING points at videos/metadata.incoming.json", () => {
    expect(CONFIG.STATE.METADATA_INCOMING).toBe(path.resolve("videos", "metadata.incoming.json"));
  });
  it("IG_INCREMENTAL_MAX defaults to 200", () => {
    expect(CONFIG.IG_INCREMENTAL_MAX).toBe(200);
  });
});

describe("CONFIG — model defaults", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("pins extraction to gemini-3.8-flash, the judges to gemini-3.1-flash-lite and embeddings to gemini-embedding-001", async () => {
    const keys = ["MODEL", "TRIAGE_MODEL", "MAP_MODEL", "BRIEF_MODEL", "DIGEST_MODEL", "LINK_MODEL", "EMBEDDING_MODEL"];
    for (const key of keys) vi.stubEnv(key, undefined);
    vi.resetModules();
    const { CONFIG: fresh } = await import("../pipeline/config.js");
    expect([fresh.MODEL, fresh.BRIEF_MODEL, fresh.DIGEST_MODEL, fresh.LINK_MODEL]).toEqual(
      Array(4).fill("gemini-3.8-flash"),
    );
    expect([fresh.MAP_MODEL, fresh.TRIAGE_MODEL]).toEqual(Array(2).fill("gemini-3.1-flash-lite"));
    expect(fresh.EMBEDDING_MODEL).toBe("gemini-embedding-001");
  });

  it("lets an env var move a single step without moving the rest", async () => {
    vi.stubEnv("MAP_MODEL", "gemini-2.5-flash");
    vi.resetModules();
    const { CONFIG: fresh } = await import("../pipeline/config.js");
    expect(fresh.MAP_MODEL).toBe("gemini-2.5-flash");
    expect(fresh.TRIAGE_MODEL).toBe("gemini-3.1-flash-lite");
  });
});
