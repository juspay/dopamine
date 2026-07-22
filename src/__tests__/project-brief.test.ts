import { describe, expect, it } from "vitest";
import {
  type BriefVideo,
  briefHash,
  collectProjectLearnings,
  parseBrief,
  runProjectBrief,
} from "../agents/project-brief.js";
import type { MappingSet } from "../agents/project-mapper.js";
import type { Project } from "../schemas/projects.js";

const vids = new Map<string, BriefVideo>([
  [
    "v1",
    {
      id: "v1",
      title: "RRF hybrid search",
      takeaways: ["merge BM25 + vectors"],
      toolNames: ["sqlite"],
      sourceUrl: "",
      docHash: "d1",
    },
  ],
  ["v2", { id: "v2", title: "Reranking", takeaways: ["rerank top-k"], toolNames: [], sourceUrl: "", docHash: "d2" }],
]);
const mappings: MappingSet = {
  v1: [{ project: "Dopamine", confidence: "high", reason: "search relevance" }],
  v2: [
    { project: "Dopamine", confidence: "medium", reason: "ranking" },
    { project: "X", confidence: "low", reason: "n/a" },
  ],
};

describe("collectProjectLearnings", () => {
  it("groups medium+ mappings by project and resolves learning fields", () => {
    const m = collectProjectLearnings(mappings, vids);
    expect(
      m
        .get("Dopamine")
        ?.map((l) => l.id)
        .sort(),
    ).toEqual(["v1", "v2"]);
    expect(m.has("X")).toBe(false); // only a low-confidence mapping → excluded
    expect(m.get("Dopamine")?.[0].reason).toBeTruthy();
  });

  it("fails closed on an unrecognized confidence value", () => {
    const weird: MappingSet = { v1: [{ project: "Dopamine", confidence: "bogus" as never, reason: "r" }] };
    expect(collectProjectLearnings(weird, vids).has("Dopamine")).toBe(false);
  });
});

const proj: Project = { name: "Dopamine", description: "d", keywords: [] };

describe("briefHash", () => {
  const ls = [
    { id: "v1", title: "t", takeaways: [], toolNames: [], reason: "r", confidence: "high" as const, docHash: "d1" },
  ];
  it("is order-independent and stable", () => {
    expect(briefHash(proj, ls, "m")).toBe(briefHash(proj, [...ls], "m"));
  });
  it("changes when the model changes", () => {
    expect(briefHash(proj, ls, "m1")).not.toBe(briefHash(proj, ls, "m2"));
  });
  it("changes when a learning's docHash changes (re-analyzed content, same title)", () => {
    const reanalyzed = [{ ...ls[0], docHash: "d1-v2" }];
    expect(briefHash(proj, reanalyzed, "m")).not.toBe(briefHash(proj, ls, "m"));
  });
  it("changes when a learning's confidence changes (re-judged)", () => {
    const requdged = [{ ...ls[0], confidence: "medium" as const }];
    expect(briefHash(proj, requdged, "m")).not.toBe(briefHash(proj, ls, "m"));
  });
});

describe("parseBrief", () => {
  const known = new Set(["v1", "v2"]);
  it("clamps to 5 actions, drops unknown basedOn, dedupes", () => {
    const raw = {
      actions: Array.from({ length: 8 }, () => ({ title: "t", detail: "d", basedOn: ["v1", "v1", "zzz"] })),
    };
    const out = parseBrief(raw, known);
    expect(out.length).toBe(5);
    expect(out[0].basedOn).toEqual(["v1"]);
  });
  it("returns [] for malformed input", () => {
    expect(parseBrief(null, known)).toEqual([]);
    expect(parseBrief({ actions: "nope" }, known)).toEqual([]);
    expect(parseBrief({ actions: [{ title: 5 }] }, known)).toEqual([]);
  });
});

describe("runProjectBrief", () => {
  const projects: Project[] = [{ name: "Dopamine", description: "d", keywords: [] }];
  const videos = [...vids.values()];

  it("regenerates only changed projects and prunes removed ones", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      return { actions: [{ title: "Do X", detail: "d", basedOn: ["v1"] }] };
    };
    const base = { projects, mappings, videos, model: "m", now: () => "T", minMappings: 1, generate };

    const first = await runProjectBrief({ ...base, prior: {} });
    expect(first.Dopamine.actions[0].title).toBe("Do X");
    expect(calls).toBe(1);

    const second = await runProjectBrief({ ...base, prior: first });
    expect(calls).toBe(1); // unchanged hash → cached, no second LLM call
    expect(second.Dopamine).toBe(first.Dopamine);

    const pruned = await runProjectBrief({ ...base, projects: [], prior: first });
    expect(Object.keys(pruned)).toEqual([]);
  });

  it("keeps other projects' briefs when one project's generate() throws", async () => {
    const twoProjects: Project[] = [
      { name: "Dopamine", description: "d", keywords: [] },
      { name: "Boom", description: "b", keywords: [] },
    ];
    const twoMappings: MappingSet = {
      v1: [{ project: "Dopamine", confidence: "high", reason: "r" }],
      v2: [{ project: "Boom", confidence: "high", reason: "r" }],
    };
    const generate = async (prompt: string) => {
      if (prompt.includes("Boom")) throw new Error("LLM exploded");
      return { actions: [{ title: "safe", detail: "d", basedOn: [] }] };
    };
    const out = await runProjectBrief({
      projects: twoProjects,
      mappings: twoMappings,
      videos,
      prior: {},
      model: "m",
      now: () => "T",
      minMappings: 1,
      generate,
    });
    expect(out.Dopamine.actions[0].title).toBe("safe"); // not discarded by Boom's failure
    expect(out.Boom).toBeUndefined(); // failed with no prior → simply absent
  });

  it("skips projects below the minMappings threshold", async () => {
    const solo: Project[] = [{ name: "Solo", description: "d", keywords: [] }];
    const oneMapping: MappingSet = { v1: [{ project: "Solo", confidence: "high", reason: "r" }] };
    const generate = async () => ({ actions: [{ title: "t", detail: "d", basedOn: [] }] });
    const out = await runProjectBrief({
      projects: solo,
      mappings: oneMapping,
      videos,
      prior: {},
      model: "m",
      now: () => "T",
      minMappings: 2,
      generate,
    });
    expect(Object.keys(out)).toEqual([]);
  });
});
