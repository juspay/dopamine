// src/__tests__/metrics.test.ts
import { describe, expect, it } from "vitest";
import { MetricsCollector } from "../utils/metrics.js";

/** Build a collector with one completed step that reported `counts`. */
function runStep(counts?: Parameters<MetricsCollector["recordCounts"]>[0]) {
  const m = new MetricsCollector();
  m.startStep("Example step");
  m.recordCounts(counts);
  m.endStep("success");
  return m.build();
}

describe("MetricsCollector.recordCounts", () => {
  it("rolls a step's returned counts into the run summary", () => {
    const { summary } = runStep({ processed: 5, skipped: 2, errored: 1 });
    expect(summary.totalItemsProcessed).toBe(5);
    expect(summary.totalItemsSkipped).toBe(2);
    expect(summary.totalItemsErrored).toBe(1);
  });

  it("attributes the counts to the step that reported them", () => {
    const { steps } = runStep({ processed: 7 });
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ step: "Example step", itemsProcessed: 7 });
  });

  it("treats a step that returns nothing as zero, not as an error", () => {
    const { summary } = runStep(undefined);
    expect(summary.totalItemsProcessed).toBe(0);
    expect(summary.totalItemsErrored).toBe(0);
  });

  it("accepts a partial count object without inventing the missing fields", () => {
    const { summary } = runStep({ processed: 3 });
    expect(summary.totalItemsProcessed).toBe(3);
    expect(summary.totalItemsSkipped).toBe(0);
  });

  it("sums counts across every step in the run", () => {
    const m = new MetricsCollector();
    for (const n of [4, 6]) {
      m.startStep(`step-${n}`);
      m.recordCounts({ processed: n });
      m.endStep("success");
    }
    expect(m.build().summary.totalItemsProcessed).toBe(10);
  });

  it("ignores counts reported outside a step, so they cannot inflate the total", () => {
    const m = new MetricsCollector();
    m.recordCounts({ processed: 99 });
    expect(m.build().summary.totalItemsProcessed).toBe(0);
  });
});

describe("MetricsCollector.build", () => {
  it("reports the summary without writing anything to disk", () => {
    // build() is the pure half of save(); tests must never clobber the real
    // videos/pipeline-metrics.json that the scheduled run owns.
    const m = new MetricsCollector();
    m.startStep("s");
    m.endStep("success");
    const metrics = m.build();
    expect(metrics.summary.totalSteps).toBe(1);
    expect(metrics.summary.succeeded).toBe(1);
    expect(metrics.runId).toMatch(/^run-/);
  });
});
