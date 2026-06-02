/**
 * Pure helpers for knowledge-base completeness + non-regressing merge.
 *
 * Extracted from knowledge.ts so the skip/merge logic is unit-testable without
 * pulling in NeuroLink / Vertex. Two rules encoded here:
 *
 *  1. "Complete" requires a substantive visual_description AND >=3 takeaways.
 *     visual_description is the reliable completeness signal — every video has
 *     visuals, so an empty/near-empty one means frame analysis silently failed.
 *     (The original bug: the skip check only looked at transcript + takeaways, so
 *     entries with a good transcript but empty visual were frozen forever.)
 *
 *  2. A re-extraction must never REGRESS a field. Text fields keep the longer
 *     non-empty value (protects a rich audio transcript from the full-video era
 *     against a shorter frames-only on-screen-text transcript); list fields keep
 *     whichever extraction captured more items.
 */

import type { Knowledge } from "../schemas/knowledge.js";

/** Subset of a stored knowledge entry the completeness check needs. */
export interface CompletenessInput {
  visual_description?: unknown;
  key_takeaways?: unknown;
  error?: string;
}

/**
 * Coerce any stored field to a string. Legacy entries (ported from the Python
 * pipeline) may hold transcript/visual_description as an array or even a number,
 * so we must never assume `string` — that crashed the merge mid-run with
 * "(prev ?? "").trim is not a function".
 */
function asStr(x: unknown): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (Array.isArray(x)) return x.filter(Boolean).map(String).join("\n");
  return String(x);
}

/** True when an entry has substantive visual content and enough takeaways. */
export function isKnowledgeComplete(
  entry: CompletenessInput | undefined,
  minVisualChars: number,
  minTakeaways = 3
): boolean {
  if (!entry || entry.error) return false;
  const visualLen = asStr(entry.visual_description).trim().length;
  const takeaways = Array.isArray(entry.key_takeaways)
    ? entry.key_takeaways.length
    : 0;
  return visualLen >= minVisualChars && takeaways >= minTakeaways;
}

/** Keep the longer non-empty string (prev when next is blank). Type-safe. */
export function pickLonger(next: unknown, prev: unknown): string {
  const nStr = asStr(next);
  const pStr = asStr(prev);
  const n = nStr.trim();
  const p = pStr.trim();
  if (!n) return pStr;
  if (!p) return nStr;
  return n.length >= p.length ? nStr : pStr;
}

/** Keep whichever array has more items (ties favour the fresh extraction). */
export function pickMore<T>(next: unknown, prev: unknown): T[] {
  const n = Array.isArray(next) ? (next as T[]) : [];
  const p = Array.isArray(prev) ? (prev as T[]) : [];
  return n.length >= p.length ? n : p;
}

/**
 * Merge a fresh extraction with an existing entry so no field regresses.
 * Returns only the Knowledge content fields (caller adds filename/category).
 */
export function mergeKnowledge(
  next: Knowledge,
  existing: Partial<Knowledge> | undefined
): Knowledge {
  return {
    transcript:          pickLonger(next.transcript, existing?.transcript),
    visual_description:  pickLonger(next.visual_description, existing?.visual_description),
    links_and_resources: pickMore(next.links_and_resources, existing?.links_and_resources),
    key_takeaways:       pickMore(next.key_takeaways, existing?.key_takeaways),
    topics:              pickMore(next.topics, existing?.topics),
  };
}
