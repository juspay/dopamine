// src/__tests__/knowledge-request.test.ts
import { describe, it, expect } from "vitest";
import { buildKnowledgeRequest } from "../agents/knowledge.js";
import type { AcquiredAssets } from "../types/index.js";

const FRAMES_ONLY_NOTE =
  "\n\nNote: You are analyzing video frames (images), not the full video file. " +
  "Audio/speech is not available. For the transcript field, describe any visible text, captions, " +
  "speech bubbles, or on-screen text you can read. If none is visible, set it to an empty string.";

const frames = (n: number): Buffer[] => Array.from({ length: n }, (_, i) => Buffer.from(`f${i}`));

describe("buildKnowledgeRequest", () => {
  it("frames only (IG): images branch + frames-only note + null override", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: "/t.jpg", transcriptText: null };
    const req = buildKnowledgeRequest(a, frames(10));
    expect(req.input.images).toEqual(frames(10));
    expect(req.input.text).toContain(FRAMES_ONLY_NOTE);
    expect(req.input.files).toBeUndefined();
    expect(req.transcriptOverride).toBeNull();
  });

  it("frames + transcript (short YT): images branch + transcript note + override set", () => {
    const a: AcquiredAssets = { videoPath: "/v.mp4", thumbnailPath: null, transcriptText: "Real captions." };
    const req = buildKnowledgeRequest(a, frames(5));
    expect(req.input.images).toEqual(frames(5));
    expect(req.input.text).not.toContain(FRAMES_ONLY_NOTE);
    expect(req.input.text).toContain("Official transcript provided");
    expect(req.transcriptOverride).toBe("Real captions.");
  });

  it("transcript only (long YT): text-only branch + override set", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: null, transcriptText: "YT transcript." };
    const req = buildKnowledgeRequest(a, null);
    expect(req.input.images).toBeUndefined();
    expect(req.input.files).toBeUndefined();
    expect(req.input.text).toContain("YT transcript.");
    expect(req.transcriptOverride).toBe("YT transcript.");
  });

  it("thumbnail only: files branch with the resolved thumbnail", () => {
    const a: AcquiredAssets = { videoPath: null, thumbnailPath: "/abs/thumb.jpg", transcriptText: null };
    const req = buildKnowledgeRequest(a, null);
    expect(req.input.files?.[0]).toBe("/abs/thumb.jpg");
    expect(req.transcriptOverride).toBeNull();
  });

  it("nothing available (both null): text-only, no files, null override", () => {
    const req = buildKnowledgeRequest({ videoPath: null, thumbnailPath: null, transcriptText: null }, null);
    expect(req.input.images).toBeUndefined();
    expect(req.input.files).toBeUndefined();
    expect(req.transcriptOverride).toBeNull();
  });
});
