/**
 * EnrichmentAgent — Step 16
 *
 * Updates the knowledge base files and dashboard with verification data:
 * - Adds verification badge and score to each KB entry
 * - Adds "Verification Report" section to markdown files
 * - Adds verification status to dashboard
 * - Rebuilds dashboard with new data
 *
 * State: Modifies knowledge_base.json, markdown files, and dashboard
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import type { AnalysisEntry } from "./analyzer.js";
import type { VerificationEntry } from "./verifier.js";

/** Knowledge base entry shape — extends with verification fields. */
interface KnowledgeEntry {
  filename: string;
  category: string;
  transcript?: string;
  visual_description?: string;
  links_and_resources?: Array<{ url?: string | null; description?: string; timestamp?: string }>;
  key_takeaways?: string[];
  topics?: string[];
  error?: string;
  // Enrichment fields
  verification_status?: string;
  verification_score?: number;
  verification_summary?: string;
  verification_date?: string;
  actionable_items_count?: number;
  implementability_score?: number;
}

/**
 * Get the badge emoji and text for a verification status.
 */
function getVerificationBadge(status: string): { badge: string; color: string } {
  switch (status) {
    case "verified_useful":
      return { badge: "VERIFIED USEFUL", color: "#4CAF50" };
    case "partially_verified":
      return { badge: "PARTIALLY VERIFIED", color: "#FFC107" };
    case "outdated":
      return { badge: "OUTDATED", color: "#F44336" };
    case "not_verified":
    default:
      return { badge: "NOT VERIFIED", color: "#9E9E9E" };
  }
}

/**
 * Generate a markdown verification report section.
 */
function generateVerificationMarkdown(
  analysis: AnalysisEntry,
  verification: VerificationEntry,
): string {
  const lines: string[] = [];
  const { badge } = getVerificationBadge(verification.overall_score);

  lines.push("## Verification Report");
  lines.push("");
  lines.push(`**Status:** ${badge}`);
  lines.push(`**Confidence:** ${verification.confidence}/10`);
  lines.push(`**Verified:** ${new Date(verification.verified_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
  lines.push(`**Implementability Score:** ${analysis.implementability_score}/10`);
  lines.push(`**Usefulness Prediction:** ${analysis.usefulness_prediction}`);
  lines.push("");
  lines.push(`> ${verification.summary}`);
  lines.push("");

  if (verification.item_results.length > 0) {
    lines.push("### Item Verification Results");
    lines.push("");
    lines.push("| Item | Implementation | URL Live | Notes |");
    lines.push("|------|---------------|----------|-------|");

    for (const item of verification.item_results) {
      const implStatus = item.implementation_result;
      const urlLive = item.is_url_live;
      const notes = item.notes.replace(/\|/g, "\\|").slice(0, 100);
      lines.push(`| ${item.item_name.replace(/\|/g, "\\|")} | ${implStatus} | ${urlLive} | ${notes} |`);
    }
    lines.push("");
  }

  if (analysis.actionable_items.length > 0) {
    lines.push("### Actionable Items");
    lines.push("");
    for (const item of analysis.actionable_items) {
      lines.push(`#### ${item.name}`);
      lines.push(`- **Type:** ${item.type}`);
      lines.push(`- **Description:** ${item.description}`);
      if (item.url) lines.push(`- **URL:** ${item.url}`);
      if (item.install_command) lines.push(`- **Install:** \`${item.install_command}\``);
      if (item.code) {
        lines.push(`- **Code:**`);
        lines.push("```");
        lines.push(item.code);
        lines.push("```");
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Sanitize a category name to a directory name (matches markdown.ts).
 */
function sanitizeDirname(name: string): string {
  name = name.replace(/[^\w\s\-&]/g, "");
  name = name.trim().replace(/\s+/g, "_");
  return name;
}

export async function runEnrichmentAgent(): Promise<void> {
  console.log("\n=== EnrichmentAgent (Step 16) ===");

  // Load all states
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(
    CONFIG.STATE.KNOWLEDGE_BASE, {}
  );
  const analysisState = await loadState<Record<string, AnalysisEntry>>(
    CONFIG.STATE.ANALYSIS, {}
  );
  const verificationState = await loadState<Record<string, VerificationEntry>>(
    CONFIG.STATE.VERIFICATIONS, {}
  );

  let enriched = 0;
  let markdownUpdated = 0;

  // 1. Enrich knowledge base entries with verification data
  console.log("Enriching knowledge base entries...");
  for (const [filename, verification] of Object.entries(verificationState)) {
    if (verification.error) continue;

    const kbEntry = knowledgeBase[filename];
    if (!kbEntry) continue;

    const analysis = analysisState[filename];

    // Add verification fields to KB entry
    kbEntry.verification_status = verification.overall_score;
    kbEntry.verification_score = verification.confidence;
    kbEntry.verification_summary = verification.summary;
    kbEntry.verification_date = verification.verified_at;
    kbEntry.actionable_items_count = analysis?.actionable_items?.length ?? 0;
    kbEntry.implementability_score = analysis?.implementability_score ?? 0;

    enriched++;
  }

  // Save enriched knowledge base
  await saveState(CONFIG.STATE.KNOWLEDGE_BASE, knowledgeBase);
  console.log(`  Enriched ${enriched} knowledge base entries`);

  // 2. Update markdown files with verification reports
  console.log("Updating markdown files...");
  const kbOutputDir = CONFIG.OUTPUT.KNOWLEDGE_BASE;

  for (const [filename, verification] of Object.entries(verificationState)) {
    if (verification.error) continue;

    const analysis = analysisState[filename];
    if (!analysis) continue;

    const category = analysis.category || "Uncategorized";
    const catDir = path.join(kbOutputDir, sanitizeDirname(category));
    const stem = filename.replace(".mp4", "");
    const mdPath = path.join(catDir, `${stem}.md`);

    try {
      let mdContent = await fs.readFile(mdPath, "utf8");

      // Remove existing verification section if present
      const verSectionRegex = /\n## Verification Report[\s\S]*$/;
      mdContent = mdContent.replace(verSectionRegex, "");

      // Append verification report
      const verificationMd = generateVerificationMarkdown(analysis, verification);
      mdContent = mdContent.trimEnd() + "\n\n---\n\n" + verificationMd;

      await fs.writeFile(mdPath, mdContent, "utf8");
      markdownUpdated++;
    } catch {
      // Markdown file doesn't exist — that's fine, skip it
    }
  }

  console.log(`  Updated ${markdownUpdated} markdown files`);

  // 3. Print verification summary
  console.log("\n--- Verification Summary ---");
  const statuses = {
    verified_useful: 0,
    partially_verified: 0,
    not_verified: 0,
    outdated: 0,
  };

  for (const v of Object.values(verificationState)) {
    if (!v.error) {
      const key = v.overall_score as keyof typeof statuses;
      if (key in statuses) statuses[key]++;
    }
  }

  console.log(`  Verified Useful:      ${statuses.verified_useful}`);
  console.log(`  Partially Verified:   ${statuses.partially_verified}`);
  console.log(`  Not Verified:         ${statuses.not_verified}`);
  console.log(`  Outdated:             ${statuses.outdated}`);

  console.log(`\nEnrichment done. KB entries: ${enriched}, Markdown files: ${markdownUpdated}`);
}
