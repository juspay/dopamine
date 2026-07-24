// Triage agent: assign each classified video an actionability tier BEFORE the
// expensive apply-loop runs, so only apply-now / evaluate-later reach analysis,
// mapping, and briefs. Runs after classification, before knowledge extraction.

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import type { NeuroLink } from "@juspay/neurolink";
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";
import { type Tier, type TriageFile, TriageLLMSchema, feedsApplyLoop } from "../schemas/triage.js";
import type { MetadataEntry } from "../types/index.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { exponentialBackoff } from "../utils/rate-limit.js";
import { makeVideoId } from "../utils/video-id.js";
import type { ClassificationEntry } from "./classifier.js";

export interface TriageInput {
  category: string;
  subcategory: string;
  tags: string[];
  description: string;
  caption: string;
}

const US = String.fromCharCode(31);

export function triageInput(cls: ClassificationEntry, caption: string): TriageInput {
  return {
    category: cls.category ?? "",
    subcategory: cls.subcategory ?? "",
    tags: cls.tags ?? [],
    description: cls.description ?? "",
    caption: caption ?? "",
  };
}

/** Stable hash over the classifier signal + model — re-triage only on change.
 *  Tags are JSON-encoded (not comma-joined) so a tag containing a comma can't
 *  collide with a differently-split tag array (["a,b"] vs ["a","b"]). */
export function triageHash(input: TriageInput, model: string): string {
  const parts = [
    model,
    input.category,
    input.subcategory,
    JSON.stringify([...input.tags].sort()),
    input.description,
    input.caption,
  ];
  return createHash("sha256").update(parts.join(US)).digest("hex");
}

export function triagePrompt(input: TriageInput): string {
  return [
    "Triage this saved social video into ONE actionability tier, for a software engineer / AI builder who saves",
    "videos to learn from and apply to their software projects.",
    "",
    "Tiers:",
    "- apply-now: a concrete tool, library, or technique they could adopt or implement in a software/AI project now",
    "  (dev tools, coding techniques, AI/ML methods, frameworks, product or growth tactics they could ship).",
    "- evaluate-later: professionally promising but needs assessment first — a trend to watch, a tool to pilot.",
    "- reference-only: genuine knowledge worth keeping and searching, but nothing to BUILD for their products —",
    "  domain facts, or a personal-life how-to (cooking, parenting, home, health, personal finance), or a concept.",
    "- skip: saved to enjoy, no learning intent — comedy, anime/manga, memes, aesthetics, vlogs, food/travel/decor showcases.",
    "",
    "Judge by what the video actually IS. Personal-life learnings (recipes, baby care, home decor) are reference-only",
    "or skip, NOT apply-now — they do not improve software products. Give tier, confidence (high|medium|low), and a",
    "short concrete reason (<120 chars).",
    "",
    "VIDEO:",
    `Category: ${input.category}${input.subcategory ? ` / ${input.subcategory}` : ""}`,
    `Tags: ${input.tags.join(", ") || "-"}`,
    `Description: ${input.description || "-"}`,
    `Caption: ${(input.caption || "-").slice(0, 500)}`,
  ].join("\n");
}

/** Validate/clamp the model output. Anything malformed → conservative reference-only. */
export function parseTriage(raw: unknown): { tier: Tier; confidence: "high" | "medium" | "low"; reason: string } {
  const parsed = TriageLLMSchema.safeParse(raw);
  if (!parsed.success) return { tier: "reference-only", confidence: "low", reason: "" };
  return {
    tier: parsed.data.tier,
    confidence: parsed.data.confidence,
    reason: parsed.data.reason.trim().slice(0, 160),
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface TriageDeps {
  classifications: Record<string, ClassificationEntry>;
  captionByPk: Map<string, string>;
  prior: TriageFile;
  model: string;
  generate: (prompt: string) => Promise<unknown>;
}

/** Incremental: re-triage only videos whose classifier signal (hash) changed. */
export async function runTriage(d: TriageDeps): Promise<TriageFile> {
  const out: TriageFile = {};
  for (const [filename, cls] of Object.entries(d.classifications)) {
    const id = makeVideoId(filename);
    // makeVideoId is not injective (two filenames differing only by a separator
    // char collapse to one id). Keep the first-seen entry deterministically
    // instead of letting a later collision silently overwrite a good tier.
    if (id in out) {
      console.warn(`  Triage id collision: "${filename}" → "${id}" already set; keeping first.`);
      continue;
    }
    const cached = d.prior[id];
    if (!cls.category || cls.error) {
      // Not currently classifiable (missing category or a transient classifier
      // error). Don't re-triage, but carry forward a prior verdict so a
      // transient error never wipes an already-good apply-now/evaluate-later tier.
      if (cached) out[id] = cached;
      continue;
    }
    const input = triageInput(cls, d.captionByPk.get(String(cls.pk ?? "")) ?? "");
    const hash = triageHash(input, d.model);
    if (cached && cached.hash === hash) {
      out[id] = cached;
      continue;
    }
    try {
      const { tier, confidence, reason } = parseTriage(await d.generate(triagePrompt(input)));
      out[id] = { tier, confidence, reason, hash };
    } catch (err) {
      // One bad video never aborts the run; keep prior if we have it.
      console.warn(`  Triage failed for ${id}: ${(err as Error).message}`);
      if (cached) out[id] = cached;
    }
  }
  return out;
}

async function loadJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
async function writeAtomic(file: string, data: string): Promise<void> {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, file);
}

export async function runTriageAgent(neurolink: NeuroLink): Promise<void> {
  console.log("\n=== Triage ===");
  const classifications = await loadState<Record<string, ClassificationEntry>>(CONFIG.STATE.CLASSIFICATIONS, {});
  const metadata = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
  const captionByPk = new Map(metadata.map((m) => [String(m.pk), (m as { caption_text?: string }).caption_text ?? ""]));
  const prior = await loadJson<TriageFile>(CONFIG.STATE.TRIAGE, {});

  // A `timeout` is mandatory here: without it a stalled Vertex call hangs the
  // whole step forever (the per-video try/catch never fires because the promise
  // never settles). Wrapped in exponentialBackoff so transient errors / rate
  // limits retry instead of dropping the video, matching the other agents.
  const generate = async (prompt: string): Promise<unknown> => {
    const result = await exponentialBackoff(
      async () => {
        const res = await neurolink.generate({
          input: { text: prompt },
          provider: "vertex",
          model: CONFIG.TRIAGE_MODEL,
          schema: TriageLLMSchema,
          output: { format: "json" },
          disableTools: true,
          timeout: "60s",
        });
        return safeJsonParse(res.content);
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_BASE_DELAY_MS,
    );
    if (!result.success) throw new Error(result.error);
    return result.value;
  };

  const triage = await runTriage({ classifications, captionByPk, prior, model: CONFIG.TRIAGE_MODEL, generate });
  await writeAtomic(CONFIG.STATE.TRIAGE, JSON.stringify(triage, null, 2));

  const counts: Record<string, number> = {};
  for (const e of Object.values(triage)) counts[e.tier] = (counts[e.tier] ?? 0) + 1;
  console.log(
    `  Triaged ${Object.keys(triage).length}: ${Object.entries(counts)
      .map(([t, n]) => `${t}=${n}`)
      .join(" ")}`,
  );
}

/** Load id → tier for downstream gates. Empty map when triage has never run. */
export async function loadTriageTiers(path: string = CONFIG.STATE.TRIAGE): Promise<Map<string, Tier>> {
  const file = await loadJson<TriageFile>(path, {});
  return new Map(Object.entries(file).map(([id, e]) => [id, e.tier]));
}

/**
 * Build the apply-loop admission predicate from a tier map. When triage has
 * never run (empty map) the gate is a NO-OP so the pipeline stays
 * backwards-compatible; otherwise only apply-now/evaluate-later ids pass, and an
 * un-triaged id defaults to not-eligible (it will be triaged next run).
 */
export function makeApplyGate(tiers: Map<string, Tier>): (id: string) => boolean {
  if (tiers.size === 0) return () => true;
  return (id) => feedsApplyLoop(tiers.get(id) ?? "reference-only");
}
