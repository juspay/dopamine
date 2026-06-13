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
});
