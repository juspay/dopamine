// src/__tests__/instagram-collector.test.ts
import { describe, it, expect } from "vitest";
import { describeScriptFailure, collectorScriptsFor, batchToSourceItems } from "../sources/instagram/collector.js";
import type { MetadataEntry } from "../types/index.js";

describe("describeScriptFailure", () => {
  it("flags a timed-out run as an Instagram throttle/soft-block, with the minutes", () => {
    const msg = describeScriptFailure("scripts/collect_metadata.py", { timedOut: true }, 11 * 60 * 1000);
    expect(msg).toContain("scripts/collect_metadata.py");
    expect(msg).toContain("~11 min");
    expect(msg).toMatch(/throttl|soft-block/i);
    expect(msg).toContain("ig_login.py");
  });

  it("rounds the timeout to whole minutes", () => {
    const msg = describeScriptFailure("s.py", { timedOut: true }, 45 * 60 * 1000);
    expect(msg).toContain("~45 min");
  });

  it("reports the exit code for a normal non-zero exit (not a timeout)", () => {
    const msg = describeScriptFailure("scripts/download_videos.py", { exitCode: 1, timedOut: false }, 660_000);
    expect(msg).toContain("exited with code 1");
    expect(msg).not.toMatch(/throttl|soft-block/i);
  });

  it("says 'unknown' when the error carries no exit code", () => {
    expect(describeScriptFailure("s.py", {}, 660_000)).toContain("exited with code unknown");
  });

  it("handles non-object errors without throwing", () => {
    expect(describeScriptFailure("s.py", null, 660_000)).toContain("exited with code unknown");
    expect(describeScriptFailure("s.py", "boom", 660_000)).toContain("exited with code unknown");
  });
});

describe("collectorScriptsFor", () => {
  it("piggyback mode runs no python scripts", () => {
    expect(collectorScriptsFor("piggyback")).toEqual([]);
  });
  it("gallerydl mode runs the gallery-dl script", () => {
    expect(collectorScriptsFor("gallerydl")).toEqual([
      { script: "scripts/collect_saved_gallerydl.py", kind: "download" },
    ]);
  });
  it("default (instagrapi) runs collect then download", () => {
    expect(collectorScriptsFor("instagrapi")).toEqual([
      { script: "scripts/collect_metadata.py", kind: "collector" },
      { script: "scripts/download_videos.py", kind: "download" },
    ]);
  });
});

describe("batchToSourceItems", () => {
  const m = (pk: string, mt: number): MetadataEntry => ({
    pk,
    code: `c${pk}`,
    media_type: mt,
    taken_at: null,
    caption_text: null,
    username: "u",
    full_name: null,
    location: null,
    like_count: 0,
    comment_count: 0,
    video_url: mt === 2 ? "v" : null,
    thumbnail_url: null,
    resources: [],
  });
  it("keeps only video entries (media_type 2) and maps them", () => {
    const out = batchToSourceItems([m("1", 2), m("2", 1), m("3", 2)]);
    expect(out.map((s) => s.id)).toEqual(["u_1.mp4", "u_3.mp4"]);
  });
});
