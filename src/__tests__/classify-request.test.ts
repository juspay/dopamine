import { describe, it, expect } from "vitest";
import { buildClassifyRequest } from "../agents/classifier.js";
import type { AcquiredAssets } from "../types/index.js";

const P = "Classify this.";
const frames = (n: number): Buffer[] => Array.from({ length: n }, (_, i) => Buffer.from(`f${i}`));

describe("buildClassifyRequest", () => {
  it("frames present → images branch, prompt unchanged", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: null, transcriptText: null };
    const req = buildClassifyRequest(P, a, frames(3));
    expect(req.input.images).toEqual(frames(3));
    expect(req.input.text).toBe(P);
  });
  it("frames win over transcript", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: null, transcriptText: "t" };
    expect(buildClassifyRequest(P, a, frames(3)).input.images).toEqual(frames(3));
  });
  it("transcript only → text-only branch", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: null, transcriptText: "Body text." };
    const req = buildClassifyRequest(P, a, null);
    expect(req.input.images).toBeUndefined();
    expect(req.input.text).toContain("Body text.");
  });
  it("thumbnail only → files branch", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: "/t.jpg", transcriptText: null };
    expect(buildClassifyRequest(P, a, null).input.files?.[0]).toBe("/t.jpg");
  });
  it("both null → text-only, no files", () => {
    const req = buildClassifyRequest(P, { videoPath: null, thumbnailPath: null, transcriptText: null }, null);
    expect(req.input.files).toBeUndefined();
    expect(req.input.images).toBeUndefined();
  });
});
