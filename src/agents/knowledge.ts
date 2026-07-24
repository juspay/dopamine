// src/agents/knowledge.ts
import { type NeuroLink, NeuroLink as NeuroLinkClass } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { KnowledgeSchema, type Knowledge } from "../schemas/knowledge.js";
import { tolerantOutput } from "../schemas/tolerant.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { getThumbnailPath, extractVideoFrames } from "../utils/video.js";
import { isKnowledgeComplete, mergeKnowledge } from "./knowledge-merge.js";
import type { AcquiredAssets } from "../types/index.js";
import type { LaneItem } from "../pipeline/lanes.js";

interface ClassificationEntry {
  pk?: string | null;
  category?: string;
  error?: string;
}

interface KnowledgeEntry extends Knowledge {
  filename: string;
  category: string;
  error?: string;
  low_content?: boolean;
}

export const KNOWLEDGE_PROMPT = `
Analyze this video in extreme detail. Extract all knowledge content.

You MUST provide:
1. A complete, word-for-word transcript of ALL speech. Include speaker labels if multiple speakers.
   If there is no speech, describe the audio in detail.
2. A detailed visual description of everything shown on screen — slides, code, demos, websites,
   apps, text overlays, diagrams. Include timestamps inline where content changes.
3. Every URL, website, tool, product, or resource mentioned or shown — with timestamps.
4. Key takeaways as bullet points — the genuine, specific lessons, steps, tools, or facts the video
   actually conveys. For tutorial/product/educational videos, produce 3-7 concrete takeaways.
   For pure entertainment, aesthetic, or personal-lifestyle content with no real lesson, it is fine to
   return few or zero takeaways rather than inventing them — do NOT manufacture actionable-sounding
   takeaways for content that has none.
5. All specific topics and technologies discussed (or themes for non-technical videos).

Be extremely thorough. Do not summarize — capture everything.
Return ONLY valid JSON matching the schema provided. No markdown fences.`;

const FRAMES_ONLY_NOTE =
  "\n\nNote: You are analyzing video frames (images), not the full video file. " +
  "Audio/speech is not available. For the transcript field, describe any visible text, captions, " +
  "speech bubbles, or on-screen text you can read. If none is visible, set it to an empty string.";

const TRANSCRIPT_WITH_FRAMES_NOTE =
  "\n\nOfficial transcript provided — use it verbatim for the transcript field. " +
  "Analyze the video frames for visual_description, topics, key_takeaways, and links_and_resources.";

const MIN_VISUAL_CHARS = parseInt(process.env.MIN_VISUAL_CHARS ?? "200", 10);

export interface KnowledgeRequest {
  input: { text: string; images?: Buffer[]; files?: string[] };
  transcriptOverride: string | null;
}

/** Build the NeuroLink input from resolved assets + pre-extracted frames.
 *  Priority: frames (+optional transcript) → transcript-only → thumbnail/video file → text-only. */
export function buildKnowledgeRequest(assets: AcquiredAssets, frames: Buffer[] | null): KnowledgeRequest {
  if (frames !== null && frames.length > 0) {
    if (assets.transcriptText !== null) {
      return {
        input: { text: KNOWLEDGE_PROMPT + TRANSCRIPT_WITH_FRAMES_NOTE, images: frames },
        transcriptOverride: assets.transcriptText,
      };
    }
    return {
      input: { text: KNOWLEDGE_PROMPT + FRAMES_ONLY_NOTE, images: frames },
      transcriptOverride: null,
    };
  }

  if (assets.transcriptText !== null) {
    return {
      input: { text: KNOWLEDGE_PROMPT + "\n\nOfficial transcript:\n" + assets.transcriptText },
      transcriptOverride: assets.transcriptText,
    };
  }

  // File fallback — guard against both null (never path.resolve("")).
  const filePath = assets.thumbnailPath ?? assets.videoPath;
  if (filePath === null) {
    return { input: { text: KNOWLEDGE_PROMPT }, transcriptOverride: null };
  }
  return { input: { text: KNOWLEDGE_PROMPT, files: [path.resolve(filePath)] }, transcriptOverride: null };
}

export async function runKnowledgeAgent(neurolink: NeuroLink, laneItems?: LaneItem[]): Promise<void> {
  const classifications = await loadState<Record<string, ClassificationEntry>>(CONFIG.STATE.CLASSIFICATIONS, {});
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(CONFIG.STATE.KNOWLEDGE_BASE, {});
  const laneMap = new Map<string, LaneItem>((laneItems ?? []).map((l) => [l.item.id, l]));

  const targetVideos = Object.entries(classifications).filter(([, cls]) => cls.category && !cls.error);
  console.log(`Knowledge extraction: ${targetVideos.length} classified videos`);

  let extracted = 0,
    skipped = 0,
    errors = 0;

  for (const [i, [filename, cls]] of targetVideos.entries()) {
    const logPrefix = `[${i + 1}/${targetVideos.length}]`;
    const existing = knowledgeBase[filename];
    const visualLen = String(existing?.visual_description ?? "").trim().length;
    const takeawayCount = Array.isArray(existing?.key_takeaways) ? existing!.key_takeaways.length : 0;

    if (isKnowledgeComplete(existing, MIN_VISUAL_CHARS)) {
      skipped++;
      console.log(`${logPrefix} SKIP (already extracted): ${filename}`);
      continue;
    }
    if (existing?.low_content) {
      skipped++;
      console.log(`${logPrefix} SKIP (known low-content): ${filename}`);
      continue;
    }
    if (existing?.error) console.log(`${logPrefix} RETRY (previous error): ${filename}`);
    else if (existing)
      console.log(`${logPrefix} RE-EXTRACT (thin: visual=${visualLen}c, takeaways=${takeawayCount}): ${filename}`);

    // Resolve assets: prefer pre-acquired lane assets; else legacy IG file resolution.
    let resolvedAssets: AcquiredAssets;
    const lane = laneMap.get(filename);
    if (lane) {
      resolvedAssets = lane.assets;
    } else {
      const videoPath = path.join(CONFIG.VIDEOS_DIR, filename);
      try {
        await fs.access(videoPath);
      } catch {
        // videoPath is a local filesystem path (VIDEOS_DIR + filename), not a
        // secret — CodeQL's clear-text-logging heuristic is a false positive here.
        console.warn(`${logPrefix} SKIP (file not found): ${videoPath}`); // codeql[js/clear-text-logging]
        continue;
      }
      const { size } = await fs.stat(videoPath);
      resolvedAssets =
        size > CONFIG.VIDEO_SIZE_THRESHOLD_BYTES
          ? { videoPath, thumbnailPath: (await getThumbnailPath(filename)) ?? videoPath, transcriptText: null }
          : { videoPath, thumbnailPath: null, transcriptText: null };
    }

    // Extract frames whenever an in-threshold mp4 is present. A thumbnail being set
    // (the IG lane always provides one) must NOT suppress frame extraction — frames are
    // preferred; the thumbnail is only a fallback when frames are unavailable.
    let frames: Buffer[] | null = null;
    if (resolvedAssets.videoPath !== null) {
      try {
        const { size } = await fs.stat(resolvedAssets.videoPath);
        if (size <= CONFIG.VIDEO_SIZE_THRESHOLD_BYTES) {
          const f = await extractVideoFrames(resolvedAssets.videoPath, 10);
          frames = f.length > 0 ? f : null;
          // If frame extraction failed and no thumbnail is set yet, fall back to one.
          if (frames === null && resolvedAssets.thumbnailPath === null) {
            resolvedAssets = {
              ...resolvedAssets,
              thumbnailPath: (await getThumbnailPath(filename)) ?? resolvedAssets.videoPath,
            };
          }
        }
      } catch {
        frames = null;
      }
    }

    console.log(`${logPrefix} Extracting knowledge: ${filename} (category: ${cls.category})`);
    const req = buildKnowledgeRequest(resolvedAssets, frames);

    const result = await exponentialBackoff(
      async () => {
        const nl = new NeuroLinkClass();
        const response = await nl.generate({
          input: req.input,
          provider: "vertex",
          model: CONFIG.MODEL,
          schema: KnowledgeSchema,
          output: { format: "json" },
          disableTools: true,
          maxTokens: 16384,
          timeout: "180s",
        });
        const raw = safeJsonParse(response.content) as Record<string, unknown>;
        if (raw && typeof raw === "object") {
          for (const f of ["transcript", "visual_description"]) {
            if (raw[f] === null || raw[f] === undefined) raw[f] = "";
            else if (Array.isArray(raw[f])) raw[f] = (raw[f] as string[]).join("\n");
            else if (typeof raw[f] === "object") raw[f] = JSON.stringify(raw[f]);
            else if (typeof raw[f] !== "string") raw[f] = String(raw[f] ?? "");
          }
          for (const f of ["key_takeaways", "topics", "links_and_resources"]) {
            if (!Array.isArray(raw[f])) raw[f] = raw[f] ? [raw[f]] : [];
          }
          // Takeaways are now structured {timestamp, takeaway}; lift any bare-string
          // element (legacy / occasional model output) into that shape so it isn't
          // lost by the object-coercing tolerant parse.
          if (Array.isArray(raw.key_takeaways)) {
            raw.key_takeaways = (raw.key_takeaways as unknown[]).map((t) =>
              typeof t === "string" ? { timestamp: "", takeaway: t } : t,
            );
          }
        }
        return tolerantOutput(KnowledgeSchema).parse(raw);
      },
      CONFIG.MAX_RETRIES,
      CONFIG.RETRY_BASE_DELAY_MS,
    );

    if (result.success) {
      const merged = mergeKnowledge(result.value, existing);
      if (req.transcriptOverride !== null) merged.transcript = req.transcriptOverride; // authoritative captions
      const isComplete = isKnowledgeComplete(merged, MIN_VISUAL_CHARS);
      knowledgeBase[filename] = {
        filename,
        category: cls.category ?? "",
        ...merged,
        ...(isComplete ? {} : { low_content: true }),
      };
      extracted++;
      console.log(
        `  -> visual ${String(merged.visual_description).length}c, transcript ${merged.transcript.length}c, ${merged.topics.length} topics, ${merged.key_takeaways.length} takeaways, ${merged.links_and_resources.length} links`,
      );
      if (!isComplete) console.log(`  -> marked low_content (still thin after extraction)`);
    } else {
      const hasPriorContent =
        existing &&
        !existing.error &&
        ((existing.transcript && existing.transcript.length > 0) ||
          (existing.visual_description && existing.visual_description.length > 0) ||
          (Array.isArray(existing.key_takeaways) && existing.key_takeaways.length > 0) ||
          (Array.isArray(existing.topics) && existing.topics.length > 0));
      if (hasPriorContent) {
        knowledgeBase[filename] = { ...existing!, error: result.error };
        console.warn(`  -> Preserved prior content; error marked for retry: ${result.error.slice(0, 120)}`);
      } else {
        knowledgeBase[filename] = {
          filename,
          category: cls.category ?? "",
          transcript: existing?.transcript ?? "",
          visual_description: existing?.visual_description ?? "",
          links_and_resources: existing?.links_and_resources ?? [],
          key_takeaways: existing?.key_takeaways ?? [],
          topics: existing?.topics ?? [],
          error: result.error,
        };
      }
      errors++;
    }

    await saveState(CONFIG.STATE.KNOWLEDGE_BASE, knowledgeBase);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nKnowledge extraction done. Extracted: ${extracted}, Skipped: ${skipped}, Errors: ${errors}`);
}
