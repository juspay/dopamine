// Append-only usage log for the MCP server.
//
// Exists to answer one open question with data instead of a guess: low-confidence
// mappings are 22% of what find_for_project can return, and the prefilter floor
// sits below the medium threshold so everything it admits in that band can only
// ever be `low`. Whether that band earns its judge calls depends on whether
// anyone actually reads a low-confidence result — which nothing currently records.
//
// NOTE: stdout is the MCP transport. Nothing here may write to it, ever.

import { appendFile } from "node:fs/promises";
import type { Confidence } from "../agents/project-mapper.js";

export type UsageEntry =
  | { event: "call"; tool: string; ms: number; ok: boolean }
  | {
      event: "find_for_project";
      project: string;
      /** The floor the caller asked for; "low" is the tool's default. */
      minConfidence: Confidence;
      returned: number;
      byConfidence: Record<Confidence, number>;
    };

export type UsageLogger = (entry: UsageEntry) => void;

/** Count hits per confidence level. Pure — the unit under test. */
export function tallyConfidence(hits: readonly { confidence: Confidence }[]): Record<Confidence, number> {
  const out: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
  for (const h of hits) {
    // A row with an unrecognised confidence must not create a stray key that
    // downstream analysis would silently miss.
    if (h.confidence in out) out[h.confidence]++;
  }
  return out;
}

/** One JSONL record. Pure, so the shape is testable without touching a disk. */
export function formatEntry(entry: UsageEntry, at: string): string {
  return `${JSON.stringify({ at, ...entry })}\n`;
}

/**
 * File-backed logger. Best-effort by construction: telemetry must never break a
 * tool call, so every failure — unwritable path, full disk — is swallowed.
 *
 * Appends are serialised through a promise chain rather than fired in parallel.
 * Two concurrent appendFile calls can land out of order, and a large enough pair
 * can interleave mid-line and leave a record that will not parse. Chaining costs
 * nothing at this volume and makes the file safe to read line-by-line.
 */
export function createUsageLogger(filePath: string, now: () => string = () => new Date().toISOString()): UsageLogger {
  let queue: Promise<unknown> = Promise.resolve();
  return (entry) => {
    const line = formatEntry(entry, now());
    queue = queue.then(() => appendFile(filePath, line)).catch(() => {});
  };
}

/** Default for callers that have not opted in. */
export const noopUsageLogger: UsageLogger = () => {};
