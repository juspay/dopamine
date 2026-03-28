import { type NeuroLink } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { ClassificationSchema, type Classification } from "../schemas/classification.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { getVideoFiles, extractPkFromFilename, getThumbnailPath } from "../utils/video.js";
import type { MetadataEntry } from "../types/index.js";

interface ClassificationEntry extends Classification {
  pk: string | null;
  code: string | null;
  username: string | null;
  error?: string;
}

const CLASSIFY_PROMPT = (username: string, caption: string, hashtags: string) => `
Analyze this video and its Instagram metadata. Return a JSON object with the classification.

Instagram metadata:
- Username: ${username}
- Caption: ${caption}
- Hashtags: ${hashtags}

Return ONLY valid JSON matching the schema provided. No markdown fences.`;

export async function runClassifierAgent(neurolink: NeuroLink): Promise<void> {
  const classifications = await loadState<Record<string, ClassificationEntry>>(
    CONFIG.STATE.CLASSIFICATIONS, {}
  );
  const metadata = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);

  // Build pk -> metadata lookup (mirrors classify_videos.py:load_metadata)
  const pkLookup = new Map(metadata.map(m => [String(m.pk), m]));

  const videoFiles = await getVideoFiles(CONFIG.VIDEOS_DIR);
  let classified = 0, skipped = 0, errors = 0;

  for (const [i, videoPath] of videoFiles.entries()) {
    const filename = path.basename(videoPath);
    const logPrefix = `[${i + 1}/${videoFiles.length}]`;

    // Resume mode -- skip already classified
    if (filename in classifications) {
      skipped++;
      console.log(`${logPrefix} SKIP (already classified): ${filename}`);
      continue;
    }

    const pk = extractPkFromFilename(filename);
    const meta = pk ? pkLookup.get(pk) : undefined;

    const { size } = await fs.stat(videoPath);
    const useThumbnail = size > CONFIG.VIDEO_SIZE_THRESHOLD_BYTES;
    const inputFile = useThumbnail
      ? (await getThumbnailPath(filename) ?? videoPath)
      : videoPath;

    if (useThumbnail) {
      console.log(`${logPrefix} Large file (${(size / 1024 / 1024).toFixed(1)}MB), using thumbnail`);
    }

    const username  = meta?.username ?? "unknown";
    const caption   = meta?.caption_text ?? "";
    const hashtags  = (caption.match(/#\w+/g) ?? []).join(", ");

    console.log(`${logPrefix} Classifying: ${filename}`);
    console.log(`  User: ${username} | Caption: ${caption.slice(0, 60)}...`);

    const result = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: {
          text: CLASSIFY_PROMPT(username, caption, hashtags),
          files: [path.resolve(inputFile)],  // Must be absolute path
        },
        provider: "vertex",
        model:    CONFIG.MODEL,
        schema:   ClassificationSchema,
        output:   { format: "json" },
        disableTools: true,  // REQUIRED: Gemini rejects tools + JSON schema together
        maxTokens: 1024,
        timeout: "120s",
      });
      return ClassificationSchema.parse(safeJsonParse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      classifications[filename] = {
        pk:       pk ?? null,
        code:     meta?.code ?? null,
        username: meta?.username ?? null,
        ...result.value,
      };
      classified++;
      console.log(`  -> ${result.value.category} / ${result.value.subcategory}`);
    } else {
      classifications[filename] = {
        pk: pk ?? null, code: meta?.code ?? null, username: meta?.username ?? null,
        category: "", subcategory: "", tags: [], description: "",
        language: "", mood: "",
        error: result.error,
      };
      errors++;
    }

    // Write after every item -- this is the resume mode guarantee
    await saveState(CONFIG.STATE.CLASSIFICATIONS, classifications);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nClassifier done. Classified: ${classified}, Skipped: ${skipped}, Errors: ${errors}`);
}
