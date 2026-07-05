// src/sources/instagram/collector.ts
import path from "node:path";
import fs from "node:fs/promises";
import { execa } from "execa";
import { CONFIG } from "../../pipeline/config.js";
import { loadState } from "../../pipeline/state.js";
import { getThumbnailPath } from "../../utils/video.js";
import { igMetadataToSourceItem } from "./map.js";
import type { MetadataEntry, AcquiredAssets, SourceItem } from "../../types/index.js";
import type { SourceCollector } from "../types.js";

/**
 * Turn a failed scraper subprocess into an actionable error message.
 *
 * A timed-out run (execa sets `timedOut` when it hits the `timeout` option)
 * almost always means Instagram is soft-blocking the account: the private API
 * stalls instead of returning, so the fetch never completes. Surface that
 * distinctly from a normal non-zero exit so the operator knows to back off
 * rather than chase a code bug. Duck-typed so it is unit-testable without
 * constructing a real ExecaError.
 */
export function describeScriptFailure(script: string, err: unknown, timeoutMs: number): string {
  const info = typeof err === "object" && err !== null ? (err as { timedOut?: boolean; exitCode?: number }) : {};
  if (info.timedOut) {
    const mins = Math.round(timeoutMs / 60_000);
    return (
      `${script} was aborted after ~${mins} min without completing. This usually means ` +
      "Instagram is throttling/soft-blocking the account — the private API stalls instead " +
      "of returning. Pause the pipeline for 24–48h, then refresh the session with " +
      "`python3 scripts/ig_login.py` before retrying."
    );
  }
  return (
    `${script} exited with code ${info.exitCode ?? "unknown"}. ` +
    "See output above for the required action (e.g. run `python3 scripts/ig_login.py`)."
  );
}

async function runScript(script: string, timeoutMs: number): Promise<void> {
  try {
    await execa("python3", [script], {
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
      stdout: "inherit",
      stderr: "inherit",
      // Hard wall-clock cap so a stalled fetch can't hang the pipeline (and block
      // the next scheduled run). The Python scripts install their own watchdog
      // that aborts slightly sooner with a clearer message; this is the backstop.
      timeout: timeoutMs,
      killSignal: "SIGTERM",
    });
  } catch (err) {
    throw new Error(describeScriptFailure(script, err, timeoutMs));
  }
}

export function makeInstagramCollector(): SourceCollector {
  return {
    source: "instagram",

    async collect(): Promise<SourceItem[]> {
      if (CONFIG.IG_COLLECTOR === "gallerydl") {
        // Fallback path: gallery-dl (cookie auth, web endpoints) — a different
        // request signature that may survive when instagrapi is soft-blocked.
        // It writes metadata.json AND downloads the videos in one pass.
        await runScript("scripts/collect_saved_gallerydl.py", CONFIG.DOWNLOAD_TIMEOUT_MS);
      } else {
        // Default: the instagrapi private-API scrapers (metadata then download).
        await runScript("scripts/collect_metadata.py", CONFIG.COLLECTOR_TIMEOUT_MS);
        await runScript("scripts/download_videos.py", CONFIG.DOWNLOAD_TIMEOUT_MS);
      }
      const entries = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
      return entries.filter((e) => e.media_type === 2).map(igMetadataToSourceItem);
    },

    async acquire(item: SourceItem): Promise<AcquiredAssets | null> {
      const videoPath = path.join(CONFIG.VIDEOS_DIR, item.id);
      try {
        await fs.access(videoPath);
      } catch {
        return null; // no mp4 on disk → skip (reproduces today's getVideoFiles filter)
      }
      return {
        videoPath,
        thumbnailPath: await getThumbnailPath(item.id),
        transcriptText: null,
      };
    },
  };
}
