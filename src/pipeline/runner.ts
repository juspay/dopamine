import dotenv from "dotenv";
dotenv.config();

import { NeuroLink } from "@juspay/neurolink";
import { runMetadataAgent }     from "../agents/metadata.js";
import { runDownloadAgent }     from "../agents/download.js";
import { runPropertiesAgent }   from "../agents/properties.js";
import { runClassifierAgent }   from "../agents/classifier.js";
import { runKnowledgeAgent }    from "../agents/knowledge.js";
import { runLinkExtractAgent }  from "../agents/link-extractor.js";
import { runLinkResolverAgent } from "../agents/link-resolver.js";
import { runCatalogAgent }      from "../agents/catalog.js";
import { runOrganizerAgent }    from "../agents/organizer.js";
import { runMarkdownAgent }     from "../agents/markdown.js";
import { runDashboardAgent }    from "../agents/dashboard.js";
// Steps 12-16: Verification pipeline
import { runAnalyzerAgent }     from "../agents/analyzer.js";
import { runResearchAgent }     from "../agents/researcher.js";
import { runImplementerAgent }  from "../agents/implementer.js";
import { runVerifierAgent }     from "../agents/verifier.js";
import { runEnrichmentAgent }   from "../agents/enrichment.js";

import { getLogger }            from "../utils/logger.js";
import { resetMetrics }         from "../utils/metrics.js";

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
  const log     = getLogger({ agent: "runner" });
  const metrics = resetMetrics();

  // Rotate old log files once per run
  await log.rotate();

  const neurolink = new NeuroLink();
  const parallel = options.parallel ?? process.argv.includes("--parallel");

  const steps: PipelineStep[] = [
    { name: "Metadata collection",       run: () => runMetadataAgent() },                // 1
    { name: "Video download",            run: () => runDownloadAgent() },                 // 2
    { name: "Properties extraction",     run: () => runPropertiesAgent() },               // 3
    { name: "Classification",            run: () => runClassifierAgent(neurolink) },      // 4
    { name: "Knowledge extraction",      run: () => runKnowledgeAgent(neurolink) },       // 5
    { name: "Link extraction",           run: () => runLinkExtractAgent(neurolink) },     // 6
    { name: "Link resolution",           run: () => runLinkResolverAgent(neurolink) },    // 7
    { name: "Catalog generation",        run: () => runCatalogAgent(),        parallelGroup: "post-classify" }, // 8
    { name: "Folder organization",       run: () => runOrganizerAgent(),      parallelGroup: "post-classify" }, // 9
    { name: "Markdown generation",       run: () => runMarkdownAgent(),       parallelGroup: "post-classify" }, // 10
    { name: "Dashboard build",           run: () => runDashboardAgent() },                // 11  -- depends on catalog
    // Verification pipeline (Steps 12-16)
    { name: "Content analysis",          run: () => runAnalyzerAgent(neurolink) },        // 12
    { name: "Research & verification",   run: () => runResearchAgent(neurolink) },        // 13
    { name: "Implementation testing",    run: () => runImplementerAgent() },              // 14
    { name: "Verification synthesis",    run: () => runVerifierAgent(neurolink) },        // 15
    { name: "Knowledge base enrichment", run: () => runEnrichmentAgent() },              // 16
  ];

  const startStep = options.startStep ?? parseInt(process.env.START_STEP ?? "0", 10);
  const endStep   = options.endStep   ?? parseInt(process.env.END_STEP   ?? String(steps.length), 10);

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
        console.log(`Parallel group: ${group.map(g => g.step.name).join(", ")}`);
        console.log("=".repeat(60));

        const results = await Promise.allSettled(
          group.map(({ step, index }) =>
            runSingleStep(step, index, steps.length, metrics, log, errors)
          )
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
      log.warn(`Pipeline completed with ${errors.length} error(s)`, { errors: errors.map(e => e.slice(0, 150)) });
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
    const msg = `Step ${index + 1} (${step.name}) failed after ${elapsed}s: ${err}`;
    metrics.endStep("error", String(err));
    stepLog.error(msg);
    errors.push(msg);
    // Continue to next step instead of crashing
  }
}

/**
 * Print a human-readable performance summary after the pipeline run.
 */
function printPerformanceSummary(
  metrics: ReturnType<typeof resetMetrics>,
  parallel: boolean,
): void {
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
      opts.startStep = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--end=")) {
      opts.endStep = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: node dist/pipeline/runner.js [options]

Options:
  --parallel       Run independent steps concurrently (catalog, organizer, markdown)
  --start=N        Start from step N (0-indexed)
  --end=N          End at step N (exclusive, 0-indexed)
  -h, --help       Show this help

Environment variables:
  START_STEP                 Same as --start
  END_STEP                   Same as --end
  PROPERTIES_CONCURRENCY     Number of parallel ffprobe workers (default: 8)
  SANDBOX_MAX_AGE_DAYS       Auto-cleanup sandbox dirs older than N days (default: 7)
`);
      process.exit(0);
    }
  }

  runFullPipeline(opts).catch(err => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
