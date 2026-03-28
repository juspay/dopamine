import { type NeuroLink } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { KnowledgeSchema, type Knowledge } from "../schemas/knowledge.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { getThumbnailPath } from "../utils/video.js";

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
}

const KNOWLEDGE_PROMPT = `
Analyze this video in extreme detail. Extract all knowledge content.

You MUST provide:
1. A complete, word-for-word transcript of ALL speech. Include speaker labels if multiple speakers.
   If there is no speech, describe the audio in detail.
2. A detailed visual description of everything shown on screen — slides, code, demos, websites,
   apps, text overlays, diagrams. Include timestamps inline where content changes.
3. Every URL, website, tool, product, or resource mentioned or shown — with timestamps.
4. 3-7 key takeaways as bullet points.
5. All specific topics and technologies discussed.

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

  // Filter to only target categories (AI & Machine Learning, Tech & Coding)
  const targetVideos = Object.entries(classifications).filter(
    ([, cls]) =>
      cls.category !== undefined &&
      CONFIG.KNOWLEDGE_TARGET_CATEGORIES.has(cls.category) &&
      !cls.error
  );

  console.log(`Knowledge extraction: ${targetVideos.length} videos in target categories`);
  console.log(`  Target categories: ${[...CONFIG.KNOWLEDGE_TARGET_CATEGORIES].join(", ")}`);

  let extracted = 0, skipped = 0, errors = 0;

  for (const [i, [filename, cls]] of targetVideos.entries()) {
    const logPrefix = `[${i + 1}/${targetVideos.length}]`;

    // Resume mode -- skip if already extracted without error
    if (filename in knowledgeBase && !knowledgeBase[filename].error) {
      skipped++;
      console.log(`${logPrefix} SKIP (already extracted): ${filename}`);
      continue;
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
    const inputFile = useThumbnail
      ? (await getThumbnailPath(filename) ?? videoPath)
      : videoPath;

    if (useThumbnail) {
      console.log(`${logPrefix} Large file (${(size / 1024 / 1024).toFixed(1)}MB), using thumbnail`);
    }

    console.log(`${logPrefix} Extracting knowledge: ${filename}`);
    console.log(`  Category: ${cls.category}`);

    const result = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: {
          text: KNOWLEDGE_PROMPT,
          files: [path.resolve(inputFile)],  // Must be absolute path
        },
        provider: "vertex",
        model:    CONFIG.MODEL,
        schema:   KnowledgeSchema,
        output:   { format: "json" },
        disableTools: true,  // REQUIRED: Gemini rejects tools + JSON schema together
        maxTokens: 8192,
        timeout: "180s",
      });
      return KnowledgeSchema.parse(safeJsonParse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      knowledgeBase[filename] = {
        filename,
        category: cls.category ?? "",
        ...result.value,
      };
      extracted++;
      console.log(`  -> ${result.value.topics.length} topics, ${result.value.key_takeaways.length} takeaways`);
      console.log(`  -> ${result.value.links_and_resources.length} links/resources found`);
    } else {
      knowledgeBase[filename] = {
        filename,
        category: cls.category ?? "",
        transcript: "",
        visual_description: "",
        links_and_resources: [],
        key_takeaways: [],
        topics: [],
        error: result.error,
      };
      errors++;
    }

    // Write after every item -- resume mode guarantee
    await saveState(CONFIG.STATE.KNOWLEDGE_BASE, knowledgeBase);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nKnowledge extraction done. Extracted: ${extracted}, Skipped: ${skipped}, Errors: ${errors}`);
}
