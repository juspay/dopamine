// src/sources/instagram/collector.ts
import path from "node:path";
import fs from "node:fs/promises";
import { execa, ExecaError } from "execa";
import { CONFIG } from "../../pipeline/config.js";
import { loadState } from "../../pipeline/state.js";
import { getThumbnailPath } from "../../utils/video.js";
import { igMetadataToSourceItem } from "./map.js";
import type { MetadataEntry, AcquiredAssets, SourceItem } from "../../types/index.js";
import type { SourceCollector } from "../types.js";

async function runScript(script: string): Promise<void> {
  try {
    await execa("python3", [script], {
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
      stdout: "inherit",
      stderr: "inherit",
    });
  } catch (err) {
    const exitCode = err instanceof ExecaError ? err.exitCode : undefined;
    throw new Error(
      `${script} exited with code ${exitCode ?? "unknown"}. ` +
        "See output above for the required action (e.g. run `python3 scripts/ig_login.py`).",
    );
  }
}

export function makeInstagramCollector(): SourceCollector {
  return {
    source: "instagram",

    async collect(): Promise<SourceItem[]> {
      // Bulk metadata + download via the existing battle-tested Python scrapers.
      await runScript("scripts/collect_metadata.py");
      await runScript("scripts/download_videos.py");
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
