import { type NeuroLink, NeuroLink as NeuroLinkClass } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { LinksSchema, type Links } from "../schemas/links.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { getThumbnailPath, extractVideoFrames } from "../utils/video.js";

/** Knowledge base entry shape -- only fields we need. */
interface KnowledgeEntry {
  filename: string;
  error?: string;
}

/** Link entry stored in links_v2.json per video. */
interface LinkEntry {
  name: string;
  url: string | null;
  type: "shown_on_screen" | "mentioned_verbally" | "inferred_from_context";
  description: string;
  timestamp: string;
}

const LINK_EXTRACT_PROMPT = `
Watch this video carefully and extract EVERY link, URL, website, tool, product, or resource that is:
1. Shown on screen (URLs in browser bars, slides, code editors, terminal output)
2. Mentioned verbally (speaker says "go to example.com" or "check out Tool X")
3. Inferable from context (a known tool/product is being demonstrated)

For each link provide:
- name: The tool/product/resource name
- url: The full https:// URL if shown or known, null if truly unknown
- type: "shown_on_screen", "mentioned_verbally", or "inferred_from_context"
- description: What it is and why it's mentioned
- timestamp: Approximate timestamp in the video

Be exhaustive. Capture everything. Do not miss any URL that appears on screen even briefly.
Return ONLY valid JSON matching the schema provided. No markdown fences.`;

export async function runLinkExtractAgent(neurolink: NeuroLink): Promise<void> {
  // Load knowledge base to know which videos to process
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(
    CONFIG.STATE.KNOWLEDGE_BASE, {}
  );

  // Load existing links (may include error field from failed extractions)
  type LinksWithError = Links & { error?: string };
  const linksState = await loadState<Record<string, LinksWithError>>(
    CONFIG.STATE.LINKS_V2, {}
  );

  // Process all videos in the knowledge base (that don't have errors)
  const kbVideos = Object.entries(knowledgeBase).filter(
    ([, entry]) => !entry.error
  );

  console.log(`Link extraction: ${kbVideos.length} videos from knowledge base`);

  let extracted = 0, skipped = 0, errors = 0;

  for (const [i, [filename]] of kbVideos.entries()) {
    const logPrefix = `[${i + 1}/${kbVideos.length}]`;

    // Resume mode -- skip if already extracted successfully (no error field)
    const existing = linksState[filename];
    if (existing && !existing.error) {
      skipped++;
      console.log(`${logPrefix} SKIP (already extracted): ${filename}`);
      continue;
    }
    if (existing?.error) {
      console.log(`${logPrefix} RETRY (previous error): ${filename}`);
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

    let inputImages: Buffer[] | null = null;
    if (useThumbnail) {
      console.log(`${logPrefix} Large file (${(size / 1024 / 1024).toFixed(1)}MB), using thumbnail`);
    } else {
      inputImages = await extractVideoFrames(videoPath, 10);
      if (inputImages.length === 0) {
        console.log(`${logPrefix} Frame extraction failed, using thumbnail`);
      } else {
        console.log(`${logPrefix} Extracted ${inputImages.length} frames (${(size / 1024 / 1024).toFixed(1)}MB)`);
      }
    }

    let thumbnailInput: string | null = null;
    if (!inputImages || inputImages.length === 0) {
      thumbnailInput = await getThumbnailPath(filename) ?? videoPath;
    }

    console.log(`${logPrefix} Extracting links: ${filename}`);

    const result = await exponentialBackoff(async () => {
      // Fresh NeuroLink instance per video — shared instances accumulate keyframes
      // across calls, overflowing Vertex's 16-image limit.
      const nl = new NeuroLinkClass();
      const response = await nl.generate({
        input: inputImages
          ? { text: LINK_EXTRACT_PROMPT, images: inputImages }
          : { text: LINK_EXTRACT_PROMPT, files: [path.resolve(thumbnailInput!)] },
        provider: "vertex",
        model:    CONFIG.MODEL,
        schema:   LinksSchema,
        output:   { format: "json" },
        disableTools: true,  // REQUIRED: Gemini rejects tools + JSON schema together
        maxTokens: 4096,
        timeout: "120s",
      });
      return LinksSchema.parse(safeJsonParse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      linksState[filename] = result.value;
      extracted++;
      console.log(`  -> ${result.value.links.length} links found`);
    } else {
      linksState[filename] = { links: [], error: result.error };
      errors++;
      console.error(`  -> ERROR: ${result.error?.slice(0, 100)}`);
    }

    // Write after every item -- resume mode guarantee
    await saveState(CONFIG.STATE.LINKS_V2, linksState);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nLink extraction done. Extracted: ${extracted}, Skipped: ${skipped}, Errors: ${errors}`);
}
