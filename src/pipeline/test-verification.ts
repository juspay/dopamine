/**
 * Test runner for Steps 12-16 on a single video.
 *
 * Usage: node dist/pipeline/test-verification.js [filename]
 *
 * If no filename given, picks the Vercel Agent Browser video as a good test case.
 */

import dotenv from "dotenv";
dotenv.config();

import { NeuroLink } from "@juspay/neurolink";
import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "./config.js";
import { loadState, saveState } from "./state.js";

// Import agent runners
import { runAnalyzerAgent } from "../agents/analyzer.js";
import { runResearchAgent } from "../agents/researcher.js";
import { runImplementerAgent } from "../agents/implementer.js";
import { runVerifierAgent } from "../agents/verifier.js";
import { runEnrichmentAgent } from "../agents/enrichment.js";

// Default test video — the Vercel Agent Browser one (has real GitHub URL + installable tool)
const DEFAULT_TEST_VIDEO = "testuser_3813844456856222503.mp4";

async function main() {
  const targetFilename = process.argv[2] || DEFAULT_TEST_VIDEO;
  console.log("=".repeat(70));
  console.log("  VERIFICATION PIPELINE TEST");
  console.log("  Testing on: " + targetFilename);
  console.log("=".repeat(70));

  // --- SETUP: Isolate to a single video ---

  // Load full knowledge base, then create a temp copy with only our target
  const fullKB = await loadState<Record<string, unknown>>(CONFIG.STATE.KNOWLEDGE_BASE, {});
  if (!(targetFilename in fullKB)) {
    console.error(`ERROR: "${targetFilename}" not found in knowledge_base.json`);
    console.error("Available entries:", Object.keys(fullKB).slice(0, 10).join(", "), "...");
    process.exit(1);
  }

  // Back up existing state files (if any)
  const stateFiles = [
    CONFIG.STATE.ANALYSIS,
    CONFIG.STATE.RESEARCH,
    CONFIG.STATE.IMPLEMENTATIONS,
    CONFIG.STATE.VERIFICATIONS,
  ];

  const backups: Array<{ path: string; data: string | null }> = [];
  for (const f of stateFiles) {
    try {
      const data = await fs.readFile(f, "utf8");
      backups.push({ path: f, data });
    } catch {
      backups.push({ path: f, data: null });
    }
  }

  // Clear state files for a clean test
  for (const f of stateFiles) {
    await saveState(f, {});
  }

  // Create a temp KB with only our target video
  const tempKBPath = CONFIG.STATE.KNOWLEDGE_BASE + ".bak";
  const origKB = await fs.readFile(CONFIG.STATE.KNOWLEDGE_BASE, "utf8");
  await fs.writeFile(tempKBPath, origKB, "utf8");

  const singleKB: Record<string, unknown> = {
    [targetFilename]: fullKB[targetFilename],
  };
  await saveState(CONFIG.STATE.KNOWLEDGE_BASE, singleKB);

  const neurolink = new NeuroLink();
  const t0 = Date.now();

  try {
    // --- STEP 12: Analysis ---
    console.log("\n" + "=".repeat(60));
    console.log("STEP 12: Content Analysis (AnalyzerAgent)");
    console.log("=".repeat(60));
    const t12 = Date.now();
    await runAnalyzerAgent(neurolink);
    console.log(`  Step 12 completed in ${((Date.now() - t12) / 1000).toFixed(1)}s`);

    // Show analysis results
    const analysisState = await loadState<Record<string, { actionable_items: Array<{ name: string; type: string }>; implementability_score: number; usefulness_prediction: string }>>(
      CONFIG.STATE.ANALYSIS, {}
    );
    const analysis = analysisState[targetFilename];
    if (analysis) {
      console.log("\n  Analysis Results:");
      console.log(`    Implementability: ${analysis.implementability_score}/10`);
      console.log(`    Usefulness: ${analysis.usefulness_prediction}`);
      console.log(`    Actionable Items (${analysis.actionable_items.length}):`);
      for (const item of analysis.actionable_items) {
        console.log(`      - [${item.type}] ${item.name}`);
      }
    }

    // --- STEP 13: Research ---
    console.log("\n" + "=".repeat(60));
    console.log("STEP 13: Research & Verification (ResearchAgent)");
    console.log("=".repeat(60));
    const t13 = Date.now();
    await runResearchAgent(neurolink);
    console.log(`  Step 13 completed in ${((Date.now() - t13) / 1000).toFixed(1)}s`);

    // Show research results
    const researchState = await loadState<Record<string, { items: Array<{ item_name: string; url_status: string; claim_verification: string }> }>>(
      CONFIG.STATE.RESEARCH, {}
    );
    const research = researchState[targetFilename];
    if (research) {
      console.log("\n  Research Results:");
      for (const item of research.items) {
        console.log(`    - ${item.item_name}: URL=${item.url_status}, Claims=${item.claim_verification}`);
      }
    }

    // --- STEP 14: Implementation ---
    console.log("\n" + "=".repeat(60));
    console.log("STEP 14: Implementation Testing (ImplementerAgent)");
    console.log("=".repeat(60));
    const t14 = Date.now();
    await runImplementerAgent();
    console.log(`  Step 14 completed in ${((Date.now() - t14) / 1000).toFixed(1)}s`);

    // Show implementation results
    const implState = await loadState<Record<string, { items: Array<{ item_name: string; overall_status: string; time_ms: number }> }>>(
      CONFIG.STATE.IMPLEMENTATIONS, {}
    );
    const impl = implState[targetFilename];
    if (impl) {
      console.log("\n  Implementation Results:");
      for (const item of impl.items) {
        console.log(`    - ${item.item_name}: ${item.overall_status} (${item.time_ms}ms)`);
      }
    }

    // --- STEP 15: Verification ---
    console.log("\n" + "=".repeat(60));
    console.log("STEP 15: Verification Synthesis (VerifierAgent)");
    console.log("=".repeat(60));
    const t15 = Date.now();
    await runVerifierAgent(neurolink);
    console.log(`  Step 15 completed in ${((Date.now() - t15) / 1000).toFixed(1)}s`);

    // Show verification results
    const verState = await loadState<Record<string, { overall_score: string; confidence: number; summary: string; item_results: Array<{ item_name: string; implementation_result: string; is_url_live: string }> }>>(
      CONFIG.STATE.VERIFICATIONS, {}
    );
    const verification = verState[targetFilename];
    if (verification) {
      console.log("\n  Verification Report:");
      console.log(`    Overall Score: ${verification.overall_score}`);
      console.log(`    Confidence: ${verification.confidence}/10`);
      console.log(`    Summary: ${verification.summary}`);
      console.log("    Item Results:");
      for (const item of verification.item_results) {
        console.log(`      - ${item.item_name}: impl=${item.implementation_result}, url=${item.is_url_live}`);
      }
    }

    // --- STEP 16: Enrichment ---
    // First restore the full KB so enrichment can update it
    await fs.writeFile(CONFIG.STATE.KNOWLEDGE_BASE, origKB, "utf8");
    // Re-load & inject our analysis/verification for this video
    const fullKBReloaded = await loadState<Record<string, unknown>>(CONFIG.STATE.KNOWLEDGE_BASE, {});
    await saveState(CONFIG.STATE.KNOWLEDGE_BASE, fullKBReloaded);

    console.log("\n" + "=".repeat(60));
    console.log("STEP 16: Knowledge Base Enrichment (EnrichmentAgent)");
    console.log("=".repeat(60));
    const t16 = Date.now();
    await runEnrichmentAgent();
    console.log(`  Step 16 completed in ${((Date.now() - t16) / 1000).toFixed(1)}s`);

    // --- FINAL SUMMARY ---
    const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(70));
    console.log("  VERIFICATION PIPELINE TEST COMPLETE");
    console.log("  Total time: " + totalTime + "s");
    console.log("  Video: " + targetFilename);
    if (verification) {
      console.log("  Score: " + verification.overall_score);
      console.log("  Confidence: " + verification.confidence + "/10");
    }
    console.log("=".repeat(70));

    // Print the full verification JSON
    console.log("\n--- Full Verification Report (JSON) ---");
    console.log(JSON.stringify(verState[targetFilename], null, 2));

  } finally {
    await neurolink.shutdown();

    // Restore KB backup
    if (await fileExists(tempKBPath)) {
      await fs.copyFile(tempKBPath, CONFIG.STATE.KNOWLEDGE_BASE);
      await fs.unlink(tempKBPath);
    }

    // Restore other state file backups
    for (const backup of backups) {
      if (backup.data !== null) {
        await fs.writeFile(backup.path, backup.data, "utf8");
      }
      // If backup.data is null, the file didn't exist before — leave the test data
    }
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
