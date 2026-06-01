import { type NeuroLink, NeuroLink as NeuroLinkClass } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { KnowledgeSchema, type Knowledge } from "../schemas/knowledge.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { getThumbnailPath, extractVideoFrames } from "../utils/video.js";

/** Classification entry shape -- only fields we need for filtering. */
interface ClassificationEntry {
  pk?: string | null;
  category?: string;
  error?: string;
}

/** Knowledge base entry stored in knowledge_base.json. */
interface KnowledgeEntry extends Knowledge {
  filename: string;
  category: string;
  error?: string;
  /** Set when the model returned entirely empty content after retries.
   *  Prevents infinite retry loops on videos the model can't extract anything from
   *  (typically entertainment/lifestyle content, or content that triggers the
   *  model to return prose instead of JSON). */
  low_content?: boolean;
}

const KNOWLEDGE_PROMPT = `
Analyze this video in extreme detail. Extract all knowledge content.

You MUST provide:
1. A complete, word-for-word transcript of ALL speech. Include speaker labels if multiple speakers.
   If there is no speech, describe the audio in detail.
2. A detailed visual description of everything shown on screen — slides, code, demos, websites,
   apps, text overlays, diagrams. Include timestamps inline where content changes.
3. Every URL, website, tool, product, or resource mentioned or shown — with timestamps.
4. 3-7 key takeaways as bullet points. ALWAYS produce at least 3 takeaways.
   For tutorial/educational videos, capture the actionable lessons or steps.
   For product/tool videos, describe what the product is and what makes it noteworthy.
   For entertainment/lifestyle/aesthetic content, describe the format, theme, mood, or
   what the viewer is meant to feel or learn from watching. Never return an empty list —
   every saved video has SOME reason it was saved; capture that reason as takeaways.
5. All specific topics and technologies discussed (or themes for non-technical videos).

Be extremely thorough. Do not summarize — capture everything.
Return ONLY valid JSON matching the schema provided. No markdown fences.`;

export async function runKnowledgeAgent(neurolink: NeuroLink): Promise<void> {
  // Load classifications to determine which videos need KB extraction
  const classifications = await loadState<Record<string, ClassificationEntry>>(
    CONFIG.STATE.CLASSIFICATIONS, {}
  );

  // Load existing knowledge base (single file for all categories)
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(
    CONFIG.STATE.KNOWLEDGE_BASE, {}
  );

  // Process all classified videos (skip only if error or no category)
  const targetVideos = Object.entries(classifications).filter(
    ([, cls]) => cls.category && !cls.error
  );

  console.log(`Knowledge extraction: ${targetVideos.length} classified videos`);

  let extracted = 0, skipped = 0, errors = 0;

  for (const [i, [filename, cls]] of targetVideos.entries()) {
    const logPrefix = `[${i + 1}/${targetVideos.length}]`;

    // Resume mode -- skip if we have real content OR if we've already
    // determined the video has no extractable content (low_content flag).
    // Avoids infinite retries on videos the model can't process (entertainment/
    // lifestyle reels where it returns empty JSON or prose).
    const existing = knowledgeBase[filename];
    const hasContent = existing && !existing.error && existing.transcript &&
      Array.isArray(existing.key_takeaways) && existing.key_takeaways.length > 0;
    if (hasContent) {
      skipped++;
      console.log(`${logPrefix} SKIP (already extracted): ${filename}`);
      continue;
    }
    if (existing?.low_content) {
      skipped++;
      console.log(`${logPrefix} SKIP (known low-content video): ${filename}`);
      continue;
    }
    if (existing?.error) {
      console.log(`${logPrefix} RETRY (previous error): ${filename}`);
    } else if (existing) {
      console.log(`${logPrefix} RETRY (empty takeaways): ${filename}`);
    }

    const videoPath = path.join(CONFIG.VIDEOS_DIR, filename);

    // Check file exists
    try {
      await fs.access(videoPath);
    } catch {
      console.warn(`${logPrefix} SKIP (file not found): ${videoPath}`);
      continue;
    }

    const { size } = await fs.stat(videoPath);
    const useThumbnail = size > CONFIG.VIDEO_SIZE_THRESHOLD_BYTES;

    // Extract ≤10 evenly-spaced frames via ffmpeg. Bypasses NeuroLink's
    // VideoProcessor (no frame limit) and the AI SDK's image-only validation.
    let inputImages: Buffer[] | null = null;
    let inputFile: string | null = null;

    if (useThumbnail) {
      inputFile = await getThumbnailPath(filename) ?? videoPath;
      console.log(`${logPrefix} Large file (${(size / 1024 / 1024).toFixed(1)}MB), using thumbnail`);
    } else {
      inputImages = await extractVideoFrames(videoPath, 10);
      if (inputImages.length === 0) {
        inputFile = await getThumbnailPath(filename) ?? videoPath;
        console.log(`${logPrefix} Frame extraction failed, using thumbnail`);
      } else {
        console.log(`${logPrefix} Extracted ${inputImages.length} frames from ${(size / 1024 / 1024).toFixed(1)}MB video`);
      }
    }

    console.log(`${logPrefix} Extracting knowledge: ${filename}`);
    console.log(`  Category: ${cls.category}`);

    const result = await exponentialBackoff(async () => {
      // Use a fresh NeuroLink instance per video — shared instances accumulate
      // video keyframes in internal state across calls, overflowing Vertex's 16-image limit.
      const nl = new NeuroLinkClass();
      const prompt = inputImages
        ? KNOWLEDGE_PROMPT + "\n\nNote: You are analyzing video frames (images), not the full video file. " +
          "Audio/speech is not available. For the transcript field, describe any visible text, captions, " +
          "speech bubbles, or on-screen text you can read. If none is visible, set it to an empty string."
        : KNOWLEDGE_PROMPT;
      const response = await nl.generate({
        input: inputImages
          ? { text: prompt, images: inputImages }
          : { text: prompt, files: [path.resolve(inputFile!)] },
        provider: "vertex",
        model:    CONFIG.MODEL,
        schema:   KnowledgeSchema,
        output:   { format: "json" },
        disableTools: true,  // REQUIRED: Gemini rejects tools + JSON schema together
        maxTokens: 8192,
        timeout: "180s",
      });
      const raw = safeJsonParse(response.content) as Record<string, unknown>;
      // Normalize all fields: model may return nulls/wrong types when given only frames
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
      }
      return KnowledgeSchema.parse(raw);
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      // Detect totally-empty extractions — model either returned {} or prose that
      // normalized to nothing. Mark as low_content so we don't retry indefinitely.
      const isEmpty =
        !result.value.transcript &&
        !result.value.visual_description &&
        result.value.key_takeaways.length === 0 &&
        result.value.topics.length === 0 &&
        result.value.links_and_resources.length === 0;
      knowledgeBase[filename] = {
        filename,
        category: cls.category ?? "",
        ...result.value,
        ...(isEmpty ? { low_content: true } : {}),
      };
      extracted++;
      console.log(`  -> ${result.value.topics.length} topics, ${result.value.key_takeaways.length} takeaways`);
      console.log(`  -> ${result.value.links_and_resources.length} links/resources found`);
      if (isEmpty) console.log(`  -> marked as low_content (model returned empty)`);
    } else {
      // CRITICAL: Do NOT overwrite previously-good data with an empty error entry.
      // If the existing entry has any real content (transcript, topics, takeaways,
      // visual_description), preserve it and only update the error marker so the
      // next run will retry. This prevents a Vertex AI DNS/auth outage from
      // permanently wiping knowledge that was successfully extracted in a prior run.
      const hasPriorContent =
        existing &&
        !existing.error &&
        (
          (existing.transcript && existing.transcript.length > 0) ||
          (existing.visual_description && existing.visual_description.length > 0) ||
          (Array.isArray(existing.key_takeaways) && existing.key_takeaways.length > 0) ||
          (Array.isArray(existing.topics) && existing.topics.length > 0)
        );

      if (hasPriorContent) {
        // Keep all existing fields; only stamp the error so the next run re-attempts.
        knowledgeBase[filename] = { ...existing!, error: result.error };
        console.warn(`  -> Preserved prior content; error marked for retry: ${result.error.slice(0, 120)}`);
      } else {
        // No prior content — write a minimal retryable error entry.
        // Use empty arrays/strings rather than omitting fields so downstream
        // readers that expect the full KnowledgeEntry shape don't crash.
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

    // Write after every item -- resume mode guarantee
    await saveState(CONFIG.STATE.KNOWLEDGE_BASE, knowledgeBase);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nKnowledge extraction done. Extracted: ${extracted}, Skipped: ${skipped}, Errors: ${errors}`);
}
