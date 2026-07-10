// src/sources/instagram/collector.ts
import path from "node:path";
import fs from "node:fs/promises";
import { execa } from "execa";
import { CONFIG } from "../../pipeline/config.js";
import { loadState } from "../../pipeline/state.js";
import { ingestMetadata } from "../../pipeline/ingest.js";
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

type ScriptStep = { script: string; kind: "collector" | "download" };

/**
 * Which python scripts a given IG_COLLECTOR mode runs before ingest:
 *   - "instagrapi" (default): incremental metadata fetch, then download.
 *   - "gallerydl": the cookie-auth fallback (fetch + download in one pass).
 *   - "piggyback": none — the scheduled-Chrome harvester already captured,
 *     ingested and downloaded; the pipeline just consumes its incoming batch.
 */
export function collectorScriptsFor(mode: string): ScriptStep[] {
  if (mode === "piggyback") return [];
  if (mode === "gallerydl") return [{ script: "scripts/collect_saved_gallerydl.py", kind: "download" }];
  return [
    { script: "scripts/collect_metadata.py", kind: "collector" },
    { script: "scripts/download_videos.py", kind: "download" },
  ];
}

/** Keep only video entries (media_type 2) and map them to canonical SourceItems. */
export function batchToSourceItems(batch: MetadataEntry[]): SourceItem[] {
  return batch.filter((e) => e.media_type === 2).map(igMetadataToSourceItem);
}

export function makeInstagramCollector(): SourceCollector {
  return {
    source: "instagram",

    async collect(): Promise<SourceItem[]> {
      for (const step of collectorScriptsFor(CONFIG.IG_COLLECTOR)) {
        const timeout = step.kind === "collector" ? CONFIG.COLLECTOR_TIMEOUT_MS : CONFIG.DOWNLOAD_TIMEOUT_MS;
        await runScript(step.script, timeout);
      }
      // Both capture paths deposit a batch here; ingest unions it into the
      // canonical, accumulating metadata.json (dedup by pk). Idempotent.
      const batch = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA_INCOMING, []);
      const { added, updated, total } = await ingestMetadata(batch);
      console.log(`  [ingest] +${added} new, ~${updated} refreshed, ${total} total → metadata.json`);
      return batchToSourceItems(batch);
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
