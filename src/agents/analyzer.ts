/**
 * AnalyzerAgent — Step 12
 *
 * For each knowledge base entry, uses Gemini to analyze and extract
 * actionable items (tools to install, code snippets, API setups, workflows, techniques).
 *
 * State: videos/analysis.json (keyed by filename, resume support)
 */

import { type NeuroLink } from "@juspay/neurolink";
import path from "node:path";
import fs from "node:fs/promises";
import { AnalysisSchema, type Analysis } from "../schemas/analysis.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { safeJsonParse } from "../utils/json-repair.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { getThumbnailPath } from "../utils/video.js";

/** Knowledge base entry shape — only fields we need. */
interface KnowledgeEntry {
  filename: string;
  category: string;
  transcript?: string;
  visual_description?: string;
  links_and_resources?: Array<{ url?: string | null; description?: string; timestamp?: string }>;
  key_takeaways?: string[];
  topics?: string[];
  error?: string;
}

/** Analysis entry stored in analysis.json. */
export interface AnalysisEntry extends Analysis {
  filename: string;
  category: string;
  error?: string;
}

const ANALYSIS_PROMPT = `You are an expert technology analyst. Extract ALL actionable items from this video knowledge-base entry.

**Extraction rules — be aggressive about extracting:**
- Look at EVERY field: transcript, visual_description, key_takeaways, topics, links_and_resources. Often the transcript is short but visual_description names specific tools.
- A tool/website mentioned by name (e.g. "Lordicon", "Figma", "Vertex AI", "BigQuery") IS an actionable item of type "tool_install" or "api_setup". Extract it even without an install command.
- A technique or workflow described in steps (e.g. "create a sitemap and submit it") IS an actionable item of type "workflow" or "technique".
- A GitHub repo or website URL IS an actionable item — extract it with the URL filled in.
- Empty array [] is ONLY valid for genuinely non-actionable content (pure entertainment, pet videos, decor showcases with no tools mentioned). If ANY tool/technique is named in any field, extract it.

For each actionable item:
- type: "tool_install" | "code_snippet" | "api_setup" | "workflow" | "technique"
- name: tool/technique name
- description: step-by-step implementation
- install_command: shell command if applicable, else ""
- code: code snippet if applicable, else ""
- url: URL if applicable, else ""
- verification_steps: list of steps to verify it works

Also rate:
- implementability_score: 0-10 (10 = ready-to-run command, 5 = needs setup, 2 = conceptual technique)
- usefulness_prediction: "highly_useful" | "useful" | "somewhat_useful" | "not_useful"

Return ONLY valid JSON matching the schema. No markdown fences.`;

function buildContextPrompt(entry: KnowledgeEntry): string {
  const parts: string[] = [ANALYSIS_PROMPT, "\n\n--- VIDEO KNOWLEDGE BASE ENTRY ---\n"];

  parts.push(`Category: ${entry.category}`);

  if (entry.transcript) {
    parts.push(`\nTranscript:\n${entry.transcript}`);
  }

  if (entry.visual_description) {
    parts.push(`\nVisual Description:\n${entry.visual_description}`);
  }

  if (entry.key_takeaways && entry.key_takeaways.length > 0) {
    parts.push(`\nKey Takeaways:\n${entry.key_takeaways.map(t => `- ${t}`).join("\n")}`);
  }

  if (entry.topics && entry.topics.length > 0) {
    parts.push(`\nTopics: ${entry.topics.join(", ")}`);
  }

  if (entry.links_and_resources && entry.links_and_resources.length > 0) {
    parts.push(`\nLinks & Resources:`);
    for (const link of entry.links_and_resources) {
      parts.push(`  - ${link.url ?? "N/A"}: ${link.description ?? ""}`);
    }
  }

  return parts.join("\n");
}

export async function runAnalyzerAgent(neurolink: NeuroLink): Promise<void> {
  console.log("\n=== AnalyzerAgent (Step 12) ===");

  // Load knowledge base
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(
    CONFIG.STATE.KNOWLEDGE_BASE, {}
  );

  // Load existing analysis state (resume mode)
  const analysisState = await loadState<Record<string, AnalysisEntry>>(
    CONFIG.STATE.ANALYSIS, {}
  );

  // Include entries that have ANY analysable content — transcript, visual_description,
  // key_takeaways, or topics. Videos with no speech (silent demos, screen recordings,
  // aesthetic content) have an empty transcript but carry rich visual_description +
  // key_takeaways that yield actionable items. Filtering on `entry.transcript` alone
  // permanently excluded these, so analysis was silently skipped for them.
  const entries = Object.entries(knowledgeBase).filter(([, entry]) => {
    if (entry.error) return false;
    return (
      Boolean(entry.transcript) ||
      Boolean(entry.visual_description) ||
      (Array.isArray(entry.key_takeaways) && entry.key_takeaways.length > 0) ||
      (Array.isArray(entry.topics) && entry.topics.length > 0)
    );
  });

  console.log(`Analysis: ${entries.length} knowledge base entries to analyze`);

  let analyzed = 0, skipped = 0, errors = 0;

  for (const [i, [filename, entry]] of entries.entries()) {
    const logPrefix = `[${i + 1}/${entries.length}]`;

    // Resume mode — skip if already analyzed without error
    if (filename in analysisState && !analysisState[filename].error) {
      skipped++;
      console.log(`${logPrefix} SKIP (already analyzed): ${filename}`);
      continue;
    }

    console.log(`${logPrefix} Analyzing: ${filename}`);
    console.log(`  Category: ${entry.category}`);

    // Try to get thumbnail for additional visual context
    const thumbPath = await getThumbnailPath(filename);
    const contextPrompt = buildContextPrompt(entry);

    const inputConfig: { text: string; files?: string[] } = {
      text: contextPrompt,
    };

    // Include thumbnail if available for additional context
    if (thumbPath) {
      inputConfig.files = [path.resolve(thumbPath)];
    }

    const result = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: inputConfig,
        provider: "vertex",
        model:    CONFIG.MODEL,
        schema:   AnalysisSchema,
        output:   { format: "json" },
        disableTools: true,  // REQUIRED: Gemini rejects tools + JSON schema together
        temperature: 0.1,    // Lower temp -> more deterministic extraction. Default 0.7
                             // was causing ~16% of entries to randomly return 0 items
                             // even when the KB content clearly listed tools.
        maxTokens: 8192,
        timeout: "180s",
      });
      return AnalysisSchema.parse(safeJsonParse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      analysisState[filename] = {
        filename,
        category: entry.category,
        ...result.value,
      };
      analyzed++;
      console.log(`  -> ${result.value.actionable_items.length} actionable items found`);
      console.log(`  -> Implementability: ${result.value.implementability_score}/10`);
      console.log(`  -> Usefulness: ${result.value.usefulness_prediction}`);
    } else {
      analysisState[filename] = {
        filename,
        category: entry.category,
        actionable_items: [],
        implementability_score: 0,
        usefulness_prediction: "not_useful",
        error: result.error,
      };
      errors++;
      console.error(`  -> ERROR: ${result.error}`);
    }

    // Write after every item — resume mode guarantee
    await saveState(CONFIG.STATE.ANALYSIS, analysisState);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nAnalysis done. Analyzed: ${analyzed}, Skipped: ${skipped}, Errors: ${errors}`);
}
