/**
 * Parallel verifier — runs Step 15 with N concurrent workers.
 * Builds the same prompt as src/agents/verifier.ts but processes
 * entries with Promise.all + concurrency limit.
 *
 * Usage: node --experimental-strip-types scripts/parallel-verifier.ts
 *        CONCURRENCY=8 node --experimental-strip-types scripts/parallel-verifier.ts
 */
import "dotenv/config";
import { NeuroLink } from "@juspay/neurolink";
import fs from "node:fs/promises";
import { z } from "zod";

const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? "8", 10);
const MODEL       = process.env.MODEL ?? "gemini-3.1-flash-image-preview";

// Inlined verification schema (matches src/schemas/verification.ts)
const ItemVerificationSchema = z.object({
  item_name: z.string(),
  research_summary: z.string(),
  implementation_result: z.string(),
  is_url_live: z.string(),
  notes: z.string(),
});
const VerificationReportSchema = z.object({
  overall_score: z.string(),
  summary: z.string(),
  item_results: z.array(ItemVerificationSchema),
  confidence: z.number(),
});

// Confidence-cap heuristic mirrors src/agents/verifier.ts:computeMaxConfidence
function computeMaxConfidence(analysis: any, research: any, implementation: any): number {
  const researchItems = research?.items ?? [];
  const implItems = implementation?.items ?? [];
  const actionableItems = analysis?.actionable_items ?? [];
  const testableTypes = new Set(["tool_install", "code_snippet", "api_setup"]);
  const testableItems = actionableItems.filter((i: any) => testableTypes.has(i.type));
  const liveUrls = researchItems.filter((r: any) => r.url_status === "live" || r.url_status === "redirect").length;
  const deadUrls = researchItems.filter((r: any) => r.url_status === "dead").length;
  const urlsChecked = researchItems.filter((r: any) => r.url_status !== "no_url").length;
  const verifiedClaims = researchItems.filter((r: any) =>
    r.claim_verification === "verified" || r.claim_verification === "partially_verified"
  ).length;
  const installSuccesses = implItems.filter((i: any) => i.install_result?.exit_code === 0).length;
  const verificationPassed = implItems.filter(
    (i: any) => i.verification_results?.some((vr: any) => vr.exit_code === 0)
  ).length;
  if (urlsChecked > 0 && deadUrls > urlsChecked * 0.6) return 3;
  if (testableItems.length === 0) {
    if (liveUrls > 0 && verifiedClaims > 0) return 8;
    if (liveUrls > 0) return 7;
    if (verifiedClaims > 0) return 6;
    return 5;
  }
  if (verificationPassed > 0 && liveUrls > 0 && installSuccesses > 0) return 9;
  if (installSuccesses > 0 && liveUrls > 0) return 7;
  if (installSuccesses > 0) return 6;
  if (liveUrls > 0) return 5;
  return 3;
}

function buildPrompt(filename: string, analysis: any, research: any, implementation: any): string {
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
    const researchItem = research?.items.find((r: any) => r.item_name === item.name);
    if (researchItem) {
      parts.push(`  URL Status: ${researchItem.url_status}`);
      parts.push(`  Claim Verification: ${researchItem.claim_verification}`);
      parts.push(`  GitHub Info: ${researchItem.github_info}`);
      parts.push(`  Alternatives: ${researchItem.alternatives || "None found"}`);
      parts.push(`  Web Research: ${researchItem.web_research.slice(0, 500)}`);
    } else {
      parts.push(`  Research: Not available`);
    }
    const implItem = implementation?.items.find((r: any) => r.item_name === item.name);
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
  parts.push(`1. overall_score: "verified_useful" | "partially_verified" | "not_verified" | "outdated"`);
  parts.push(`   - "verified_useful": URLs live, content valid and current`);
  parts.push(`   - "partially_verified": some items verified, others untested but nothing wrong`);
  parts.push(`   - "not_verified": URLs dead, claims wrong, or content broken`);
  parts.push(`   - "outdated": tools deprecated/shut down/superseded`);
  parts.push(`   NOTE: workflows/techniques that can't be mechanically tested are still "verified_useful" or "partially_verified" if URLs are live.`);
  parts.push(`2. summary: 1-3 sentence recommendation`);
  parts.push(`3. item_results: one entry per actionable item with item_name, research_summary, implementation_result, is_url_live, notes`);
  parts.push(`4. confidence: 0-10 numeric`);
  parts.push(`\nReturn ONLY valid JSON. No markdown fences.`);
  const maxConf = computeMaxConfidence(analysis, research, implementation);
  parts.push(`\n\nIMPORTANT: Maximum confidence score based on evidence is ${maxConf}/10. Do not exceed.`);
  return parts.join("\n");
}

async function verifyOne(neurolink: NeuroLink, filename: string, analysis: any, research: any, implementation: any): Promise<any> {
  const prompt = buildPrompt(filename, analysis, research, implementation);
  const r = await neurolink.generate({
    input: { text: prompt },
    provider: "vertex",
    model: MODEL,
    schema: VerificationReportSchema as unknown as z.ZodTypeAny,
    output: { format: "json" },
    disableTools: true,
    maxTokens: 4096,
    timeout: "120s",
  } as any);
  const parsed = VerificationReportSchema.parse(JSON.parse(r.content));
  return {
    filename,
    verified_at: new Date().toISOString(),
    ...parsed,
  };
}

async function main() {
  const analysis = JSON.parse(await fs.readFile("videos/analysis.json", "utf8"));
  const research = JSON.parse(await fs.readFile("videos/research.json", "utf8"));
  const impl = JSON.parse(await fs.readFile("videos/implementations.json", "utf8"));
  const verifications = JSON.parse(await fs.readFile("videos/verifications.json", "utf8"));

  // Find entries that need verification: have analysis items AND are marked for re-run or absent
  const todo: Array<[string, any]> = [];
  for (const [filename, an] of Object.entries(analysis) as any) {
    if (an?.error) continue;
    if (!an?.actionable_items?.length) continue;
    const cur = verifications[filename];
    if (cur && !cur.error) continue;
    todo.push([filename, an]);
  }

  console.log(`Parallel verifier: ${todo.length} entries to process, concurrency=${CONCURRENCY}, model=${MODEL}`);

  const neurolink = new NeuroLink();
  let done = 0, errors = 0;
  const startTime = Date.now();

  // Persist progress periodically
  let lastSave = Date.now();
  const SAVE_INTERVAL_MS = 5000;
  async function maybeSave() {
    if (Date.now() - lastSave > SAVE_INTERVAL_MS) {
      lastSave = Date.now();
      await fs.writeFile("videos/verifications.json", JSON.stringify(verifications, null, 2));
    }
  }

  // Worker that consumes from todo queue
  let cursor = 0;
  async function worker(id: number) {
    while (true) {
      const i = cursor++;
      if (i >= todo.length) return;
      const [filename, an] = todo[i];
      const t0 = Date.now();
      try {
        const result = await verifyOne(neurolink, filename, an, research[filename], impl[filename]);
        verifications[filename] = result;
        done++;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (done / ((Date.now() - startTime) / 60000)).toFixed(1);
        console.log(`  [w${id}] ${done}/${todo.length} (${elapsed}s, ${rate}/min) ${result.overall_score} c=${result.confidence}  ${filename.slice(0, 50)}`);
      } catch (e: any) {
        errors++;
        const msg = (e?.message ?? String(e)).slice(0, 150);
        verifications[filename] = {
          filename,
          verified_at: new Date().toISOString(),
          overall_score: "not_verified",
          summary: "Verification failed: " + msg,
          item_results: [],
          confidence: 0,
          error: msg,
        };
        console.error(`  [w${id}] ERR ${filename.slice(0, 50)}: ${msg}`);
      }
      await maybeSave();
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);
  await fs.writeFile("videos/verifications.json", JSON.stringify(verifications, null, 2));

  await neurolink.shutdown();

  const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\nParallel verify done: ${done} succeeded, ${errors} failed, in ${elapsedMin} min`);
}

main().catch(e => { console.error(e); process.exit(1); });
