import { describe, it, expect } from "vitest";
import { buildLinkRequest } from "../agents/link-extractor.js";
import type { AcquiredAssets } from "../types/index.js";

const P = "Extract links.";
const frames = (n: number): Buffer[] => Array.from({ length: n }, (_, i) => Buffer.from(`f${i}`));

describe("buildLinkRequest", () => {
  it("frames present → images branch", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: null, transcriptText: null };
    expect(buildLinkRequest(P, a, frames(10)).input.images).toEqual(frames(10));
  });
  it("transcript only → text-only branch", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: null, transcriptText: "Visit https://x.com" };
    expect(buildLinkRequest(P, a, null).input.text).toContain("https://x.com");
  });
  it("thumbnail only → files branch", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: "/t.jpg", transcriptText: null };
    expect(buildLinkRequest(P, a, null).input.files?.[0]).toBe("/t.jpg");
  });
  it("both null → text-only, no files", () => {
    const req = buildLinkRequest(P, { videoPath: null, thumbnailPath: null, transcriptText: null }, null);
    expect(req.input.files).toBeUndefined();
    expect(req.input.images).toBeUndefined();
  });
});
