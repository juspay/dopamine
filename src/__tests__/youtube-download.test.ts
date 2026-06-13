// src/__tests__/youtube-download.test.ts
import { describe, it, expect, vi } from "vitest";
import { acquireYoutube, type ExecRunner } from "../sources/youtube/download.js";
import type { SourceItem } from "../types/index.js";

const item = (over: Partial<SourceItem> = {}): SourceItem => ({
  id: "youtube_vid001", source: "youtube", content_type: "long_video",
  title: "T", author: "Chan", caption_text: null,
  url: "https://www.youtube.com/watch?v=vid001", thumbnail_url: null,
  published_at: null, duration_seconds: 600,
  yt: { videoId: "vid001", channelId: "UC1", caption_file: null }, ...over,
});

describe("acquireYoutube — long video", () => {
  it("fetches captions only, parses the VTT, leaves videoPath null", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue("WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello world\n");
    const listDir = vi.fn().mockResolvedValue(["vid001.en.vtt"]);
    const r = await acquireYoutube(item(), { run, readVtt, listDir, outDir: "/tmp/yt" });
    expect(run).toHaveBeenCalledTimes(1);
    expect((run as ReturnType<typeof vi.fn>).mock.calls[0][1]).toContain("--skip-download");
    expect(r.videoPath).toBeNull();
    expect(r.transcriptText).toBe("Hello world");
  });

  it("picks locale-tagged VTT (e.g. en-GB.vtt) when present", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nCheers\n");
    const listDir = vi.fn().mockResolvedValue(["vid001.en-GB.vtt"]);
    const r = await acquireYoutube(item(), { run, readVtt, listDir, outDir: "/tmp/yt" });
    expect(r.transcriptText).toBe("Cheers");
  });

  it("returns null transcriptText when no en-* VTT file is found", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue(null);
    const listDir = vi.fn().mockResolvedValue(["vid001.mp4"]);
    const r = await acquireYoutube(item(), { run, readVtt, listDir, outDir: "/tmp/yt" });
    expect(r.transcriptText).toBeNull();
    expect(readVtt).not.toHaveBeenCalled();
  });
});

describe("acquireYoutube — short video", () => {
  it("fetches captions AND the mp4, returns both signals", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n");
    const listDir = vi.fn().mockResolvedValue(["vid001.en-US.vtt"]);
    const r = await acquireYoutube(item({ content_type: "short_video" }), { run, readVtt, listDir, outDir: "/tmp/yt" });
    expect(run).toHaveBeenCalledTimes(2);
    expect((run as ReturnType<typeof vi.fn>).mock.calls[1][1]).not.toContain("--skip-download");
    expect(r.videoPath).toMatch(/vid001\.mp4$/);
    expect(r.transcriptText).toBe("Hi");
  });
});
