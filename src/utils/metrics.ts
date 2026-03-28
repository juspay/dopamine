import fs from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepMetric {
  step: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "success" | "error" | "skipped";
  error?: string;
  itemsProcessed: number;
  itemsSkipped: number;
  itemsErrored: number;
}

export interface ApiCallMetric {
  endpoint: string;
  count: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
}

export interface PipelineMetrics {
  runId: string;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  steps: StepMetric[];
  apiCalls: Record<string, ApiCallMetric>;
  summary: {
    totalSteps: number;
    succeeded: number;
    failed: number;
    skipped: number;
    totalItemsProcessed: number;
    totalItemsSkipped: number;
    totalItemsErrored: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METRICS_PATH = path.resolve("videos", "pipeline-metrics.json");

// ---------------------------------------------------------------------------
// MetricsCollector
// ---------------------------------------------------------------------------

export class MetricsCollector {
  private runId: string;
  private pipelineStart: number;
  private steps: StepMetric[] = [];
  private apiCalls: Map<string, { count: number; totalLatencyMs: number }> = new Map();

  // Per-step tracking
  private currentStep: string | null = null;
  private stepStart = 0;
  private stepItems = { processed: 0, skipped: 0, errored: 0 };

  constructor() {
    this.runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.pipelineStart = Date.now();
  }

  // ---- Step lifecycle -----------------------------------------------------

  startStep(name: string): void {
    this.currentStep = name;
    this.stepStart = Date.now();
    this.stepItems = { processed: 0, skipped: 0, errored: 0 };
  }

  endStep(status: "success" | "error" | "skipped", error?: string): void {
    if (!this.currentStep) return;
    const now = Date.now();
    this.steps.push({
      step: this.currentStep,
      startedAt: new Date(this.stepStart).toISOString(),
      finishedAt: new Date(now).toISOString(),
      durationMs: now - this.stepStart,
      status,
      error: error?.slice(0, 500),
      itemsProcessed: this.stepItems.processed,
      itemsSkipped: this.stepItems.skipped,
      itemsErrored: this.stepItems.errored,
    });
    this.currentStep = null;
  }

  // ---- Item counters ------------------------------------------------------

  recordProcessed(count = 1): void {
    this.stepItems.processed += count;
  }

  recordSkipped(count = 1): void {
    this.stepItems.skipped += count;
  }

  recordErrored(count = 1): void {
    this.stepItems.errored += count;
  }

  // ---- API call tracking --------------------------------------------------

  recordApiCall(endpoint: string, latencyMs: number): void {
    const existing = this.apiCalls.get(endpoint);
    if (existing) {
      existing.count += 1;
      existing.totalLatencyMs += latencyMs;
    } else {
      this.apiCalls.set(endpoint, { count: 1, totalLatencyMs: latencyMs });
    }
  }

  /** Convenience wrapper: time an async function and record it as an API call. */
  async timeApiCall<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      this.recordApiCall(endpoint, Date.now() - t0);
    }
  }

  // ---- Finalise & persist -------------------------------------------------

  async save(): Promise<PipelineMetrics> {
    const now = Date.now();

    const apiCallsRecord: Record<string, ApiCallMetric> = {};
    for (const [endpoint, data] of this.apiCalls) {
      apiCallsRecord[endpoint] = {
        endpoint,
        count: data.count,
        totalLatencyMs: data.totalLatencyMs,
        avgLatencyMs: Math.round(data.totalLatencyMs / data.count),
      };
    }

    const succeeded = this.steps.filter(s => s.status === "success").length;
    const failed = this.steps.filter(s => s.status === "error").length;
    const skipped = this.steps.filter(s => s.status === "skipped").length;

    const metrics: PipelineMetrics = {
      runId: this.runId,
      startedAt: new Date(this.pipelineStart).toISOString(),
      finishedAt: new Date(now).toISOString(),
      totalDurationMs: now - this.pipelineStart,
      steps: this.steps,
      apiCalls: apiCallsRecord,
      summary: {
        totalSteps: this.steps.length,
        succeeded,
        failed,
        skipped,
        totalItemsProcessed: this.steps.reduce((a, s) => a + s.itemsProcessed, 0),
        totalItemsSkipped: this.steps.reduce((a, s) => a + s.itemsSkipped, 0),
        totalItemsErrored: this.steps.reduce((a, s) => a + s.itemsErrored, 0),
      },
    };

    await fs.mkdir(path.dirname(METRICS_PATH), { recursive: true });
    await fs.writeFile(METRICS_PATH, JSON.stringify(metrics, null, 2), "utf8");
    return metrics;
  }
}

// ---------------------------------------------------------------------------
// Singleton for convenience
// ---------------------------------------------------------------------------

let _instance: MetricsCollector | null = null;

export function getMetrics(): MetricsCollector {
  if (!_instance) {
    _instance = new MetricsCollector();
  }
  return _instance;
}

/** Reset the singleton (call at the start of each pipeline run). */
export function resetMetrics(): MetricsCollector {
  _instance = new MetricsCollector();
  return _instance;
}
