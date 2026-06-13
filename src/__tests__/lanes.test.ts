// src/__tests__/lanes.test.ts
import { describe, it, expect, vi } from "vitest";
import type { SourceItem, AcquiredAssets, SourceKind } from "../types/index.js";
import type { SourceCollector } from "../sources/types.js";
import { acquireAll } from "../pipeline/lanes.js";

const item = (id: string, source: SourceKind = "instagram"): SourceItem => ({
  id, source, content_type: "short_video", title: null, author: null,
  caption_text: null, url: null, thumbnail_url: null, published_at: null, duration_seconds: null,
});
const assets = (id: string): AcquiredAssets => ({ videoPath: `/tmp/${id}.mp4`, thumbnailPath: null, transcriptText: null });

describe("acquireAll", () => {
  it("keeps only non-null acquire results and pairs them correctly", async () => {
    const collector: SourceCollector = {
      source: "instagram", collect: vi.fn(async () => []),
      acquire: vi.fn(async (i: SourceItem) => (i.id === "a" ? assets("a") : null)),
    };
    const registry = new Map<SourceKind, SourceCollector>([["instagram", collector]]);
    const result = await acquireAll([item("a"), item("b")], registry);
    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe("a");
    expect(result[0].assets).toEqual(assets("a"));
  });

  it("drops items whose source has no registered collector", async () => {
    const result = await acquireAll([item("yt", "youtube")], new Map());
    expect(result).toHaveLength(0);
  });

  it("drops items whose acquire() throws, continuing with remaining items", async () => {
    const collector: SourceCollector = {
      source: "instagram", collect: vi.fn(async () => []),
      acquire: vi.fn(async (i: SourceItem) => {
        if (i.id === "bad") throw new Error("simulated acquire failure");
        return assets(i.id);
      }),
    };
    const registry = new Map<SourceKind, SourceCollector>([["instagram", collector]]);
    const result = await acquireAll([item("good1"), item("bad"), item("good2")], registry);
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.item.id);
    expect(ids).toContain("good1");
    expect(ids).toContain("good2");
    expect(ids).not.toContain("bad");
  });

  it("processes all items under bounded concurrency without losing results", async () => {
    let active = 0, peak = 0;
    const collector: SourceCollector = {
      source: "instagram", collect: vi.fn(async () => []),
      acquire: vi.fn(async (i: SourceItem) => {
        active++; peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 3));
        active--; return assets(i.id);
      }),
    };
    const registry = new Map<SourceKind, SourceCollector>([["instagram", collector]]);
    const items = Array.from({ length: 8 }, (_, i) => item(`c-${i}`));
    const result = await acquireAll(items, registry, 3);
    expect(result).toHaveLength(8);
    expect(peak).toBeLessThanOrEqual(3);
  });
});
