import { type NeuroLink } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { ClassificationSchema, CATEGORIES, type Classification } from "../schemas/classification.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { getVideoFiles, extractPkFromFilename, getThumbnailPath, extractVideoFrames } from "../utils/video.js";
import type { MetadataEntry, AcquiredAssets } from "../types/index.js";
import type { LaneItem } from "../pipeline/lanes.js";

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

CATEGORY RULES — pick exactly one from this closed list:
${CATEGORIES.map(c => `  - ${c}`).join("\n")}

Guidance (pick the BEST fit based on primary subject matter):
- Programming, dev tools, hardware, software tutorials → "Tech & Coding"
- LLMs, prompts, AI agents, ML tools, model demos → "AI & Machine Learning"
- Figma, design systems, UX, visual design → "UI/UX Design"
- Entrepreneurship, marketing, sales, ads → "Business & Marketing"
- Courses, study tips, learning techniques (non-tech) → "Education"
- Investing, personal finance, money → "Finance"
- Decor, renovation, home setup, gardening → "Interior Design & Home"
- Recipes, restaurants, drinks, food preparation → "Food & Cooking"
- Travel, fashion, day-in-the-life → "Travel & Lifestyle"
- Workout, nutrition, wellness → "Fitness & Health"
- Anime, comedy, memes, pop culture, music, animals, pets → "Entertainment & Comedy"
- Use "Other" ONLY when truly nothing else fits.

CRITICAL GUARDRAILS — these common errors must be avoided:
- A video featuring animals or pets (dogs, cats, etc.) is "Entertainment & Comedy", NOT "Tech & Coding" even if the caption uses words like "code", "app", or "algorithm".
- A lifestyle/aesthetic video with a tech-sounding caption is still "Travel & Lifestyle" or "Entertainment & Comedy".
- Only classify as "Tech & Coding" or "AI & Machine Learning" when the video PRIMARY SUBJECT is the technical content itself (a person screen-sharing, explaining code, demoing a tool, etc.).
- The category must match what the viewer WATCHES, not incidental words in the caption.

Return ONLY valid JSON matching the schema provided. No markdown fences.`;

export interface ClassifyRequest {
  input: { text: string; images?: Buffer[]; files?: string[] };
}

/** frames → images; else transcript → text-only; else thumbnail/video → files; else text-only. */
export function buildClassifyRequest(
  promptText: string,
  assets: AcquiredAssets,
  frames: Buffer[] | null,
): ClassifyRequest {
  if (frames !== null && frames.length > 0) return { input: { text: promptText, images: frames } };
  if (assets.transcriptText !== null) return { input: { text: promptText + "\n\nTranscript:\n" + assets.transcriptText } };
  const filePath = assets.thumbnailPath ?? assets.videoPath;
  if (filePath === null) return { input: { text: promptText } };
  return { input: { text: promptText, files: [path.resolve(filePath)] } };
}

export async function runClassifierAgent(neurolink: NeuroLink, laneItems?: LaneItem[]): Promise<void> {
  const classifications = await loadState<Record<string, ClassificationEntry>>(
    CONFIG.STATE.CLASSIFICATIONS, {}
  );

  // Multi-source path: classify items straight from acquired lanes (covers YouTube + IG).
  if (laneItems && laneItems.length > 0) {
    const CLASSIFY_FRAMES = parseInt(process.env.CLASSIFY_FRAMES ?? "3", 10);
    for (const [i, lane] of laneItems.entries()) {
      const filename = lane.item.id;
      const existing = classifications[filename];
      if (existing && existing.category && !existing.error) continue;
      const assets = lane.assets;
      let frames: Buffer[] | null = null;
      if (assets.videoPath) {
        const f = await extractVideoFrames(assets.videoPath, CLASSIFY_FRAMES);
        frames = f.length > 0 ? f : null;
      }
      const ig = lane.item.ig;
      const username = ig?.username ?? lane.item.author ?? "unknown";
      const caption = ig?.caption_text ?? lane.item.caption_text ?? lane.item.title ?? "";
      const hashtags = (caption.match(/#\w+/g) ?? []).join(", ");
      console.log(`[${i + 1}/${laneItems.length}] Classifying ${filename}`);
      const req = buildClassifyRequest(CLASSIFY_PROMPT(username, caption, hashtags), assets, frames);
      const result = await exponentialBackoff(async () => {
        const response = await neurolink.generate({
          input: req.input, provider: "vertex", model: CONFIG.MODEL,
          schema: ClassificationSchema, output: { format: "json" },
          disableTools: true, maxTokens: 1024, timeout: "120s",
        });
        return ClassificationSchema.parse(safeJsonParse(response.content));
      }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);
      classifications[filename] = result.success
        ? { pk: ig?.pk ?? null, code: ig?.code ?? null, username: ig?.username ?? null, ...result.value }
        : { pk: ig?.pk ?? null, code: ig?.code ?? null, username: ig?.username ?? null,
            category: "Other", subcategory: "", tags: [], description: "", language: "", mood: "", error: result.error };
      await saveState(CONFIG.STATE.CLASSIFICATIONS, classifications);
      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
    }
    return;
  }

  const metadata = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);

  // Build pk -> metadata lookup (mirrors classify_videos.py:load_metadata)
  const pkLookup = new Map(metadata.map(m => [String(m.pk), m]));

  const videoFiles = await getVideoFiles(CONFIG.VIDEOS_DIR);
  let classified = 0, skipped = 0, errors = 0;

  for (const [i, videoPath] of videoFiles.entries()) {
    const filename = path.basename(videoPath);
    const logPrefix = `[${i + 1}/${videoFiles.length}]`;

    // Resume mode -- skip if already classified with a valid category (no error)
    const existing = classifications[filename];
    if (existing && existing.category && !existing.error) {
      skipped++;
      console.log(`${logPrefix} SKIP (already classified): ${filename}`);
      continue;
    }
    if (existing && !existing.category) {
      console.log(`${logPrefix} RETRY (previously failed/empty category): ${filename}`);
    }

    const pk = extractPkFromFilename(filename);
    const meta = pk ? pkLookup.get(pk) : undefined;

    const { size } = await fs.stat(videoPath);
    const useThumbnail = size > CONFIG.VIDEO_SIZE_THRESHOLD_BYTES;

    // Extract ≤3 evenly-spaced frames via ffmpeg. Category classification doesn't
    // need 10 frames — caption + 3 keyframes is sufficient and 3x faster.
    const CLASSIFY_FRAMES = parseInt(process.env.CLASSIFY_FRAMES ?? "3", 10);
    let frames: Buffer[] | null = null;
    if (useThumbnail) {
      console.log(`${logPrefix} Large file (${(size / 1024 / 1024).toFixed(1)}MB), using thumbnail`);
    } else {
      const extracted = await extractVideoFrames(videoPath, CLASSIFY_FRAMES);
      if (extracted.length === 0) {
        console.log(`${logPrefix} Frame extraction failed, using thumbnail`);
      } else {
        console.log(`${logPrefix} Extracted ${extracted.length} frames (${(size / 1024 / 1024).toFixed(1)}MB)`);
        frames = extracted;
      }
    }

    // Fall back to thumbnail if large or ffmpeg failed
    const thumbnailPath = frames === null ? (await getThumbnailPath(filename) ?? videoPath) : null;
    const assets: AcquiredAssets = { videoPath, thumbnailPath, transcriptText: null };

    const username  = meta?.username ?? "unknown";
    const caption   = meta?.caption_text ?? "";
    const hashtags  = (caption.match(/#\w+/g) ?? []).join(", ");

    console.log(`${logPrefix} Classifying: ${filename}`);
    console.log(`  User: ${username} | Caption: ${caption.slice(0, 60)}...`);

    const req = buildClassifyRequest(CLASSIFY_PROMPT(username, caption, hashtags), assets, frames);
    const result = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: req.input,
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
        category: "Other", subcategory: "", tags: [], description: "",
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
