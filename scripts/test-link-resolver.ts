/** Smoke test the link-resolver config with a single call. */
import "dotenv/config";
import { NeuroLink } from "@juspay/neurolink";

// Test 3 prompts: short safe one, the actual failing one, and a 2.5-flash alternative
const PROMPTS = [
  { label: "control (no description)", text: `What is the official website URL for "n8n self-host"? Return ONLY the full URL.` },
  { label: "actual failing prompt", text: `What is the official website URL for "Little Miss Melissa"? Description: Personal account inferred from attached filename.. Return ONLY the full URL starting with https://, nothing else. If it's a GitHub project return the GitHub URL. If you cannot find an exact URL return your best guess. One URL only.` },
];

async function test(label: string, text: string, model: string, opts: any) {
  const neurolink = new NeuroLink();
  const t0 = Date.now();
  try {
    const r = await neurolink.generate({
      input: { text },
      provider: "vertex",
      model,
      maxTokens: 256,
      timeout: "30s",
      ...opts,
    } as any);
    console.log(`${label} [${model}] OK in ${Date.now() - t0}ms`);
    console.log(`  content: ${JSON.stringify((r?.content ?? "").slice(0, 200))}`);
  } catch (e: any) {
    console.log(`${label} [${model}] FAIL in ${Date.now() - t0}ms: ${(e?.message ?? String(e)).slice(0, 200)}`);
  }
}

async function main() {
  for (const p of PROMPTS) {
    console.log("---", p.label, "---");
    await test(p.label, p.text, "gemini-3.1-flash-image-preview", { disableTools: true });
    await test(p.label, p.text, "gemini-2.5-flash", { disableTools: true });
  }
}
main().catch(console.error);
