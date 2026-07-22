// Side-effect import so .env loads BEFORE config.js evaluates. With the old
// `import dotenv; dotenv.config()` form, ESM hoists all imports (including
// config.js) and runs them before the config() statement — so CONFIG.VIDEOS_DIR
// was computed from an unset INSTAGRAM_USERNAME (→ videos/user_saved) whenever
// the env wasn't exported (e.g. the launchd job), silently breaking classification.
import "dotenv/config";

import { NeuroLink } from "@juspay/neurolink";
// Verification pipeline agents (steps 10-14 in the 0-indexed run order)
import { runAnalyzerAgent } from "../agents/analyzer.js";
import { runCatalogAgent } from "../agents/catalog.js";
import { runClassifierAgent } from "../agents/classifier.js";
import { runDashboardAgent } from "../agents/dashboard.js";
import { runEnrichmentAgent } from "../agents/enrichment.js";
import { runImplementerAgent } from "../agents/implementer.js";
import { runKnowledgeAgent } from "../agents/knowledge.js";
import { runLinkExtractAgent } from "../agents/link-extractor.js";
import { runLinkResolverAgent } from "../agents/link-resolver.js";
import { runMarkdownAgent } from "../agents/markdown.js";
import { runOrganizerAgent } from "../agents/organizer.js";
import { runPropertiesAgent } from "../agents/properties.js";
import { runResearchAgent } from "../agents/researcher.js";
import { runVerifierAgent } from "../agents/verifier.js";

import { runDigestAgent } from "../agents/digest.js";
import { runProjectMapper } from "../agents/project-mapper.js";
import { runProjectBriefAgent } from "../agents/project-brief.js";
import { CONFIG } from "../pipeline/config.js";
import { type LaneItem, acquireAll } from "../pipeline/lanes.js";
import { loadState } from "../pipeline/state.js";
import { runSearchIndexer } from "../search/indexer.js";
import { igMetadataToSourceItem } from "../sources/instagram/map.js";
import { getEnabledCollectors } from "../sources/registry.js";
import type { MetadataEntry, SourceItem } from "../types/index.js";
import { getLogger } from "../utils/logger.js";
import { resetMetrics } from "../utils/metrics.js";

// ---------------------------------------------------------------------------
// Pipeline step definition
// ---------------------------------------------------------------------------

interface PipelineStep {
  name: string;
  run: () => Promise<void>;
  /**
   * Parallel group tag. Steps in the same group CAN run concurrently
   * when --parallel is enabled. Steps with different groups or no group
   * always run sequentially. Within a group, steps still respect the
   * ordering constraint: a parallel group only starts after all previous
   * sequential steps have completed.
   */
  parallelGroup?: string;
}

// ---------------------------------------------------------------------------
// Parallel groups
//
// Safe to run in parallel:
//   - "post-classify": catalog, organizer, markdown can run concurrently
//     because they only READ classifications.json + properties.json (no writes
//     that conflict).
//   - Properties extraction already has internal parallelism (ffprobe batches).
//
// NOT safe to parallelize:
//   - Classification, Knowledge, Link extraction share the NeuroLink instance
//     and the rate limiter. They also depend on each other's outputs.
//   - Metadata -> Download must be sequential.
// ---------------------------------------------------------------------------

export interface PipelineOptions {
  startStep?: number;
  endStep?: number;
  parallel?: boolean;
}

export async function runFullPipeline(options: PipelineOptions = {}): Promise<void> {
  const log = getLogger({ agent: "runner" });
  const metrics = resetMetrics();

  // Rotate old log files once per run
  await log.rotate();

  const neurolink = new NeuroLink();
  const parallel = options.parallel ?? process.argv.includes("--parallel");

  // ---------------------------------------------------------------------------
  // STEP ORDERING NOTE
  //
  // Dashboard build (step 16, 0-indexed 15) intentionally runs LAST — after
  // the full verification pipeline — so verification scores, URL statuses,
  // and confidence data from the current run are all present when the
  // dashboard JSON is emitted.  The previous ordering (dashboard at index 10)
  // meant every run produced a dashboard that was one run stale w.r.t.
  // verification data, because verifications.json was written after the
  // dashboard had already been built.
  //
  // 0-indexed mapping (used by START_STEP / END_STEP / --start / --end):
  //   0  Source-agnostic collection (enabled SOURCES collectors)
  //   1  Asset acquisition          (per-item frames/captions via lanes)
  //   2  Properties extraction
  //   3  Classification
  //   4  Knowledge extraction
  //   5  Link extraction
  //   6  Link resolution
  //   7  Catalog generation       \
  //   8  Folder organization       > parallel group "post-classify"
  //   9  Markdown generation      /
  //  10  Content analysis
  //  11  Research & verification
  //  12  Implementation testing
  //  13  Verification synthesis
  //  14  Knowledge base enrichment
  //  15  Dashboard build           ← reads ALL state including verifications
  //  16  Search index              ← refreshes videos/search.db for the MCP server
  //  17  Project mapping           ← maps learnings to projects (hybrid embed + LLM judge)
  //  18  Project brief             ← synthesizes each project's learnings into actions
  //  19  Digest                    ← LAST: pushes top new learnings via Shooter-compatible notify
  // ---------------------------------------------------------------------------
  // Lane assets acquired in step 1, consumed by steps 3-5 (read at call time).
  let laneItems: LaneItem[] = [];
  // Collector output threaded in-memory to acquisition. The persistent
  // MetadataEntry[] store (metadata.json) is owned by the ingest layer now —
  // the collection step no longer clobbers it with SourceItem[].
  let collectedItems: SourceItem[] = [];
  let collectionRan = false;

  const runCollectionStep = async (): Promise<void> => {
    const collectors = getEnabledCollectors(CONFIG.SOURCES);
    console.log(`\n=== Collection — ${collectors.map((c) => c.source).join(", ")} ===`);
    const collected = await Promise.all(collectors.map((c) => c.collect()));
    collectedItems = collected.flat();
    collectionRan = true;
    console.log(`  Collected ${collectedItems.length} new item(s); metadata.json updated via ingest.`);
  };

  const runAcquisitionStep = async (): Promise<void> => {
    let items = collectedItems;
    if (!collectionRan) {
      // Collection step was skipped (e.g. --start>0): reconstruct the item list
      // from the canonical accumulating store so partial runs still work.
      const meta = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
      items = meta.filter((e) => e.media_type === 2).map(igMetadataToSourceItem);
    }
    const registry = new Map(getEnabledCollectors(CONFIG.SOURCES).map((c) => [c.source, c] as const));
    laneItems = await acquireAll(items, registry);
    console.log(`\n=== Acquisition — ${laneItems.length}/${items.length} item(s) acquired ===`);
  };

  const steps: PipelineStep[] = [
    { name: "Source-agnostic collection", run: () => runCollectionStep() }, //  0
    { name: "Asset acquisition", run: () => runAcquisitionStep() }, //  1
    { name: "Properties extraction", run: () => runPropertiesAgent() }, //  2
    { name: "Classification", run: () => runClassifierAgent(neurolink, laneItems) }, //  3
    { name: "Knowledge extraction", run: () => runKnowledgeAgent(neurolink, laneItems) }, //  4
    { name: "Link extraction", run: () => runLinkExtractAgent(neurolink, laneItems) }, //  5
    { name: "Link resolution", run: () => runLinkResolverAgent(neurolink) }, //  6
    { name: "Catalog generation", run: () => runCatalogAgent(), parallelGroup: "post-classify" }, //  7
    { name: "Folder organization", run: () => runOrganizerAgent(), parallelGroup: "post-classify" }, //  8
    { name: "Markdown generation", run: () => runMarkdownAgent(), parallelGroup: "post-classify" }, //  9
    // Verification pipeline
    { name: "Content analysis", run: () => runAnalyzerAgent(neurolink) }, // 10
    { name: "Research & verification", run: () => runResearchAgent(neurolink) }, // 11
    { name: "Implementation testing", run: () => runImplementerAgent() }, // 12
    { name: "Verification synthesis", run: () => runVerifierAgent(neurolink) }, // 13
    { name: "Knowledge base enrichment", run: () => runEnrichmentAgent() }, // 14
    // Dashboard build runs late so verification scores land in the same run
    { name: "Dashboard build", run: () => runDashboardAgent() }, // 15  -- reads verifications.json
    // Search index runs after dashboard build so the MCP corpus reflects this run
    { name: "Search index", run: () => runSearchIndexer() }, // 16
    // Project mapping reads the fresh embeddings to map learnings to projects
    { name: "Project mapping", run: () => runProjectMapper(neurolink) }, // 17
    // Project brief synthesizes each project's mapped learnings into actions
    { name: "Project brief", run: () => runProjectBriefAgent(neurolink) }, // 18

    // Digest runs LAST — it reads the fresh search index to push new learnings
    { name: "Digest", run: () => runDigestAgent(neurolink) }, // 19
  ];

  const startStep = options.startStep ?? Number.parseInt(process.env.START_STEP ?? "0", 10);
  const endStep = options.endStep ?? Number.parseInt(process.env.END_STEP ?? String(steps.length), 10);

  log.info("Pipeline starting", {
    startStep,
    endStep,
    totalSteps: steps.length,
    parallel,
  });

  if (parallel) {
    console.log("\n  [parallel mode] Steps in the same parallel group will run concurrently.");
  }

  const errors: string[] = [];
  try {
    // Build the execution plan: group consecutive steps that share a parallelGroup
    const plan = buildExecutionPlan(steps, startStep, endStep, parallel);

    for (const group of plan) {
      if (group.length === 0) continue;

      if (group.length === 1) {
        // Single step -- run sequentially
        const { step, index } = group[0];
        await runSingleStep(step, index, steps.length, metrics, log, errors);
      } else {
        // Parallel group
        console.log(`\n${"=".repeat(60)}`);
        console.log(`Parallel group: ${group.map((g) => g.step.name).join(", ")}`);
        console.log("=".repeat(60));

        const results = await Promise.allSettled(
          group.map(({ step, index }) => runSingleStep(step, index, steps.length, metrics, log, errors)),
        );

        // Check for unexpected rejections (runSingleStep already handles errors internally)
        for (const [gi, result] of results.entries()) {
          if (result.status === "rejected") {
            const msg = `Parallel step ${group[gi].step.name} rejected unexpectedly: ${result.reason}`;
            log.error(msg);
            errors.push(msg);
          }
        }
      }
    }

    // Print performance summary
    printPerformanceSummary(metrics, parallel);

    if (errors.length > 0) {
      log.warn(`Pipeline completed with ${errors.length} error(s)`, { errors: errors.map((e) => e.slice(0, 150)) });
    } else {
      log.info("Pipeline complete — all steps succeeded");
    }
  } finally {
    await neurolink.shutdown();
    const saved = await metrics.save();
    log.info("Metrics saved", {
      runId: saved.runId,
      totalDurationMs: saved.totalDurationMs,
      summary: saved.summary,
    });
    await log.close();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PlanEntry {
  step: PipelineStep;
  index: number;
}

/**
 * Build an execution plan: an array of groups. Each group is an array of steps
 * that can run concurrently. Groups of size 1 are sequential steps.
 */
function buildExecutionPlan(
  steps: PipelineStep[],
  startStep: number,
  endStep: number,
  parallel: boolean,
): PlanEntry[][] {
  const plan: PlanEntry[][] = [];
  let currentGroup: PlanEntry[] = [];
  let currentGroupTag: string | undefined;

  for (const [i, step] of steps.entries()) {
    if (i < startStep || i >= endStep) {
      // Push any accumulated group first
      if (currentGroup.length > 0) {
        plan.push(currentGroup);
        currentGroup = [];
        currentGroupTag = undefined;
      }
      continue;
    }

    const tag = parallel ? step.parallelGroup : undefined;

    if (tag && tag === currentGroupTag) {
      // Same parallel group -- accumulate
      currentGroup.push({ step, index: i });
    } else {
      // Different group or no group -- flush previous and start new
      if (currentGroup.length > 0) {
        plan.push(currentGroup);
      }
      currentGroup = [{ step, index: i }];
      currentGroupTag = tag;
    }
  }

  if (currentGroup.length > 0) {
    plan.push(currentGroup);
  }

  return plan;
}

/**
 * Run a single pipeline step with timing, logging, metrics, and error handling.
 *
 * On failure the step is recorded in `errors` and execution continues, but a
 * prominent console warning is emitted so the operator is not left wondering
 * why downstream steps produce empty or stale data.  The IG scraper steps
 * (Metadata collection, Video download) are the canonical example: a
 * LoginRequired / 403 failure leaves metadata.json and the video directory
 * unchanged from the previous run, so every subsequent step silently operates
 * on stale data without any obvious signal that something went wrong.
 */
async function runSingleStep(
  step: PipelineStep,
  index: number,
  totalSteps: number,
  metrics: ReturnType<typeof resetMetrics>,
  log: ReturnType<typeof getLogger>,
  errors: string[],
): Promise<void> {
  const stepLog = log.child({ step: step.name });
  stepLog.info(`Step ${index + 1}/${totalSteps}: ${step.name} — starting`);
  metrics.startStep(step.name);

  const t0 = Date.now();
  try {
    await step.run();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    metrics.endStep("success");
    stepLog.info(`Step ${index + 1}/${totalSteps}: ${step.name} — completed in ${elapsed}s`);
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const errStr = String(err).split("\n")[0];
    const msg = `Step ${index + 1} (${step.name}) failed after ${elapsed}s: ${errStr}`;
    metrics.endStep("error", String(err));
    stepLog.error(msg);
    errors.push(msg);

    // Emit a highly visible warning so operators can diagnose why downstream
    // steps produce empty or stale data without an obvious error trail.
    console.error(`\n${"!".repeat(60)}`);
    console.error(`STEP FAILED [${index + 1}/${totalSteps}]: ${step.name}`);
    console.error(`  Error : ${errStr}`);
    console.error(`  Impact: downstream steps may produce empty or stale data`);
    console.error(`          if they depend on this step's output files.`);
    console.error("!".repeat(60) + "\n");
  }
}

/**
 * Print a human-readable performance summary after the pipeline run.
 */
function printPerformanceSummary(metrics: ReturnType<typeof resetMetrics>, parallel: boolean): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Pipeline Performance Summary");
  console.log("=".repeat(60));

  // Access steps from metrics (save() will finalize, but we can read from the saved data)
  // Use a simple timing approach: print mode info
  if (parallel) {
    console.log("  Mode: PARALLEL (steps in same group ran concurrently)");
  } else {
    console.log("  Mode: SEQUENTIAL (use --parallel to enable concurrent steps)");
  }
  console.log("");
  console.log("  Optimization tips:");
  console.log("  - Properties extraction uses parallel ffprobe batches (PROPERTIES_CONCURRENCY env var)");
  console.log("  - Dashboard data is gzip-compressed (~60-70% smaller HTML)");
  console.log("  - Sandbox auto-cleanup removes dirs older than SANDBOX_MAX_AGE_DAYS (default 7)");
  console.log("  - Use --parallel flag to run catalog/organizer/markdown concurrently");
  console.log("=".repeat(60));
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (process.argv[1]?.endsWith("runner.js")) {
  const opts: PipelineOptions = {};

  // Parse CLI arguments
  for (const arg of process.argv.slice(2)) {
    if (arg === "--parallel") {
      opts.parallel = true;
    } else if (arg.startsWith("--start=")) {
      opts.startStep = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--end=")) {
      opts.endStep = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: node dist/pipeline/runner.js [options]

Options:
  --parallel       Run independent steps concurrently (catalog, organizer, markdown)
  --start=N        Start from step N (0-indexed, inclusive)
  --end=N          End before step N (0-indexed, exclusive). Default: run all steps.
  -h, --help       Show this help

Step index map (0-indexed, for use with --start / --end / START_STEP / END_STEP):
   0  Metadata collection       (IG scraper — requires valid session)
   1  Video download            (IG scraper — requires valid session)
   2  Properties extraction
   3  Classification
   4  Knowledge extraction
   5  Link extraction
   6  Link resolution
   7  Catalog generation        \
   8  Folder organization        > parallel group "post-classify" (--parallel)
   9  Markdown generation       /
  10  Content analysis
  11  Research & verification
  12  Implementation testing
  13  Verification synthesis
  14  Knowledge base enrichment
  15  Dashboard build           (reads verifications.json so scores are current)
  16  Search index              (refreshes videos/search.db for the dopamine-kb MCP server)
  17  Project mapping           (maps learnings to projects.json via hybrid embed + LLM judge)
  18  Project brief             (synthesizes each project's mapped learnings into actions)
  19  Digest                    (runs LAST — pushes top new learnings to a Shooter-compatible endpoint)

NOTE: Steps appended after the search index — Project mapping (17), Project brief
(18), Digest (19) — so the pipeline now has 20 steps (0-19). END_STEP is exclusive:
use END_STEP=17 to stop after the search index, or omit it to run everything.

Environment variables:
  START_STEP                 Same as --start
  END_STEP                   Same as --end
  PROPERTIES_CONCURRENCY     Number of parallel ffprobe workers (default: 8)
  SANDBOX_MAX_AGE_DAYS       Auto-cleanup sandbox dirs older than N days (default: 7)
`);
      process.exit(0);
    }
  }

  runFullPipeline(opts).catch((err) => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
