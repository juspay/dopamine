// Human verdicts on where a learning actually applies.
//
// Everything the mapper knows about its own accuracy is self-referential: the
// judge's confidence was uncorrelated with the evidence, and the derived
// confidence is a similarity proxy fitted to the corpus's own statistics. A
// human label is the only signal in the system that is not the system marking
// its own work, so it is stored separately from every generated file and is
// never overwritten by a pipeline step.

import { z } from "zod";

export const VERDICTS = ["applies", "none"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const LabelSchema = z.object({
  /** Projects the human says this genuinely applies to. Empty with verdict
   *  "applies" is not a contradiction to reject — it means "applies somewhere I
   *  have not named yet". */
  projects: z.array(z.string().min(1)).default([]),
  /** Free-form marks. Deliberately unconstrained: the point is to capture the
   *  distinctions the schema did not anticipate. */
  tags: z.array(z.string().min(1)).default([]),
  /** "none" is a POSITIVE datum — a confirmed non-match — and is what makes
   *  precision measurable at all. Absence of a label means unreviewed, which is
   *  a different thing entirely and must never be conflated with it. */
  verdict: z.enum(VERDICTS).default("applies"),
  note: z.string().max(2000).default(""),
  updatedAt: z.string(),
});
export type Label = z.infer<typeof LabelSchema>;

export const LabelsFileSchema = z.object({
  version: z.literal(1).default(1),
  labels: z.record(z.string(), LabelSchema).default({}),
});
export type LabelsFile = z.infer<typeof LabelsFileSchema>;

/**
 * What a client may send; server stamps updatedAt so a wrong clock cannot poison
 * ordering.
 *
 * Declared field-by-field rather than as `LabelSchema.partial()`, which looks
 * equivalent and is not: `.partial()` makes each key optional but leaves the
 * `.default()` on it intact, so zod MATERIALISES the default for any key the
 * client omitted. A patch of `{tags:["x"]}` arrived as
 * `{projects:[], tags:["x"], verdict:"applies", note:""}` and silently wiped the
 * projects — upsertLabel could not tell "not sent" from "explicitly cleared".
 * These must stay `.optional()` with NO defaults for a partial update to mean
 * what it says.
 */
export const LabelPatchSchema = z.object({
  projects: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  verdict: z.enum(VERDICTS).optional(),
  note: z.string().max(2000).optional(),
});
export type LabelPatch = z.infer<typeof LabelPatchSchema>;

export const EMPTY_LABELS: LabelsFile = { version: 1, labels: {} };

/** Keys that mean something to Object even when used as data. `__proto__` does
 *  not actually pollute here — a computed key in an object literal defines an
 *  OWN property — but `in` and bracket reads still consult the prototype chain,
 *  so an id of "toString" would report as an existing label that was never
 *  written. Rejecting them removes the whole class rather than each symptom. */
const RESERVED_IDS = new Set(["__proto__", "constructor", "prototype"]);

/** Ids are object keys, never paths — but they still reach a JSON file and index
 *  an object, so keep them to the shape the pipeline actually produces. */
export function isValidVideoId(id: string): boolean {
  if (id.length === 0 || id.length > 200) return false;
  if (RESERVED_IDS.has(id)) return false;
  if (Object.hasOwn(Object.prototype, id)) return false;
  return /^[A-Za-z0-9._-]+$/.test(id);
}

/** Own-property read. Bracket access alone would return inherited members —
 *  labels["toString"] is a function, not undefined. */
function ownLabel(file: LabelsFile, id: string): Label | undefined {
  return Object.hasOwn(file.labels, id) ? file.labels[id] : undefined;
}

const dedupe = (xs: string[]): string[] => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];

/**
 * Apply a patch to one video's label. Pure: the caller owns IO.
 * Absent fields are left as they were, so a UI that only edits tags cannot
 * silently clear the projects list.
 */
export function upsertLabel(file: LabelsFile, id: string, patch: LabelPatch, now: string): LabelsFile {
  const prev = ownLabel(file, id);
  const next: Label = {
    projects: dedupe(patch.projects ?? prev?.projects ?? []),
    tags: dedupe(patch.tags ?? prev?.tags ?? []),
    verdict: patch.verdict ?? prev?.verdict ?? "applies",
    note: (patch.note ?? prev?.note ?? "").slice(0, 2000),
    updatedAt: now,
  };
  return { ...file, labels: { ...file.labels, [id]: next } };
}

export function removeLabel(file: LabelsFile, id: string): LabelsFile {
  if (!Object.hasOwn(file.labels, id)) return file;
  const { [id]: _dropped, ...rest } = file.labels;
  return { ...file, labels: rest };
}

/** A label with no verdict-bearing content is noise from an accidental click. */
export function isEmptyLabel(l: Label): boolean {
  return l.verdict === "applies" && l.projects.length === 0 && l.tags.length === 0 && l.note.trim() === "";
}
