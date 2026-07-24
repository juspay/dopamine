import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ClassificationEntry } from "../agents/classifier.js";
import {
  type TriageInput,
  loadTriageTiers,
  makeApplyGate,
  parseTriage,
  runTriage,
  triageHash,
} from "../agents/triage.js";
import { type Tier, feedsApplyLoop } from "../schemas/triage.js";
import { makeVideoId } from "../utils/video-id.js";

describe("feedsApplyLoop", () => {
  it("only apply-now and evaluate-later feed the loop", () => {
    expect(feedsApplyLoop("apply-now")).toBe(true);
    expect(feedsApplyLoop("evaluate-later")).toBe(true);
    expect(feedsApplyLoop("reference-only")).toBe(false);
    expect(feedsApplyLoop("skip")).toBe(false);
  });
});

describe("makeVideoId", () => {
  it("strips .mp4 and sanitizes", () => {
    expect(makeVideoId("chase.h.ai_39427.mp4")).toBe("chase.h.ai_39427");
    expect(makeVideoId("weird name!.mp4")).toBe("weird_name_");
  });
});

describe("parseTriage", () => {
  it("accepts a valid verdict", () => {
    const out = parseTriage({ tier: "apply-now", confidence: "high", reason: "  fzf CLI tool  " });
    expect(out.tier).toBe("apply-now");
    expect(out.reason).toBe("fzf CLI tool");
  });
  it("defaults malformed/unknown output to conservative reference-only", () => {
    expect(parseTriage(null).tier).toBe("reference-only");
    expect(parseTriage({ tier: "bogus", confidence: "high", reason: "x" }).tier).toBe("reference-only");
    expect(parseTriage({ tier: "apply-now" }).tier).toBe("reference-only"); // missing fields
  });
});

const input: TriageInput = {
  category: "Tech & Coding",
  subcategory: "CLI",
  tags: ["cli", "tool"],
  description: "a tool",
  caption: "check this",
};

describe("triageHash", () => {
  it("is stable and order-independent over tags", () => {
    const a = triageHash(input, "m");
    const b = triageHash({ ...input, tags: ["tool", "cli"] }, "m");
    expect(a).toBe(b);
  });
  it("changes on model, caption, or category change", () => {
    expect(triageHash(input, "m1")).not.toBe(triageHash(input, "m2"));
    expect(triageHash({ ...input, caption: "different" }, "m")).not.toBe(triageHash(input, "m"));
    expect(triageHash({ ...input, category: "Food & Cooking" }, "m")).not.toBe(triageHash(input, "m"));
  });
});

const cls = (over: Partial<ClassificationEntry> = {}): ClassificationEntry =>
  ({
    category: "Tech & Coding",
    subcategory: "",
    tags: ["x"],
    description: "d",
    pk: "1",
    code: "c",
    username: "u",
    ...over,
  }) as ClassificationEntry;

describe("runTriage", () => {
  const base = { captionByPk: new Map([["1", "cap"]]), model: "m" };

  it("triages classified videos and re-uses cache when the hash is unchanged", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      return { tier: "apply-now", confidence: "high", reason: "r" };
    };
    const classifications = { "a_1.mp4": cls() };
    const first = await runTriage({ ...base, classifications, prior: {}, generate });
    expect(first["a_1"].tier).toBe("apply-now");
    expect(calls).toBe(1);
    const second = await runTriage({ ...base, classifications, prior: first, generate });
    expect(calls).toBe(1); // unchanged hash → no LLM call
    expect(second["a_1"]).toBe(first["a_1"]);
  });

  it("skips unclassified/errored entries", async () => {
    const generate = async () => ({ tier: "skip", confidence: "high", reason: "" });
    const out = await runTriage({
      ...base,
      classifications: {
        "b_2.mp4": cls({ category: "" as ClassificationEntry["category"] }),
        "c_3.mp4": cls({ error: "boom" } as Partial<ClassificationEntry>),
      },
      prior: {},
      generate,
    });
    expect(Object.keys(out)).toEqual([]);
  });

  it("isolates a per-video failure and keeps other videos", async () => {
    const generate = async (p: string) => {
      if (p.includes("boomcat")) throw new Error("LLM down");
      return { tier: "reference-only", confidence: "low", reason: "" };
    };
    const out = await runTriage({
      ...base,
      captionByPk: new Map([
        ["1", "ok"],
        ["2", "boomcat"],
      ]),
      classifications: { "a_1.mp4": cls(), "d_2.mp4": cls({ pk: "2" }) },
      prior: {},
      generate,
    });
    expect(out["a_1"].tier).toBe("reference-only");
    expect(out["d_2"]).toBeUndefined(); // failed with no prior → absent, not fatal
  });

  it("carries a prior verdict forward when the classification is now errored", async () => {
    const generate = async () => ({ tier: "skip", confidence: "high", reason: "" });
    const out = await runTriage({
      ...base,
      classifications: { "a_1.mp4": cls({ error: "vertex timeout" } as Partial<ClassificationEntry>) },
      prior: { a_1: { tier: "apply-now", confidence: "high", reason: "langchain", hash: "h1" } },
      generate,
    });
    expect(out["a_1"].tier).toBe("apply-now"); // transient error must NOT wipe the good tier
  });

  it("keeps the first-seen entry on an id collision", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      return { tier: calls === 1 ? "apply-now" : "skip", confidence: "high", reason: "" };
    };
    const out = await runTriage({
      ...base,
      captionByPk: new Map([
        ["1", "a"],
        ["2", "b"],
      ]),
      // "trip to japan.mp4" and "trip_to_japan.mp4" both sanitise to id "trip_to_japan"
      classifications: { "trip to japan.mp4": cls({ pk: "1" }), "trip_to_japan.mp4": cls({ pk: "2" }) },
      prior: {},
      generate,
    });
    expect(Object.keys(out)).toEqual(["trip_to_japan"]);
    expect(out["trip_to_japan"].tier).toBe("apply-now"); // first-seen wins, second is skipped
    expect(calls).toBe(1);
  });
});

describe("makeApplyGate", () => {
  it("is a no-op (admits everything) when the tier map is empty", () => {
    const gate = makeApplyGate(new Map());
    expect(gate("anything")).toBe(true);
    expect(gate("x_1")).toBe(true);
  });
  it("admits only apply-tiers, excludes reference/skip and un-triaged ids", () => {
    const gate = makeApplyGate(
      new Map<string, Tier>([
        ["a", "apply-now"],
        ["b", "evaluate-later"],
        ["c", "reference-only"],
        ["d", "skip"],
      ]),
    );
    expect(gate("a")).toBe(true);
    expect(gate("b")).toBe(true);
    expect(gate("c")).toBe(false);
    expect(gate("d")).toBe(false);
    expect(gate("missing")).toBe(false); // un-triaged id in a non-empty map → excluded
  });
});

describe("loadTriageTiers", () => {
  const entry = (tier: Tier) => ({ tier, confidence: "high" as const, reason: "r", hash: "h" });

  it("reads id → tier from a triage file and yields an empty map when absent", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "triage-"));
    try {
      const file = path.join(dir, "triage.json");
      await fs.writeFile(file, JSON.stringify({ a_1: entry("apply-now"), b_2: entry("skip") }));
      const tiers = await loadTriageTiers(file);
      expect(tiers.get("a_1")).toBe("apply-now");
      expect(tiers.get("b_2")).toBe("skip");
      expect(await loadTriageTiers(path.join(dir, "missing.json"))).toEqual(new Map());
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("wires end-to-end through makeApplyGate to admit apply-tier ids only", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "triage-"));
    try {
      const file = path.join(dir, "triage.json");
      await fs.writeFile(file, JSON.stringify({ keep_1: entry("apply-now"), drop_2: entry("reference-only") }));
      const gate = makeApplyGate(await loadTriageTiers(file));
      expect(gate("keep_1")).toBe(true);
      expect(gate("drop_2")).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
