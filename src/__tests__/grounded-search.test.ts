import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type FetchLike, answerText, groundedGenerate, vertexHost } from "../utils/grounded-search.js";
import { AI_OUTAGE, exponentialBackoff, isAiUnavailable, resetAiOutage } from "../utils/rate-limit.js";

const OPTS = { project: "p1", location: "global", model: "gemini-x", maxOutputTokens: 100, timeoutMs: 5_000 };
const token = async () => "t0k";
const reply =
  (status: number, body: unknown): FetchLike =>
  async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  });
const ok = (text: string, finishReason = "STOP") => ({
  candidates: [{ finishReason, content: { parts: [{ text }] } }],
});

describe("groundedGenerate", () => {
  it("asks Vertex AI for one call with Google Search grounding and returns the answer", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchImpl: FetchLike = async (url, init) => {
      seen = { url, init };
      return reply(200, ok("1. Tool A\nfindings"))(url, init);
    };
    expect(await groundedGenerate("research these", OPTS, fetchImpl, token)).toBe("1. Tool A\nfindings");
    expect(seen?.url).toBe(
      "https://aiplatform.googleapis.com/v1/projects/p1/locations/global/publishers/google/models/gemini-x:generateContent",
    );
    const body = JSON.parse(String(seen?.init.body));
    expect(body.tools).toEqual([{ googleSearch: {} }]);
    expect(body.generationConfig.maxOutputTokens).toBe(100);
    expect(body.contents[0].parts[0].text).toBe("research these");
    expect((seen?.init.headers as Record<string, string>).Authorization).toBe("Bearer t0k");
  });

  it("uses the regional host outside global", () => {
    expect(vertexHost("us-central1")).toBe("us-central1-aiplatform.googleapis.com");
  });

  it("throws with Vertex AI's message on an HTTP error", async () => {
    await expect(groundedGenerate("x", OPTS, reply(429, "Resource exhausted"), token)).rejects.toThrow(
      /Vertex AI 429: Resource exhausted/,
    );
  });

  it("is treated as a VPN refusal by the retry wrapper, so it waits and then defers", async () => {
    const saved = { ...AI_OUTAGE };
    resetAiOutage();
    Object.assign(AI_OUTAGE, { pollMs: 1, waitMs: 20 });
    try {
      const refusal = reply(403, {
        error: {
          code: 403,
          message: "Request is prohibited by organization's policy. vpcServiceControlsUniqueIdentifier: x",
        },
      });
      const err = await exponentialBackoff(() => groundedGenerate("x", OPTS, refusal, token), 3, 1).catch((e) => e);
      expect(isAiUnavailable(err)).toBe(true);
    } finally {
      Object.assign(AI_OUTAGE, saved);
      resetAiOutage();
    }
  });
});

describe("answerText", () => {
  beforeEach(() => resetAiOutage());
  afterEach(() => resetAiOutage());

  it("joins the text parts and leaves out thought parts", () => {
    const body = {
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: "plan", thought: true }, { text: "a" }, { text: "b" }] } },
      ],
    };
    expect(answerText(body)).toBe("ab");
  });

  it("throws on a truncated answer instead of keeping half of it", () => {
    expect(() => answerText(ok("half", "MAX_TOKENS"))).toThrow(/truncated by maxTokens/);
  });

  it("throws when the turn did not finish, or the answer is empty", () => {
    expect(() => answerText(ok("x", "SAFETY"))).toThrow(/did not complete \(finishReason=SAFETY\)/);
    expect(() => answerText({})).toThrow(/finishReason=none/);
    expect(() => answerText(ok("   "))).toThrow(/empty answer/);
  });
});
