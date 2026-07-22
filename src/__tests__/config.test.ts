// src/__tests__/config.test.ts
import { describe, it, expect } from "vitest";
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
