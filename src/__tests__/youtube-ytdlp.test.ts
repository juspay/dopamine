// src/__tests__/youtube-ytdlp.test.ts
import { describe, it, expect } from "vitest";
import { buildCaptionArgs, buildVideoArgs } from "../sources/youtube/ytdlp.js";

describe("buildCaptionArgs", () => {
  it("requests subs + auto-subs in English, skips the download, sets -o and the watch URL", () => {
    const a = buildCaptionArgs("dQw4w9WgXcQ", "/tmp/%(id)s");
    expect(a).toContain("--write-subs");
    expect(a).toContain("--write-auto-subs");
    expect(a[a.indexOf("--sub-langs") + 1]).toBe("en");
    expect(a).toContain("--skip-download");
    expect(a[a.indexOf("-o") + 1]).toBe("/tmp/%(id)s");
    expect(a).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});

describe("buildVideoArgs", () => {
  it("requests mp4, does NOT skip download, sets -o and the watch URL", () => {
    const a = buildVideoArgs("dQw4w9WgXcQ", "/tmp/out.mp4");
    expect(a[a.indexOf("-f") + 1]).toBe("mp4");
    expect(a).not.toContain("--skip-download");
    expect(a[a.indexOf("-o") + 1]).toBe("/tmp/out.mp4");
    expect(a).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
