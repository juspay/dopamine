/**
 * VerifierAgent — Step 15
 *
 * Aggregates all results and produces a verification report per video:
 * - Overall score: "verified_useful" | "partially_verified" | "not_verified" | "outdated"
 * - Per-item results (research + implementation)
 * - Summary recommendation
 * - Updates the knowledge base entry with verification data
 *
 * Uses Gemini to synthesize all findings into a coherent report.
 * State: videos/verifications.json
 */

import { type NeuroLink } from "@juspay/neurolink";
import { VerificationReportSchema, type VerificationReport } from "../schemas/verification.js";
import { loadState, saveState } from "../pipeline/state.js";
import { CONFIG } from "../pipeline/config.js";
import { sleep, exponentialBackoff } from "../utils/rate-limit.js";
import { safeJsonParse } from "../utils/json-repair.js";
import type { AnalysisEntry } from "./analyzer.js";
import type { ResearchEntry } from "./researcher.js";
import type { ImplementationEntry } from "./implementer.js";

/** Verification state entry. */
export interface VerificationEntry extends VerificationReport {
  filename: string;
  verified_at: string;
  error?: string;
}

/**
 * Compute the maximum allowable confidence score based on actual evidence.
 *
 * The old logic capped at 3 whenever all implementation items were "skipped",
 * but ~70% of actionable items are workflow/technique type that CAN'T be
 * npm-installed. This made 69% of all videos "not_verified" regardless of
 * whether their URLs are live and research confirmed the content.
 *
 * New logic separates items into "testable" (tool_install, code_snippet,
 * api_setup) and "knowledge-only" (workflow, technique), and scores based
 * on what's actually verifiable.
 */
function computeMaxConfidence(
  analysis: AnalysisEntry | undefined,
  research: ResearchEntry | undefined,
  implementation: ImplementationEntry | undefined,
): number {
  const researchItems = research?.items ?? [];
  const implItems = implementation?.items ?? [];
  const actionableItems = analysis?.actionable_items ?? [];

  // Categorize items by testability
  const testableTypes = new Set(["tool_install", "code_snippet", "api_setup"]);
  const testableItems = actionableItems.filter(i => testableTypes.has(i.type));
  const knowledgeItems = actionableItems.filter(i => !testableTypes.has(i.type));

  // Research signals: live URLs and verified claims
  const liveUrls = researchItems.filter(
    r => r.url_status === "live" || r.url_status === "redirect"
  ).length;
  const deadUrls = researchItems.filter(r => r.url_status === "dead").length;
  const urlsChecked = researchItems.filter(r => r.url_status !== "no_url").length;
  const verifiedClaims = researchItems.filter(
    r => r.claim_verification === "verified" || r.claim_verification === "partially_verified"
  ).length;

  // Implementation signals
  const installSuccesses = implItems.filter(
    i => i.install_result?.exit_code === 0
  ).length;
  const verificationPassed = implItems.filter(
    i => i.verification_results?.some(vr => vr.exit_code === 0)
  ).length;

  // If most URLs are dead → likely outdated content, cap low
  if (urlsChecked > 0 && deadUrls > urlsChecked * 0.6) return 3;

  // ALL items are knowledge-only (no installable tools)
  // Score based on research quality, not implementation
  if (testableItems.length === 0) {
    if (liveUrls > 0 && verifiedClaims > 0) return 8;
    if (liveUrls > 0) return 7;
    if (verifiedClaims > 0) return 6;
    return 5; // knowledge exists but can't verify beyond research
  }

  // Has testable items — use implementation results
  if (verificationPassed > 0 && liveUrls > 0 && installSuccesses > 0) return 9;
  if (installSuccesses > 0 && liveUrls > 0) return 7;
  if (installSuccesses > 0) return 6;
  if (liveUrls > 0) return 5;

  // Testable items but nothing worked
  return 3;
}

/**
 * Build a synthesis prompt for the verifier.
 */
function buildVerificationPrompt(
  filename: string,
  analysis: AnalysisEntry,
  research: ResearchEntry | undefined,
  implementation: ImplementationEntry | undefined,
): string {
  const parts: string[] = [];

  parts.push(`Synthesize all verification findings for this video and produce a verification report.`);
  parts.push(`\nVideo: ${filename}`);
  parts.push(`Category: ${analysis.category}`);
  parts.push(`Implementability Score: ${analysis.implementability_score}/10`);
  parts.push(`Usefulness Prediction: ${analysis.usefulness_prediction}`);

  parts.push(`\n--- ACTIONABLE ITEMS ---`);
  for (const item of analysis.actionable_items) {
    parts.push(`\nItem: ${item.name} (${item.type})`);
    parts.push(`  Description: ${item.description}`);
    parts.push(`  URL: ${item.url || "N/A"}`);

    // Research findings
    const researchItem = research?.items.find(r => r.item_name === item.name);
    if (researchItem) {
      parts.push(`  URL Status: ${researchItem.url_status}`);
      parts.push(`  Claim Verification: ${researchItem.claim_verification}`);
      parts.push(`  GitHub Info: ${researchItem.github_info}`);
      parts.push(`  Alternatives: ${researchItem.alternatives || "None found"}`);
      parts.push(`  Web Research: ${researchItem.web_research.slice(0, 500)}`);
    } else {
      parts.push(`  Research: Not available`);
    }

    // Implementation findings
    const implItem = implementation?.items.find(r => r.item_name === item.name);
    if (implItem) {
      parts.push(`  Implementation Status: ${implItem.overall_status}`);
      if (implItem.install_result) {
        parts.push(`  Install Exit Code: ${implItem.install_result.exit_code}`);
        if (implItem.install_result.stderr) {
          parts.push(`  Install Errors: ${implItem.install_result.stderr.slice(0, 300)}`);
        }
      }
      if (implItem.verification_results.length > 0) {
        for (const vr of implItem.verification_results) {
          parts.push(`  Verification "${vr.command}": exit=${vr.exit_code}${vr.timed_out ? " (TIMED OUT)" : ""}`);
        }
      }
      parts.push(`  Time: ${implItem.time_ms}ms`);
    } else {
      parts.push(`  Implementation: Not attempted`);
    }
  }

  parts.push(`\n--- INSTRUCTIONS ---`);
  parts.push(`Based on ALL the evidence above, produce a verification report:`);
  parts.push(`1. overall_score — choose the BEST fit:`);
  parts.push(`   "verified_useful": URLs are live, tools/resources work or research confirms the content is valid and current`);
  parts.push(`   "partially_verified": some items verified, others couldn't be tested but nothing is clearly wrong`);
  parts.push(`   "not_verified": URLs are dead, tools broken, claims refuted, or content is clearly wrong`);
  parts.push(`   "outdated": tools/services have been deprecated, shut down, or superseded`);
  parts.push(`   NOTE: Videos with workflow/technique items that can't be mechanically tested should still be "verified_useful" or "partially_verified" if the URLs are live and research doesn't refute the content. "not_verified" means the content is WRONG or DEAD, not just untestable.`);
  parts.push(`2. summary: 1-3 sentence recommendation for someone considering this video's content`);
  parts.push(`3. item_results: one entry per actionable item with:`);
  parts.push(`   - item_name: name of the item`);
  parts.push(`   - research_summary: 1-2 sentence summary of research findings`);
  parts.push(`   - implementation_result: "success", "partial_success", "failed", "skipped", or "not_applicable"`);
  parts.push(`   - is_url_live: "yes", "no", "not_checked", or "no_url"`);
  parts.push(`   - notes: any important additional notes`);
  parts.push(`4. confidence: 0-10 how confident you are in this verification`);
  parts.push(`\nReturn ONLY valid JSON matching the schema. No markdown fences.`);

  // Cap confidence based on actual evidence
  const maxConf = computeMaxConfidence(analysis, research, implementation);
  parts.push(`\n\nIMPORTANT: Based on the evidence above, the maximum confidence score is ${maxConf}/10. Do not exceed this ceiling.`);

  return parts.join("\n");
}

export async function runVerifierAgent(neurolink: NeuroLink): Promise<void> {
  console.log("\n=== VerifierAgent (Step 15) ===");

  // Load all states
  const analysisState = await loadState<Record<string, AnalysisEntry>>(
    CONFIG.STATE.ANALYSIS, {}
  );
  const researchState = await loadState<Record<string, ResearchEntry>>(
    CONFIG.STATE.RESEARCH, {}
  );
  const implState = await loadState<Record<string, ImplementationEntry>>(
    CONFIG.STATE.IMPLEMENTATIONS, {}
  );

  // Load existing verification state (resume mode)
  const verificationState = await loadState<Record<string, VerificationEntry>>(
    CONFIG.STATE.VERIFICATIONS, {}
  );

  const entries = Object.entries(analysisState).filter(
    ([, entry]) => !entry.error && entry.actionable_items.length > 0
  );

  console.log(`Verification: ${entries.length} videos to verify`);

  let verified = 0, skipped = 0, errors = 0;

  for (const [i, [filename, analysis]] of entries.entries()) {
    const logPrefix = `[${i + 1}/${entries.length}]`;

    // Resume mode
    if (filename in verificationState && !verificationState[filename].error) {
      skipped++;
      console.log(`${logPrefix} SKIP (already verified): ${filename}`);
      continue;
    }

    console.log(`${logPrefix} Verifying: ${filename}`);

    const research = researchState[filename];
    const implementation = implState[filename];

    const prompt = buildVerificationPrompt(filename, analysis, research, implementation);

    const result = await exponentialBackoff(async () => {
      const response = await neurolink.generate({
        input: { text: prompt },
        provider: "vertex",
        model:    CONFIG.MODEL,
        schema:   VerificationReportSchema,
        output:   { format: "json" },
        disableTools: true,
        maxTokens: 4096,
        timeout: "120s",
      });
      return VerificationReportSchema.parse(safeJsonParse(response.content));
    }, CONFIG.MAX_RETRIES, CONFIG.RETRY_BASE_DELAY_MS);

    if (result.success) {
      verificationState[filename] = {
        filename,
        verified_at: new Date().toISOString(),
        ...result.value,
      };
      verified++;
      console.log(`  -> Score: ${result.value.overall_score}`);
      console.log(`  -> Confidence: ${result.value.confidence}/10`);
      console.log(`  -> Summary: ${result.value.summary.slice(0, 120)}`);
    } else {
      verificationState[filename] = {
        filename,
        verified_at: new Date().toISOString(),
        overall_score: "not_verified",
        summary: "Verification failed due to an error.",
        item_results: [],
        confidence: 0,
        error: result.error,
      };
      errors++;
      console.error(`  -> ERROR: ${result.error}`);
    }

    // Write after every video — resume mode guarantee
    await saveState(CONFIG.STATE.VERIFICATIONS, verificationState);
    await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nVerification done. Verified: ${verified}, Skipped: ${skipped}, Errors: ${errors}`);
}
