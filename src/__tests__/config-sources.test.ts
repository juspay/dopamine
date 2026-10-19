// src/__tests__/config-sources.test.ts
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const KEYS = ["SOURCE_MAX_NEW_PER_RUN", "SOURCE_SINCE"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

async function loadConfig(env: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  vi.resetModules();
  return (await import("../pipeline/config.js")).CONFIG;
}

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.resetModules();
});

describe("source config", () => {
  it("caps new items per source per run at 25 by default and honours an override", async () => {
    expect((await loadConfig({})).SOURCE_MAX_NEW_PER_RUN).toBe(25);
    expect((await loadConfig({ SOURCE_MAX_NEW_PER_RUN: "7" })).SOURCE_MAX_NEW_PER_RUN).toBe(7);
  });

  it("has no SOURCE_SINCE unless one is set, and passes a set value through as a string", async () => {
    expect((await loadConfig({})).SOURCE_SINCE).toBeUndefined();
    expect((await loadConfig({ SOURCE_SINCE: "2026-01-01" })).SOURCE_SINCE).toBe("2026-01-01");
  });

  it("keeps the non-instagram state files next to the other state under videos/", async () => {
    const config = await loadConfig({});
    expect(config.STATE.SOURCE_ITEMS).toBe(path.resolve("videos", "source_items.json"));
    expect(config.STATE.SOURCE_ATTEMPTS).toBe(path.resolve("videos", "source_attempts.json"));
    expect(config.STATE.SOURCE_HEALTH).toBe(path.resolve("videos", "source_health.json"));
  });
});
