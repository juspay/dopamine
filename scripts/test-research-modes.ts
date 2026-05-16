/**
 * Head-to-head test: current vs proposed research config.
 *
 * Tests the same research prompt against:
 *   A) CURRENT:   gemini-3.1-flash-image-preview + disableTools: true
 *   B) PROPOSED:  gemini-3.1-flash-image-preview + output:{format:"text"} + websearchGrounding
 *   C) FALLBACK:  gemini-2.5-flash + websearchGrounding (text-only model, sanity check)
 *
 * Use a niche tool name that's unlikely to be in training data, so we can tell
 * whether websearchGrounding is actually being used.
 */
import "dotenv/config";
import { NeuroLink } from "@juspay/neurolink";

const TEST_PROMPT = `Research the following developer tool and report findings in 100 words:

Tool: "n8n self-host with Docker Compose"
- What is it? (one sentence)
- Latest stable version (be specific, give version number)
- Where is it documented? (give URL)
- One real install command

Be precise. Cite at least one URL. If you don't know, say so.`;

interface RunResult {
  label: string;
  ok: boolean;
  ms: number;
  contentLen: number;
  contentPreview: string;
  toolsUsed: string[];
  error?: string;
  raw?: any;
}

async function run(label: string, fn: () => Promise<any>): Promise<RunResult> {
  const t0 = Date.now();
  try {
    const r = await fn();
    const ms = Date.now() - t0;
    const content = String(r?.content ?? "");
    return {
      label,
      ok: true,
      ms,
      contentLen: content.length,
      contentPreview: content.slice(0, 600),
      toolsUsed: (r?.toolsUsed ?? []).map((t: any) => t?.toolName ?? t?.name ?? String(t)),
      raw: r,
    };
  } catch (e: any) {
    return {
      label,
      ok: false,
      ms: Date.now() - t0,
      contentLen: 0,
      contentPreview: "",
      toolsUsed: [],
      error: String(e?.message ?? e),
    };
  }
}

async function main() {
  const neurolink = new NeuroLink();

  console.log("=== Head-to-head research-config test ===");
  console.log(`Prompt: ${TEST_PROMPT.slice(0, 100)}...\n`);

  // A) CURRENT — what researcher.ts uses today
  const A = await run("A. CURRENT (image-preview + disableTools)", async () =>
    neurolink.generate({
      input: { text: TEST_PROMPT },
      provider: "vertex",
      model: "gemini-3.1-flash-image-preview",
      disableTools: true,
      maxTokens: 8192,
      timeout: "120s",
    } as any)
  );

  // B) PROPOSED — same model, but route to text path with web search
  const B = await run("B. PROPOSED (image-preview + output.format=text + websearchGrounding)", async () =>
    neurolink.generate({
      input: { text: TEST_PROMPT },
      provider: "vertex",
      model: "gemini-3.1-flash-image-preview",
      output: { format: "text" },
      enabledToolNames: ["websearchGrounding"],
      maxTokens: 8192,
      timeout: "180s",
    } as any)
  );

  // C) FALLBACK — text-only model with web search (sanity baseline)
  const C = await run("C. FALLBACK (gemini-2.5-flash + websearchGrounding)", async () =>
    neurolink.generate({
      input: { text: TEST_PROMPT },
      provider: "vertex",
      model: "gemini-2.5-flash",
      enabledToolNames: ["websearchGrounding"],
      maxTokens: 8192,
      timeout: "180s",
    } as any)
  );

  for (const r of [A, B, C]) {
    console.log("\n" + "=".repeat(80));
    console.log(`${r.label}`);
    console.log("=".repeat(80));
    console.log(`ok=${r.ok}  ms=${r.ms}  contentLen=${r.contentLen}  toolsUsed=${JSON.stringify(r.toolsUsed)}`);
    if (r.error) console.log(`ERROR: ${r.error}`);
    if (r.contentPreview) console.log(`PREVIEW (first 600 chars):\n${r.contentPreview}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("VERDICT");
  console.log("=".repeat(80));
  console.log(`A current  → ${A.ok ? `${A.contentLen} chars, tools=${A.toolsUsed.length}` : "FAIL: " + A.error}`);
  console.log(`B proposed → ${B.ok ? `${B.contentLen} chars, tools=${B.toolsUsed.length}` : "FAIL: " + B.error}`);
  console.log(`C fallback → ${C.ok ? `${C.contentLen} chars, tools=${C.toolsUsed.length}` : "FAIL: " + C.error}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
