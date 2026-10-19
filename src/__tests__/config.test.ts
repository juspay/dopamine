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
  it("no longer tracks youtube ids in a known-ids file: the retry ledger and knowledge base decide what is left", () => {
    expect("YOUTUBE_KNOWN_IDS" in CONFIG.STATE).toBe(false);
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

describe("CONFIG — triage engine", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to the generate path with a 0.8 decision floor", async () => {
    for (const key of [
      "TRIAGE_ENGINE",
      "TRIAGE_DECIDE_PROVIDER",
      "TRIAGE_DECIDE_MODEL",
      "TRIAGE_DECIDE_MIN_CONFIDENCE",
    ])
      vi.stubEnv(key, undefined);
    vi.resetModules();
    const { CONFIG: fresh } = await import("../pipeline/config.js");
    expect([
      fresh.TRIAGE_ENGINE,
      fresh.TRIAGE_DECIDE_PROVIDER,
      fresh.TRIAGE_DECIDE_MODEL,
      fresh.TRIAGE_DECIDE_MIN_CONFIDENCE,
    ]).toEqual(["generate", "", "", 0.8]);
  });

  it("enables decide only for the exact value, and ignores an unparseable floor", async () => {
    vi.stubEnv("TRIAGE_ENGINE", "decide");
    vi.stubEnv("TRIAGE_DECIDE_PROVIDER", "xor");
    vi.stubEnv("TRIAGE_DECIDE_MODEL", "jev-latest");
    vi.stubEnv("TRIAGE_DECIDE_MIN_CONFIDENCE", "high");
    vi.resetModules();
    const on = (await import("../pipeline/config.js")).CONFIG;
    expect([
      on.TRIAGE_ENGINE,
      on.TRIAGE_DECIDE_PROVIDER,
      on.TRIAGE_DECIDE_MODEL,
      on.TRIAGE_DECIDE_MIN_CONFIDENCE,
    ]).toEqual(["decide", "xor", "jev-latest", 0.6]);

    vi.stubEnv("TRIAGE_ENGINE", "DECIDE");
    vi.stubEnv("TRIAGE_DECIDE_MIN_CONFIDENCE", "0.75");
    vi.resetModules();
    const off = (await import("../pipeline/config.js")).CONFIG;
    expect([off.TRIAGE_ENGINE, off.TRIAGE_DECIDE_MIN_CONFIDENCE]).toEqual(["generate", 0.75]);
  });

  it.each([
    ["xor", 0.6],
    ["XOR", 0.6],
    ["typesafe", 0.8],
    ["", 0.8],
  ])("defaults the floor for provider %j to %d", async (provider, floor) => {
    vi.stubEnv("TRIAGE_DECIDE_PROVIDER", provider);
    vi.stubEnv("TRIAGE_DECIDE_MIN_CONFIDENCE", undefined);
    vi.resetModules();
    expect((await import("../pipeline/config.js")).CONFIG.TRIAGE_DECIDE_MIN_CONFIDENCE).toBe(floor);
  });

  it("lets an explicit floor override the provider default", async () => {
    vi.stubEnv("TRIAGE_DECIDE_PROVIDER", "xor");
    vi.stubEnv("TRIAGE_DECIDE_MIN_CONFIDENCE", "0.9");
    vi.resetModules();
    expect((await import("../pipeline/config.js")).CONFIG.TRIAGE_DECIDE_MIN_CONFIDENCE).toBe(0.9);
  });
});
