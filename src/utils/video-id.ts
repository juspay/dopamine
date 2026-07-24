/**
 * Canonical video id used across the search index, mappings, dashboard, and
 * triage: the filename stem (minus .mp4) with URL/file-unsafe chars replaced.
 * Previously duplicated verbatim in indexer.ts and data-builder.ts — the id
 * MUST be identical everywhere or cross-stage lookups (e.g. triage gates) break.
 */
export function makeVideoId(filename: string): string {
  const stem = filename.endsWith(".mp4") ? filename.slice(0, -4) : filename;
  return stem.replace(/[^A-Za-z0-9._-]/g, "_");
}
