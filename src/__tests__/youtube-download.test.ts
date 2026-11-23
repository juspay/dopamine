// src/__tests__/youtube-download.test.ts
import { describe, expect, it, vi } from "vitest";
import { type ExecRunner, acquireYoutube } from "../sources/youtube/download.js";
import type { SourceItem } from "../types/index.js";

const item = (over: Partial<SourceItem> = {}): SourceItem => ({
  id: "youtube_vid001",
  source: "youtube",
  content_type: "long_video",
  title: "T",
  author: "Chan",
  caption_text: null,
  url: "https://www.youtube.com/watch?v=vid001",
  thumbnail_url: null,
  published_at: null,
  duration_seconds: 600,
  yt: { videoId: "vid001", channelId: "UC1", caption_file: null },
  ...over,
});

describe("acquireYoutube — long video", () => {
  it("fetches captions only, parses the VTT, leaves videoPath null", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue("WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello world\n");
    const listDir = vi.fn().mockResolvedValueOnce([]).mockResolvedValue(["vid001.en.vtt"]);
    const r = await acquireYoutube(item(), { run, readVtt, listDir, outDir: "/tmp/yt" });
    expect(run).toHaveBeenCalledTimes(1);
    expect((run as ReturnType<typeof vi.fn>).mock.calls[0][1]).toContain("--skip-download");
    expect(r?.videoPath).toBeNull();
    expect(r?.transcriptText).toBe("Hello world");
  });

  it("picks locale-tagged VTT (e.g. en-GB.vtt) when present", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nCheers\n");
    const listDir = vi.fn().mockResolvedValueOnce([]).mockResolvedValue(["vid001.en-GB.vtt"]);
    const r = await acquireYoutube(item(), { run, readVtt, listDir, outDir: "/tmp/yt" });
    expect(r?.transcriptText).toBe("Cheers");
  });

  it("returns null, meaning nothing to analyse yet, when a long video has no captions", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue(null);
    const listDir = vi.fn().mockResolvedValue(["other.mp4"]);
    const r = await acquireYoutube(item(), { run, readVtt, listDir, outDir: "/tmp/yt" });
    expect(r).toBeNull();
    expect(readVtt).not.toHaveBeenCalled();
  });
});

describe("acquireYoutube — short video", () => {
  it("fetches captions AND the mp4, returns both signals", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const readVtt = vi.fn().mockResolvedValue("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n");
    const listDir = vi.fn().mockResolvedValueOnce([]).mockResolvedValue(["vid001.en-US.vtt"]);
    const r = await acquireYoutube(item({ content_type: "short_video" }), { run, readVtt, listDir, outDir: "/tmp/yt" });
    expect(run).toHaveBeenCalledTimes(2);
    expect((run as ReturnType<typeof vi.fn>).mock.calls[1][1]).not.toContain("--skip-download");
    expect(r?.videoPath).toMatch(/vid001\.mp4$/);
    expect(r?.transcriptText).toBe("Hi");
  });
});

import { SourceUnavailableError } from "../sources/types.js";
import { isNetworkFailure } from "../sources/youtube/network.js";
import { buildCaptionArgs, buildVideoArgs } from "../sources/youtube/ytdlp.js";

const VTT = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n";
const calls = (run: ExecRunner) => (run as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[1] as string[]);

describe("acquireYoutube — resumable and forgiving", () => {
  it("keeps the captions when the video download fails", async () => {
    const run: ExecRunner = vi.fn(async (_cmd, args) => {
      if (!args.includes("--skip-download")) throw new Error("ERROR: Requested format is not available");
      return { stdout: "", stderr: "" };
    });
    const r = await acquireYoutube(item({ content_type: "short_video", duration_seconds: 40 }), {
      run,
      readVtt: async () => VTT,
      listDir: async () => ["vid001.en.vtt"],
      outDir: "/tmp/yt",
    });
    expect(r).toEqual({ videoPath: null, thumbnailPath: null, transcriptText: "Hi" });
  });

  it("does not fetch captions or the video again when they are already on disk", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const r = await acquireYoutube(item({ content_type: "short_video", duration_seconds: 40 }), {
      run,
      readVtt: async () => VTT,
      listDir: async () => ["vid001.en.vtt", "vid001.mp4"],
      outDir: "/tmp/yt",
    });
    expect(run).not.toHaveBeenCalled();
    expect(r?.videoPath).toBe("/tmp/yt/vid001.mp4");
    expect(r?.transcriptText).toBe("Hi");
  });

  it("never tries to download a live or upcoming stream, whose duration is 0", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    await acquireYoutube(item({ content_type: "short_video", duration_seconds: 0 }), {
      run,
      readVtt: async () => VTT,
      listDir: async () => ["vid001.en.vtt"],
      outDir: "/tmp/yt",
    });
    expect(calls(run).some((a) => a.includes("-f"))).toBe(false);
  });

  it("raises a source outage, not an item failure, when the network drops", async () => {
    const run: ExecRunner = vi.fn(async () => {
      throw new Error(
        "ERROR: Unable to download API page: ('Connection aborted.', ConnectionResetError(54, 'Connection reset by peer'))",
      );
    });
    await expect(
      acquireYoutube(item(), { run, readVtt: async () => null, listDir: async () => [], outDir: "/tmp/yt" }),
    ).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("throws an ordinary error for a failure that is neither the network nor a missing video", async () => {
    const run: ExecRunner = vi.fn(async () => {
      throw new Error("ERROR: [youtube] vid001: Requested format is not available");
    });
    const p = acquireYoutube(item(), { run, readVtt: async () => null, listDir: async () => [], outDir: "/tmp/yt" });
    await expect(p).rejects.toThrow(/Requested format/);
    await expect(p).rejects.not.toBeInstanceOf(SourceUnavailableError);
  });

  it("retries an age-restricted video once with the cookie file", async () => {
    let n = 0;
    const run: ExecRunner = vi.fn(async () => {
      n++;
      if (n === 1) throw new Error("ERROR: Sign in to confirm your age. This video may be inappropriate");
      return { stdout: "", stderr: "" };
    });
    let listed = 0;
    const r = await acquireYoutube(item(), {
      run,
      readVtt: async () => VTT,
      listDir: async () => (listed++ === 0 ? [] : ["vid001.en.vtt"]),
      outDir: "/tmp/yt",
      cookiesFile: "/secret/c.txt",
    });
    expect(r?.transcriptText).toBe("Hi");
    const all = calls(run);
    expect(all).toHaveLength(2);
    expect(all[0]).not.toContain("--cookies");
    expect(all[1][all[1].indexOf("--cookies") + 1]).toBe("/secret/c.txt");
  });

  // 2026-11-23: three videos failed every run with this error. YouTube serves their subtitles
  // only to a signed-in request; with the cookie file they download at once.
  it("retries once with the cookie file when YouTube refuses the subtitles with HTTP 429", async () => {
    let n = 0;
    const run: ExecRunner = vi.fn(async () => {
      n++;
      if (n === 1)
        throw new Error("ERROR: Unable to download video subtitles for 'en': HTTP Error 429: Too Many Requests");
      return { stdout: "", stderr: "" };
    });
    let listed = 0;
    const r = await acquireYoutube(item(), {
      run,
      readVtt: async () => VTT,
      listDir: async () => (listed++ === 0 ? [] : ["vid001.en.vtt"]),
      outDir: "/tmp/yt",
      cookiesFile: "/secret/c.txt",
    });
    expect(r?.transcriptText).toBe("Hi");
    const all = calls(run);
    expect(all).toHaveLength(2);
    expect(all[1][all[1].indexOf("--cookies") + 1]).toBe("/secret/c.txt");
  });

  it("still reports YouTube as unreachable when the signed-in retry is refused too", async () => {
    const run: ExecRunner = vi.fn(async () => {
      throw new Error("ERROR: Unable to download video subtitles for 'en': HTTP Error 429: Too Many Requests");
    });
    await expect(
      acquireYoutube(item(), {
        run,
        readVtt: async () => VTT,
        listDir: async () => [],
        outDir: "/tmp/yt",
        cookiesFile: "/secret/c.txt",
      }),
    ).rejects.toThrow(/unreachable/i);
    expect(calls(run)).toHaveLength(2);
  });

  it("saves the thumbnail under the item id once, and a failed fetch does not fail the item", async () => {
    const writeFile = vi.fn(async () => {});
    const base = {
      run: vi.fn().mockResolvedValue({ stdout: "", stderr: "" }) as ExecRunner,
      readVtt: async () => VTT,
      listDir: async () => ["vid001.en.vtt"],
      outDir: "/tmp/yt",
      thumbDir: "/tmp/thumbs",
      writeFile,
    };
    const withThumb = item({ thumbnail_url: "https://i.ytimg.com/vi/vid001/hq.jpg" });
    const first = await acquireYoutube(withThumb, {
      ...base,
      exists: async () => false,
      fetchBytes: async () => new Uint8Array([1]),
    });
    expect(first?.thumbnailPath).toBe("/tmp/thumbs/youtube_vid001.jpg");
    expect(writeFile).toHaveBeenCalledTimes(1);
    const again = await acquireYoutube(withThumb, {
      ...base,
      exists: async () => true,
      fetchBytes: async () => new Uint8Array([1]),
    });
    expect(again?.thumbnailPath).toBe("/tmp/thumbs/youtube_vid001.jpg");
    expect(writeFile).toHaveBeenCalledTimes(1);
    const broken = await acquireYoutube(withThumb, {
      ...base,
      exists: async () => false,
      fetchBytes: async () => {
        throw new Error("404");
      },
    });
    expect(broken).toEqual({ videoPath: null, thumbnailPath: null, transcriptText: "Hi" });
  });

  it("binds yt-dlp to the egress address when one is given", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    await acquireYoutube(item(), {
      run,
      readVtt: async () => null,
      listDir: async () => [],
      outDir: "/tmp/yt",
      sourceAddress: "192.168.1.7",
    });
    const args = calls(run)[0];
    expect(args[args.indexOf("--source-address") + 1]).toBe("192.168.1.7");
  });
});

describe("yt-dlp argument options", () => {
  it("adds nothing by default and puts options before the url", () => {
    expect(buildCaptionArgs("v", "/o")).not.toContain("--source-address");
    const a = buildVideoArgs("v", "/o.mp4", { sourceAddress: "1.2.3.4", cookiesFile: "/c" });
    expect(a.indexOf("--source-address")).toBeLessThan(a.length - 1);
    expect(a.at(-1)).toBe("https://www.youtube.com/watch?v=v");
    expect(a).toContain("--cookies");
  });
});

describe("isNetworkFailure", () => {
  it("recognises the reset seen behind the VPN and a timeout, not an unavailable video", () => {
    expect(
      isNetworkFailure(
        "Unable to download API page: ('Connection aborted.', ConnectionResetError(54, 'Connection reset by peer'))",
      ),
    ).toBe(true);
    expect(isNetworkFailure("Read timed out.")).toBe(true);
    expect(isNetworkFailure("getaddrinfo ENOTFOUND www.youtube.com")).toBe(true);
    expect(isNetworkFailure("Video unavailable")).toBe(false);
    expect(isNetworkFailure("Sign in to confirm your age")).toBe(false);
  });
});

import { ytDlpFailureMessage } from "../sources/youtube/ytdlp.js";

describe("ytDlpFailureMessage", () => {
  it("is yt-dlp's last ERROR line, never the command line or its arguments", () => {
    const msg = ytDlpFailureMessage({
      stderr: "WARNING: Read timed out. Retrying\nERROR: [youtube] abc: Video unavailable\n",
      exitCode: 1,
      command: "yt-dlp --cookies /Users/me/.secrets/c.txt https://x",
    });
    expect(msg).toBe("ERROR: [youtube] abc: Video unavailable");
    expect(msg).not.toContain("--cookies");
    expect(msg).not.toContain("/Users/me");
  });
  it("falls back to the exit code, and says when it timed out", () => {
    expect(ytDlpFailureMessage({ stderr: "", exitCode: 2 })).toBe("yt-dlp exited with code 2");
    expect(ytDlpFailureMessage({ stderr: "", timedOut: true })).toMatch(/timed out/);
  });
});

describe("acquireYoutube — review fixes", () => {
  const deps = (run: ExecRunner, files: string[] = []) => ({
    run,
    readVtt: async () => VTT,
    listDir: async () => files,
    outDir: "/tmp/yt",
  });

  it("treats a premiere or live stream with no captions yet as empty, without running yt-dlp", async () => {
    const run: ExecRunner = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    expect(await acquireYoutube(item({ content_type: "short_video", duration_seconds: 0 }), deps(run))).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it("treats a video that is gone or private as empty, not as a failure", async () => {
    for (const reason of [
      "ERROR: [youtube] vid001: Video unavailable",
      "ERROR: [youtube] vid001: Private video. Sign in if you have been granted access",
    ]) {
      const run: ExecRunner = vi.fn(async () => {
        throw new Error(reason);
      });
      expect(await acquireYoutube(item(), deps(run))).toBeNull();
    }
  });

  it("raises an outage when the video download hits the network, so the video is tried again", async () => {
    const run: ExecRunner = vi.fn(async (_c, args) => {
      if (!args.includes("--skip-download"))
        throw new Error("ERROR: unable to download video data: <urlopen error [Errno 54] Connection reset by peer>");
      return { stdout: "", stderr: "" };
    });
    await expect(
      acquireYoutube(item({ content_type: "short_video", duration_seconds: 40 }), deps(run, ["vid001.en.vtt"])),
    ).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("treats YouTube's bot check as the source being unavailable, not the item's fault", async () => {
    const run: ExecRunner = vi.fn(async () => {
      throw new Error("ERROR: [youtube] vid001: Sign in to confirm you're not a bot");
    });
    await expect(acquireYoutube(item(), deps(run))).rejects.toBeInstanceOf(SourceUnavailableError);
  });
});

describe("isNetworkFailure — more outages", () => {
  it.each([
    "<urlopen error [Errno 8] nodename nor servname provided, or not known>",
    "[Errno 61] Connection refused",
    "[Errno 65] No route to host",
    "[Errno 50] Network is down",
    "EOF occurred in violation of protocol (_ssl.c:1000)",
    "Sign in to confirm you're not a bot",
    "ERROR: Unable to download video subtitles for 'en': HTTP Error 429: Too Many Requests",
  ])("recognises %s", (m) => {
    expect(isNetworkFailure(m)).toBe(true);
  });
});
