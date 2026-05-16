/**
 * Round 2: deeper inspection of websearchGrounding tool calls.
 * Dumps full tool inputs/outputs so we can see what the search returned.
 * Also tests the multi-item batched-research prompt shape that researcher.ts uses.
 */
import "dotenv/config";
import { NeuroLink } from "@juspay/neurolink";

const MULTI_ITEM_PROMPT = `You are a senior developer researching tools so another engineer can install and use them.

For each numbered tool below, return:
1. ## <NAME> — <one-sentence description>
2. **URL**: <official docs/repo URL>
3. **Latest version**: <version number, or "unknown">
4. **Install**: <real install command>
5. **Status**: active / deprecated / unknown
6. **Notes**: any setup requirement (auth, license, free tier)

Tools to research:
1. n8n (workflow automation, self-host with Docker Compose)
2. Whisper.cpp (OpenAI Whisper speech-to-text in C++)
3. Helix DB (graph + vector DB written in Rust)

Be precise. If you don't know, say "unknown" — do not guess.`;

interface RunResult {
  label: string;
  ok: boolean;
  ms: number;
  contentLen: number;
  contentPreview: string;
  toolCallDetails: any[];
  raw?: any;
  error?: string;
}

async function run(label: string, fn: () => Promise<any>): Promise<RunResult> {
  const t0 = Date.now();
  try {
    const r = await fn();
    const ms = Date.now() - t0;
    const content = String(r?.content ?? "");
    const toolCallDetails: any[] = [];
    for (const t of (r?.toolsUsed ?? [])) {
      toolCallDetails.push({
        name: t?.toolName ?? t?.name ?? null,
        input: t?.args ?? t?.input ?? t?.parameters ?? null,
        output: t?.result ?? t?.output ?? t?.response ?? null,
      });
    }
    return { label, ok: true, ms, contentLen: content.length,
      contentPreview: content.slice(0, 1500), toolCallDetails, raw: r };
  } catch (e: any) {
    return { label, ok: false, ms: Date.now() - t0, contentLen: 0,
      contentPreview: "", toolCallDetails: [], error: String(e?.message ?? e) };
  }
}

async function main() {
  const neurolink = new NeuroLink();
  console.log("=== Round 2: deep inspection of tool calls ===\n");

  const A = await run("A. PROPOSED — image-preview + format:text + websearchGrounding (multi-item)", async () =>
    neurolink.generate({
      input: { text: MULTI_ITEM_PROMPT },
      provider: "vertex",
      model: "gemini-3.1-flash-image-preview",
      output: { format: "text" },
      enabledToolNames: ["websearchGrounding"],
      maxTokens: 8192,
      timeout: "300s",
    } as any)
  );

  for (const r of [A]) {
    console.log("\n" + "=".repeat(80));
    console.log(r.label);
    console.log("=".repeat(80));
    console.log(`ok=${r.ok}  ms=${r.ms}  contentLen=${r.contentLen}  numToolCalls=${r.toolCallDetails.length}`);
    if (r.error) { console.log("ERROR: " + r.error); continue; }

    console.log("\n--- TOOL CALLS ---");
    for (let i = 0; i < r.toolCallDetails.length; i++) {
      const t = r.toolCallDetails[i];
      console.log(`\n[Tool ${i+1}] ${t.name}`);
      console.log("  INPUT: " + JSON.stringify(t.input).slice(0, 300));
      console.log("  OUTPUT: " + JSON.stringify(t.output).slice(0, 800));
    }

    console.log("\n--- CONTENT ---");
    console.log(r.contentPreview);
  }

  // also dump raw shape so we know what fields exist
  console.log("\n--- RAW response keys ---");
  console.log(Object.keys(A.raw ?? {}));
  console.log("\ntoolsUsed:", JSON.stringify(A.raw?.toolsUsed));
  console.log("\ntoolExecutions:");
  for (const exec of (A.raw?.toolExecutions ?? [])) {
    console.log("  - tool:", exec?.toolName ?? exec?.name);
    console.log("    args:", JSON.stringify(exec?.args ?? exec?.input).slice(0, 300));
    console.log("    result:", JSON.stringify(exec?.result ?? exec?.output).slice(0, 1200));
  }
  console.log("\nfinishReason:", A.raw?.finishReason);
}

main().catch((e) => { console.error(e); process.exit(1); });
