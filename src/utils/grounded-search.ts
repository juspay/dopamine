// src/utils/grounded-search.ts
import { GoogleAuth } from "google-auth-library";

/**
 * One Gemini call on Vertex AI with Google Search grounding built in: Google runs the
 * searches itself, in parallel, inside the call.
 *
 * Replaces NeuroLink's websearchGrounding tool for research. That tool makes each search a
 * separate model call that returns a 50-word summary, so the research model chained 12-37 of
 * them one after another: ~139s a batch, and past the 300s limit when it chose to search more
 * (measured 2026-11-27 on the batch that failed 8 times). Grounded in one call, the same
 * batches took 43-56s, ran 8-12 searches and cited 19-24 sources.
 */

export interface GroundedOptions {
  project: string;
  location: string;
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
}

interface GenerateContentResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }>;
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "text">>;

let auth: GoogleAuth | undefined;
async function accessToken(): Promise<string> {
  auth ??= new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("grounded search: no Google Cloud access token");
  return token;
}

export function vertexHost(location: string): string {
  return location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
}

/** The answer text, or a throw when the call did not finish normally. */
export function answerText(body: GenerateContentResponse): string {
  const candidate = body.candidates?.[0];
  const reason = candidate?.finishReason;
  if (reason === "MAX_TOKENS") {
    throw new Error(`grounded search: response truncated by maxTokens (finishReason=${reason})`);
  }
  if (reason !== "STOP") {
    throw new Error(`grounded search: turn did not complete (finishReason=${reason ?? "none"})`);
  }
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (!text.trim()) throw new Error("grounded search: empty answer");
  return text;
}

/**
 * Errors keep Vertex AI's own message, so a VPN refusal ("prohibited by organization's
 * policy") is recognised by the retry wrapper like any other AI refusal.
 */
export async function groundedGenerate(
  prompt: string,
  o: GroundedOptions,
  fetchImpl: FetchLike = fetch,
  token: () => Promise<string> = accessToken,
): Promise<string> {
  const url = `https://${vertexHost(o.location)}/v1/projects/${o.project}/locations/${o.location}/publishers/google/models/${o.model}:generateContent`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { maxOutputTokens: o.maxOutputTokens },
    }),
    signal: AbortSignal.timeout(o.timeoutMs),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`grounded search: Vertex AI ${res.status}: ${raw.slice(0, 500)}`);
  return answerText(JSON.parse(raw) as GenerateContentResponse);
}
