/**
 * Round 3: schema + tools combination.
 * Verifier and Analyzer both pass schema + disableTools:true today (Gemini rejects
 * tools+schema together historically). Test if 9.59.5+ can do schema + websearchGrounding.
 *
 *   X) schema only, disableTools:true               (current verifier/analyzer)
 *   Y) schema only, NO disableTools, websearchGrounding enabled
 *   Z) Y + image-preview model
 */
import "dotenv/config";
import { NeuroLink } from "@juspay/neurolink";
import { z } from "zod";

const PROMPT = `Verify the following item is real and currently available for installation.

Item: "n8n self-host with Docker Compose"
Expected URL: https://docs.n8n.io/hosting/installation/docker/`;

const VerifySchema = z.object({
  is_real: z.boolean(),
  is_active: z.boolean(),
  install_works: z.boolean(),
  evidence_url: z.string(),
  notes: z.string(),
});

interface RunResult {
  label: string;
  ok: boolean;
  ms: number;
  contentLen: number;
  parsed: any;
  toolsUsed: string[];
  toolExecutions: any[];
  error?: string;
}

async function run(label: string, fn: () => Promise<any>): Promise<RunResult> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return {
      label,
      ok: true,
      ms: Date.now() - t0,
      contentLen: String(r?.content ?? "").length,
      parsed: (() => { try { return JSON.parse(String(r?.content ?? "{}")); } catch { return null; } })(),
      toolsUsed: r?.toolsUsed ?? [],
      toolExecutions: r?.toolExecutions ?? [],
    };
  } catch (e: any) {
    return { label, ok: false, ms: Date.now() - t0, contentLen: 0, parsed: null,
      toolsUsed: [], toolExecutions: [], error: String(e?.message ?? e) };
  }
}

async function main() {
  const neurolink = new NeuroLink();
  console.log("=== Round 3: schema + tools combination ===\n");

  // X) Current verifier shape
  const X = await run("X. CURRENT — image-preview + schema + disableTools:true", async () =>
    neurolink.generate({
      input: { text: PROMPT },
      provider: "vertex",
      model: "gemini-3.1-flash-image-preview",
      schema: VerifySchema,
      output: { format: "json" },
      disableTools: true,
      maxTokens: 4096,
      timeout: "120s",
    } as any)
  );

  // Y) text model + schema + websearch
  const Y = await run("Y. text model + schema + websearchGrounding (NO disableTools)", async () =>
    neurolink.generate({
      input: { text: PROMPT },
      provider: "vertex",
      model: "gemini-2.5-flash",
      schema: VerifySchema,
      output: { format: "json" },
      enabledToolNames: ["websearchGrounding"],
      maxTokens: 4096,
      timeout: "180s",
    } as any)
  );

  // Z) image-preview + schema + websearch
  const Z = await run("Z. image-preview + schema + websearchGrounding (NO disableTools)", async () =>
    neurolink.generate({
      input: { text: PROMPT },
      provider: "vertex",
      model: "gemini-3.1-flash-image-preview",
      schema: VerifySchema,
      output: { format: "json" },
      enabledToolNames: ["websearchGrounding"],
      maxTokens: 4096,
      timeout: "180s",
    } as any)
  );

  for (const r of [X, Y, Z]) {
    console.log("\n" + "=".repeat(80));
    console.log(r.label);
    console.log("=".repeat(80));
    console.log(`ok=${r.ok}  ms=${r.ms}  contentLen=${r.contentLen}  toolsUsed=${JSON.stringify(r.toolsUsed)}  toolExecutions=${r.toolExecutions.length}`);
    if (r.error) console.log("ERROR:", r.error);
    if (r.parsed) console.log("PARSED:", JSON.stringify(r.parsed, null, 2));
  }

  console.log("\n" + "=".repeat(80));
  console.log("VERDICT");
  console.log("=".repeat(80));
  console.log(`X (current)             → ok=${X.ok} parsed=${!!X.parsed} tools=${X.toolsUsed.length}`);
  console.log(`Y (text+schema+search)  → ok=${Y.ok} parsed=${!!Y.parsed} tools=${Y.toolsUsed.length}`);
  console.log(`Z (image+schema+search) → ok=${Z.ok} parsed=${!!Z.parsed} tools=${Z.toolsUsed.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
