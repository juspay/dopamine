/**
 * sources-preview.ts
 *
 * Prints, for each enabled non-Instagram source, how many items it lists, how many are
 * still to do, and how many the next run would take. Stores nothing and never calls the
 * Instagram collector. Run it before the first live run of a new source.
 *
 *   npm run sources:preview
 */
import "dotenv/config";
import { CONFIG } from "../pipeline/config.js";
import { parseSince, previewSources } from "../pipeline/source-policy.js";
import { loadLedger } from "../sources/attempts.js";
import { getEnabledCollectors } from "../sources/registry.js";
import { loadDoneIds } from "../sources/select.js";

async function main(): Promise<void> {
  const collectors = getEnabledCollectors(CONFIG.SOURCES).filter((c) => c.source !== "instagram");
  if (collectors.length === 0) {
    console.log("No non-Instagram source is enabled. Set SOURCES, for example SOURCES=instagram,youtube.");
    return;
  }
  const result = await previewSources(collectors, {
    done: await loadDoneIds(),
    ledger: await loadLedger(),
    now: new Date(),
    max: CONFIG.SOURCE_MAX_NEW_PER_RUN,
    since: parseSince(CONFIG.SOURCE_SINCE),
  });
  for (const [source, counts] of Object.entries(result)) {
    console.log(
      `${source}: ${counts.listed} listed, ${counts.pending} to do, next run takes ${counts.wouldSelect} (cap ${CONFIG.SOURCE_MAX_NEW_PER_RUN})`,
    );
  }
}

main().catch((err: unknown) => {
  console.error("sources:preview failed:", err);
  process.exit(1);
});
