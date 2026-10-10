import type { NeuroLink } from "@juspay/neurolink";
import { describe, expect, it, vi } from "vitest";
import type { ClassificationEntry } from "../agents/classifier.js";
import { type TriageInput, neurolinkDecideTier, runTriage, withSystemOne } from "../agents/triage.js";

const input: TriageInput = {
  category: "Tech & Coding",
  subcategory: "CLI",
  tags: ["cli"],
  description: "a tool",
  caption: "check this",
};

const geminiVerdict = { tier: "evaluate-later", confidence: "medium", reason: "from gemini" };

function build(decide: Parameters<typeof withSystemOne>[0]["decide"], minConfidence = 0.6) {
  const fallback = vi.fn(async () => geminiVerdict);
  const system = withSystemOne({ decide, fallback, minConfidence, label: "System 1 test" });
  return { fallback, ...system };
}

describe("withSystemOne", () => {
  it("keeps a confident decision and never calls the fallback", async () => {
    const { generate, fallback, counts } = build(async () => ({ tier: "apply-now", confidence: 0.91 }));
    expect(await generate("prompt", input)).toEqual({
      tier: "apply-now",
      confidence: "high",
      reason: "System 1 test: apply-now (0.91)",
    });
    expect(fallback).not.toHaveBeenCalled();
    expect(counts()).toEqual({ decided: 1, fellBack: 0 });
  });

  it("reports medium confidence between the minimum and 0.8", async () => {
    const { generate } = build(async () => ({ tier: "skip", confidence: 0.7 }));
    expect(await generate("p", input)).toMatchObject({ tier: "skip", confidence: "medium" });
  });

  it("accepts a decision exactly at the minimum confidence", async () => {
    const { generate, fallback } = build(async () => ({ tier: "skip", confidence: 0.6 }));
    await generate("p", input);
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back, with the original prompt and input, when confidence is below the minimum", async () => {
    const { generate, fallback, counts } = build(async () => ({ tier: "apply-now", confidence: 0.59 }));
    expect(await generate("the prompt", input)).toBe(geminiVerdict);
    expect(fallback).toHaveBeenCalledWith("the prompt", input);
    expect(counts()).toEqual({ decided: 0, fellBack: 1 });
  });

  it("falls back on a tier the pipeline does not know", async () => {
    const { generate, fallback } = build(async () => ({ tier: "maybe", confidence: 0.99 }));
    expect(await generate("p", input)).toBe(geminiVerdict);
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("falls back when no decision provider answered", async () => {
    const { generate, fallback } = build(async () => null);
    expect(await generate("p", input)).toBe(geminiVerdict);
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("falls back when the decision call throws", async () => {
    const { generate, fallback, counts } = build(async () => {
      throw new Error("ENOTFOUND");
    });
    expect(await generate("p", input)).toBe(geminiVerdict);
    expect(fallback).toHaveBeenCalledOnce();
    expect(counts().fellBack).toBe(1);
  });

  it("lets a failing fallback propagate so runTriage can keep the prior verdict", async () => {
    const system = withSystemOne({
      decide: async () => null,
      fallback: async () => {
        throw new Error("gemini down");
      },
      minConfidence: 0.6,
      label: "x",
    });
    await expect(system.generate("p", input)).rejects.toThrow("gemini down");
  });
});

describe("neurolinkDecideTier", () => {
  const choice = (confidence: number, tier = "apply-now") => ({
    answers: { tier: { type: "choice", choice: tier, probabilities: { [tier]: confidence }, confidence } },
  });
  const fake = (result: unknown) => {
    const tryDecide = vi.fn(async (_request: unknown) => result);
    return { tryDecide, nl: { tryDecide } as unknown as NeuroLink };
  };

  it("asks one 4-way choice question about the video and returns the winning tier", async () => {
    const { tryDecide, nl } = fake(choice(0.88));
    expect(await neurolinkDecideTier(nl, "typesafe")(input)).toEqual({ tier: "apply-now", confidence: 0.88 });
    const req = tryDecide.mock.calls[0][0] as unknown as {
      provider?: string;
      state: Record<string, unknown>;
      questions: { tier: { type: string; criteria: Record<string, string> } };
    };
    expect(req.provider).toBe("typesafe");
    expect(req.state).toMatchObject({ category: "Tech & Coding", tags: ["cli"], caption: "check this" });
    expect(req.questions.tier.type).toBe("choice");
    expect(Object.keys(req.questions.tier.criteria).sort()).toEqual([
      "apply-now",
      "evaluate-later",
      "reference-only",
      "skip",
    ]);
  });

  it("names the model when one is configured, so a proxy route can use a model it allows", async () => {
    const { tryDecide, nl } = fake(choice(0.9));
    await neurolinkDecideTier(nl, "xor", "jev-latest")(input);
    expect(tryDecide.mock.calls[0][0]).toMatchObject({ provider: "xor", model: "jev-latest" });
  });

  it("sends no model when none is configured, leaving the provider's default", async () => {
    const { tryDecide, nl } = fake(choice(0.9));
    await neurolinkDecideTier(nl, "xor")(input);
    expect(tryDecide.mock.calls[0][0]).not.toHaveProperty("model");
  });

  it("leaves the provider unset so Neurolink picks the first configured one", async () => {
    const { tryDecide, nl } = fake(choice(0.9));
    await neurolinkDecideTier(nl, "")(input);
    expect(tryDecide.mock.calls[0][0]).not.toHaveProperty("provider");
  });

  it("truncates the caption to 500 characters, like the generate prompt", async () => {
    const { tryDecide, nl } = fake(choice(0.9));
    await neurolinkDecideTier(nl, "")({ ...input, caption: "x".repeat(900) });
    const state = (tryDecide.mock.calls[0][0] as unknown as { state: { caption: string } }).state;
    expect(state.caption).toHaveLength(500);
  });

  it("returns null when no provider is configured or the answer is not a choice", async () => {
    expect(await neurolinkDecideTier(fake(null).nl, "")(input)).toBeNull();
    expect(
      await neurolinkDecideTier(fake({ answers: { tier: { type: "boolean", probability: 0.9 } } }).nl, "")(input),
    ).toBeNull();
  });
});

describe("runTriage with System 1", () => {
  const cls = {
    category: "Tech & Coding",
    subcategory: "",
    tags: ["x"],
    description: "d",
    pk: "1",
    code: "c",
    username: "u",
  } as ClassificationEntry;

  it("stores the decision's tier and tells the cache which engine produced it", async () => {
    const { generate } = build(async () => ({ tier: "skip", confidence: 0.95 }));
    const one = await runTriage({
      classifications: { "a_1.mp4": cls },
      captionByPk: new Map([["1", "cap"]]),
      prior: {},
      model: "decide:typesafe@0.6+gemini",
      generate,
    });
    expect(one.a_1.tier).toBe("skip");
    expect(one.a_1.reason).toContain("System 1 test");

    const other = await runTriage({
      classifications: { "a_1.mp4": cls },
      captionByPk: new Map([["1", "cap"]]),
      prior: one,
      model: "gemini",
      generate: async () => geminiVerdict,
    });
    expect(other.a_1.tier).toBe("evaluate-later"); // a different engine re-triages instead of reusing the cached tier
  });
});
