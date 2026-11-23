// src/__tests__/youtube-ytdlp.test.ts
import { describe, expect, it } from "vitest";
import { buildWatchLaterArgs } from "../sources/youtube/feeds.js";
import { buildCaptionArgs, buildVideoArgs, jsRuntimeArgs } from "../sources/youtube/ytdlp.js";

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

// 2026-11-23: three liked videos failed every run with HTTP 429 on their subtitles. yt-dlp could
// not solve YouTube's JavaScript challenge (it only looks for Deno by default), and YouTube
// throttles requests whose challenge is unsolved. Every yt-dlp call now names Node, the runtime
// the pipeline itself runs on.
describe("jsRuntimeArgs", () => {
  it("names the Node binary this process runs on", () => {
    expect(jsRuntimeArgs()).toEqual(["--js-runtimes", `node:${process.execPath}`]);
  });

  it("is in every YouTube call", () => {
    const want = `node:${process.execPath}`;
    for (const a of [
      buildCaptionArgs("dQw4w9WgXcQ", "/tmp/%(id)s"),
      buildVideoArgs("dQw4w9WgXcQ", "/tmp/out.mp4"),
      buildWatchLaterArgs("/tmp/cookies.txt"),
    ]) {
      expect(a[a.indexOf("--js-runtimes") + 1]).toBe(want);
    }
  });
});
