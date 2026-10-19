// src/__tests__/lanes-hooks.test.ts
import { describe, expect, it, vi } from "vitest";
import { acquireAll } from "../pipeline/lanes.js";
import { type SourceCollector, SourceUnavailableError } from "../sources/types.js";
import type { AcquiredAssets, SourceItem, SourceKind } from "../types/index.js";

const item = (id: string, source: SourceKind = "youtube"): SourceItem => ({
  id,
  source,
  content_type: "long_video",
  title: null,
  author: null,
  caption_text: null,
  url: null,
  thumbnail_url: null,
  published_at: null,
  duration_seconds: null,
});
const assets: AcquiredAssets = { videoPath: null, thumbnailPath: null, transcriptText: "text" };

const registryFor = (acquire: SourceCollector["acquire"]) =>
  new Map<SourceKind, SourceCollector>([["youtube", { source: "youtube", collect: async () => [], acquire }]]);

describe("acquireAll hooks", () => {
  it("calls onFailure once for a throwing acquire and carries on with the rest", async () => {
    const onFailure = vi.fn();
    const onSuccess = vi.fn();
    const registry = registryFor(async (i) => {
      if (i.id === "bad") throw new Error("boom");
      return assets;
    });
    const result = await acquireAll([item("a"), item("bad"), item("b")], registry, 1, { onFailure, onSuccess });
    expect(result.map((r) => r.item.id)).toEqual(["a", "b"]);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure.mock.calls[0][0].id).toBe("bad");
    expect(onSuccess.mock.calls.map((c) => c[0].id)).toEqual(["a", "b"]);
  });

  it("calls onEmpty when acquire returns null", async () => {
    const onEmpty = vi.fn();
    const result = await acquireAll(
      [item("a")],
      registryFor(async () => null),
      1,
      { onEmpty },
    );
    expect(result).toEqual([]);
    expect(onEmpty).toHaveBeenCalledTimes(1);
    expect(onEmpty.mock.calls[0][0].id).toBe("a");
  });

  it("hands a SourceUnavailableError to onFailure with its class intact", async () => {
    const onFailure = vi.fn();
    const registry = registryFor(async () => {
      throw new SourceUnavailableError("youtube.com is unreachable");
    });
    await acquireAll([item("a")], registry, 1, { onFailure });
    expect(onFailure.mock.calls[0][1]).toBeInstanceOf(SourceUnavailableError);
  });

  it("does not stop the lane when a hook itself throws", async () => {
    const onSuccess = vi.fn(() => {
      throw new Error("hook bug");
    });
    const result = await acquireAll(
      [item("a"), item("b")],
      registryFor(async () => assets),
      1,
      { onSuccess },
    );
    expect(result).toHaveLength(2);
    expect(onSuccess).toHaveBeenCalledTimes(2);
  });

  it("fires no hook for an item whose source has no collector", async () => {
    const onFailure = vi.fn();
    const onEmpty = vi.fn();
    await acquireAll([item("a")], new Map(), 1, { onFailure, onEmpty });
    expect(onFailure).not.toHaveBeenCalled();
    expect(onEmpty).not.toHaveBeenCalled();
  });
});
