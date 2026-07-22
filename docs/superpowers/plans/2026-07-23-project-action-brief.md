# Per-Project Action Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synthesize each project's mapped learnings into 3–5 prioritized actions, surfaced on the `/project/<name>` dashboard page and in per-repo `IDEAS.md` files.

**Architecture:** A new incremental agent (`project-brief.ts`) reads `project_mappings.json` + `knowledge_base.json`, LLM-synthesizes a per-project brief (hash-gated cache in `videos/project_briefs.json`), runs as a pipeline step after project mapping. The data builder emits `dashboard/data/briefs.json`; the project page renders an "Actions to try" section; the ideas-writer replaces per-learning blocks with a marked, replaceable brief section.

**Tech Stack:** TypeScript ESM (Node ≥24), `@juspay/neurolink` (Vertex `gemini-2.5-flash`, structured JSON), `node:sqlite` (unused here — briefs read JSON state), Svelte 5 (runes), vitest.

## Global Constraints

- Strict TS, no `any` (use `unknown` + narrowing). Named exports only. Functional/immutable.
- `neurolink.generate({ provider:"vertex", model, schema, output:{format:"json"}, disableTools:true })` for structured calls.
- All state writes atomic (tmp + rename). State reads tolerate missing/corrupt files.
- Model text passed to files/markdown must be neutralised (`mdSafe`) against `<!--`/`-->`.
- `juspay/dopamine` is PUBLIC: no personal paths/usernames in committed code. `projects.json` / `project_mappings.json` / `project_briefs.json` / `IDEAS.md` are personal/gitignored.
- Mirror any shared shape in BOTH `src/dashboard/data-builder.ts` and `web/src/lib/types.ts`.

---

### Task 1: Brief schema

**Files:**
- Create: `src/schemas/brief.ts`
- Test: `src/__tests__/brief-schema.test.ts`

**Interfaces:**
- Produces: `BriefAction {title:string; detail:string; basedOn:string[]}`, `ProjectBrief {hash:string; generatedAt:string; actions:BriefAction[]}`, `ProjectBriefs = Record<string,ProjectBrief>`, `BRIEF_LLM_SCHEMA` (JSON Schema object).

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { BRIEF_LLM_SCHEMA } from "../schemas/brief.js";

describe("BRIEF_LLM_SCHEMA", () => {
  it("requires actions[] of {title, detail, basedOn}", () => {
    const props = (BRIEF_LLM_SCHEMA as any).properties.actions.items.properties;
    expect(Object.keys(props).sort()).toEqual(["basedOn", "detail", "title"]);
    expect((BRIEF_LLM_SCHEMA as any).properties.actions.type).toBe("array");
  });
});
```
- [ ] **Step 2: Run — expect FAIL** (`npm test -- src/__tests__/brief-schema.test.ts`) — "Cannot find module".
- [ ] **Step 3: Implement**
```ts
export interface BriefAction { title: string; detail: string; basedOn: string[] }
export interface ProjectBrief { hash: string; generatedAt: string; actions: BriefAction[] }
export type ProjectBriefs = Record<string, ProjectBrief>;

export const BRIEF_LLM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["actions"],
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "basedOn"],
        properties: {
          title: { type: "string", description: "Imperative action, e.g. 'Add reranking to search'" },
          detail: { type: "string", description: "1-2 sentences: what to do and why, specific to this project" },
          basedOn: { type: "array", items: { type: "string" }, description: "videoIds this action draws on" },
        },
      },
    },
  },
} as const;
```
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `git add src/schemas/brief.ts src/__tests__/brief-schema.test.ts && git commit -m "feat(brief): action-brief schema"`

---

### Task 2: Config

**Files:**
- Modify: `src/pipeline/config.ts` (add to CONFIG + STATE)
- Test: `src/__tests__/config.test.ts` (extend)

**Interfaces:**
- Produces: `CONFIG.BRIEF_MODEL:string`, `CONFIG.BRIEF_MIN_MAPPINGS:number`, `CONFIG.STATE.PROJECT_BRIEFS:string`.

- [ ] **Step 1: Failing test** — add to `config.test.ts`:
```ts
it("exposes brief config", () => {
  expect(CONFIG.BRIEF_MODEL).toBeTruthy();
  expect(CONFIG.BRIEF_MIN_MAPPINGS).toBeGreaterThanOrEqual(1);
  expect(CONFIG.STATE.PROJECT_BRIEFS).toMatch(/project_briefs\.json$/);
});
```
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement** — in `config.ts`, beside `MAP_MODEL`:
```ts
BRIEF_MODEL: process.env.BRIEF_MODEL ?? "gemini-2.5-flash",
BRIEF_MIN_MAPPINGS: Number.parseInt(process.env.BRIEF_MIN_MAPPINGS ?? "1", 10),
```
and in `STATE`, beside `PROJECT_MAPPINGS`:
```ts
PROJECT_BRIEFS: path.resolve("videos", "project_briefs.json"),
```
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Commit** `git add src/pipeline/config.ts src/__tests__/config.test.ts && git commit -m "feat(brief): config"`

---

### Task 3: Pure agent helpers

**Files:**
- Create: `src/agents/project-brief.ts` (helpers only this task)
- Test: `src/__tests__/project-brief.test.ts`

**Interfaces:**
- Consumes: `MappingSet` (from `project-mapper.js`), `IdeaVideo` (from `ideas-writer.js`), `Project` (from `schemas/projects.js`), `BriefAction`/`ProjectBrief` (Task 1).
- Produces:
  - `type BriefLearning = { id:string; title:string; takeaways:string[]; toolNames:string[]; reason:string }`
  - `collectProjectLearnings(mappings:MappingSet, videosById:Map<string,IdeaVideo>, minConfidence?:"low"|"medium"|"high"): Map<string, BriefLearning[]>`
  - `briefHash(project:Project, learnings:BriefLearning[], model:string): string`
  - `briefPrompt(project:Project, learnings:BriefLearning[]): string`
  - `parseBrief(raw:unknown, knownIds:Set<string>): BriefAction[]`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { collectProjectLearnings, briefHash, parseBrief } from "../agents/project-brief.js";

const vids = new Map([
  ["v1", { id: "v1", title: "RRF hybrid search", takeaways: ["merge BM25 + vectors"], toolNames: ["sqlite"], sourceUrl: "" }],
  ["v2", { id: "v2", title: "Reranking", takeaways: ["rerank top-k"], toolNames: [], sourceUrl: "" }],
]);
const mappings = {
  v1: [{ project: "Dopamine", confidence: "high", reason: "search relevance" }],
  v2: [{ project: "Dopamine", confidence: "medium", reason: "ranking" }, { project: "X", confidence: "low", reason: "n/a" }],
};

describe("collectProjectLearnings", () => {
  it("groups medium+ mappings by project and resolves learning fields", () => {
    const m = collectProjectLearnings(mappings as any, vids as any);
    expect(m.get("Dopamine")?.map((l) => l.id).sort()).toEqual(["v1", "v2"]);
    expect(m.has("X")).toBe(false); // only low-confidence mapping → excluded
    expect(m.get("Dopamine")?.[0].reason).toBeTruthy();
  });
});

describe("briefHash", () => {
  const proj = { name: "Dopamine", description: "d", keywords: [] } as any;
  const ls = [{ id: "v1", title: "t", takeaways: [], toolNames: [], reason: "r" }];
  it("is order-independent over learnings and stable", () => {
    const a = briefHash(proj, ls, "m");
    const b = briefHash(proj, [...ls], "m");
    expect(a).toBe(b);
  });
  it("changes when the model changes", () => {
    expect(briefHash(proj, ls, "m1")).not.toBe(briefHash(proj, ls, "m2"));
  });
});

describe("parseBrief", () => {
  const known = new Set(["v1", "v2"]);
  it("clamps to 5 actions, drops unknown basedOn, tolerates junk", () => {
    const raw = { actions: Array.from({ length: 8 }, (_, i) => ({ title: `t${i}`, detail: "d", basedOn: ["v1", "zzz"] })) };
    const out = parseBrief(raw, known);
    expect(out.length).toBe(5);
    expect(out[0].basedOn).toEqual(["v1"]);
  });
  it("returns [] for malformed input", () => {
    expect(parseBrief(null, known)).toEqual([]);
    expect(parseBrief({ actions: "nope" }, known)).toEqual([]);
  });
});
```
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement** `src/agents/project-brief.ts` (helpers):
```ts
import { createHash } from "node:crypto";
import type { Project } from "../schemas/projects.js";
import type { MappingSet } from "./project-mapper.js";
import type { IdeaVideo } from "./ideas-writer.js";
import type { BriefAction } from "../schemas/brief.js";

const RANK = { low: 0, medium: 1, high: 2 } as const;
const MAX_ACTIONS = 5;
const TITLE_MAX = 120;
const DETAIL_MAX = 400;

export type BriefLearning = { id: string; title: string; takeaways: string[]; toolNames: string[]; reason: string };

export function collectProjectLearnings(
  mappings: MappingSet,
  videosById: Map<string, IdeaVideo>,
  minConfidence: keyof typeof RANK = "medium",
): Map<string, BriefLearning[]> {
  const floor = RANK[minConfidence];
  const out = new Map<string, BriefLearning[]>();
  for (const [videoId, list] of Object.entries(mappings)) {
    const v = videosById.get(videoId);
    if (!v) continue;
    for (const m of list) {
      if (RANK[m.confidence] < floor) continue;
      const arr = out.get(m.project) ?? [];
      arr.push({ id: v.id, title: v.title, takeaways: v.takeaways, toolNames: v.toolNames, reason: m.reason });
      out.set(m.project, arr);
    }
  }
  return out;
}

export function briefHash(project: Project, learnings: BriefLearning[], model: string): string {
  const parts = learnings
    .map((l) => `${l.id}${l.reason}${l.title}`)
    .sort()
    .join("");
  return createHash("sha256").update(`${model}${project.name}${project.description}${parts}`).digest("hex");
}

export function briefPrompt(project: Project, learnings: BriefLearning[]): string {
  return [
    `Project: ${project.name} — ${project.description}`,
    "",
    "You are advising on this project. Below are saved learnings judged relevant to it.",
    "Produce 3–5 CONCRETE, prioritized actions to try in this project — most impactful first.",
    "Each action: an imperative title, 1–2 sentences of specific detail (what to do and why for THIS project),",
    "and basedOn = the videoIds it draws on. Combine related learnings; do NOT merely restate a learning.",
    "If only one learning is given, return a single focused action.",
    "",
    "LEARNINGS:",
    ...learnings.map((l) => `- [${l.id}] ${l.title} — ${l.takeaways.slice(0, 3).join("; ")}${l.toolNames.length ? ` (tools: ${l.toolNames.join(", ")})` : ""} [why: ${l.reason}]`),
  ].join("\n");
}

export function parseBrief(raw: unknown, knownIds: Set<string>): BriefAction[] {
  if (typeof raw !== "object" || raw === null) return [];
  const actions = (raw as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) return [];
  const out: BriefAction[] = [];
  for (const a of actions) {
    if (typeof a !== "object" || a === null) continue;
    const { title, detail, basedOn } = a as Record<string, unknown>;
    if (typeof title !== "string" || typeof detail !== "string") continue;
    const ids = Array.isArray(basedOn) ? basedOn.filter((x): x is string => typeof x === "string" && knownIds.has(x)) : [];
    out.push({ title: title.trim().slice(0, TITLE_MAX), detail: detail.trim().slice(0, DETAIL_MAX), basedOn: [...new Set(ids)] });
    if (out.length >= MAX_ACTIONS) break;
  }
  return out;
}
```
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Commit** `git add src/agents/project-brief.ts src/__tests__/project-brief.test.ts && git commit -m "feat(brief): pure helpers (collect, hash, prompt, parse)"`

---

### Task 4: Agent orchestration

**Files:**
- Modify: `src/agents/project-brief.ts` (add `runProjectBriefAgent`, state IO)
- Test: `src/__tests__/project-brief.test.ts` (extend with an injected-deps test)

**Interfaces:**
- Consumes: helpers (Task 3), `CONFIG` (Task 2), `ProjectBriefs`/`ProjectBrief` (Task 1), `loadProjects` (`schemas/projects.js`), `IdeaVideo`.
- Produces: `runProjectBrief(deps): Promise<ProjectBriefs>` (pure-ish, injected IO+LLM, tested) and `runProjectBriefAgent(neurolink): Promise<void>` (wires real IO).

- [ ] **Step 1: Failing test** (deterministic, no network):
```ts
import { runProjectBrief } from "../agents/project-brief.js";
it("regenerates only changed projects and prunes removed ones", async () => {
  const projects = [{ name: "Dopamine", description: "d", keywords: [] }] as any;
  const mappings = { v1: [{ project: "Dopamine", confidence: "high", reason: "r" }] };
  const videos = [{ id: "v1", title: "t", takeaways: ["x"], toolNames: [], sourceUrl: "" }];
  let calls = 0;
  const gen = async () => { calls++; return { actions: [{ title: "Do X", detail: "d", basedOn: ["v1"] }] }; };
  const first = await runProjectBrief({ projects, mappings, videos, prior: {}, model: "m", now: () => "T", generate: gen, minMappings: 1 });
  expect(first.Dopamine.actions[0].title).toBe("Do X");
  expect(calls).toBe(1);
  const second = await runProjectBrief({ projects, mappings, videos, prior: first, model: "m", now: () => "T", generate: gen, minMappings: 1 });
  expect(calls).toBe(1); // unchanged hash → cached, no second LLM call
  const pruned = await runProjectBrief({ projects: [], mappings, videos, prior: first, model: "m", now: () => "T", generate: gen, minMappings: 1 });
  expect(Object.keys(pruned)).toEqual([]);
});
```
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement** — append to `project-brief.ts`:
```ts
import { CONFIG } from "../pipeline/config.js";
import { loadProjects } from "../schemas/projects.js";
import type { ProjectBrief, ProjectBriefs } from "../schemas/brief.js";
import { BRIEF_LLM_SCHEMA } from "../schemas/brief.js";
import fs from "node:fs/promises";
import type { NeuroLink } from "@juspay/neurolink";

export interface BriefDeps {
  projects: Project[];
  mappings: MappingSet;
  videos: IdeaVideo[];
  prior: ProjectBriefs;
  model: string;
  now: () => string;
  minMappings: number;
  generate: (prompt: string) => Promise<unknown>;
}

export async function runProjectBrief(d: BriefDeps): Promise<ProjectBriefs> {
  const videosById = new Map(d.videos.map((v) => [v.id, v]));
  const byProject = collectProjectLearnings(d.mappings, videosById);
  const names = new Set(d.projects.map((p) => p.name));
  const out: ProjectBriefs = {};
  for (const project of d.projects) {
    const learnings = byProject.get(project.name) ?? [];
    if (learnings.length < d.minMappings) continue;
    const hash = briefHash(project, learnings, d.model);
    const cached = d.prior[project.name];
    if (cached && cached.hash === hash) { out[project.name] = cached; continue; }
    const raw = await d.generate(briefPrompt(project, learnings));
    const actions = parseBrief(raw, new Set(learnings.map((l) => l.id)));
    out[project.name] = { hash, generatedAt: d.now(), actions };
  }
  void names; // pruning is implicit: only current projects are emitted
  return out;
}

async function loadJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, "utf8")) as T; } catch { return fallback; }
}
async function writeAtomic(file: string, data: string): Promise<void> {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, file);
}

export async function runProjectBriefAgent(neurolink: NeuroLink): Promise<void> {
  const projects = await loadProjects(CONFIG.PROJECTS_CONFIG);
  const mappingsFile = await loadJson<{ mappings: MappingSet }>(CONFIG.STATE.PROJECT_MAPPINGS, { mappings: {} });
  const kb = await loadJson<Record<string, { title?: string; key_takeaways?: { takeaway: string }[] }>>(CONFIG.STATE.KNOWLEDGE_BASE, {});
  const videos: IdeaVideo[] = buildIdeaVideos(kb); // see note below
  const prior = await loadJson<ProjectBriefs>(CONFIG.STATE.PROJECT_BRIEFS, {});
  console.log("=== Project Brief ===");
  const generate = async (prompt: string): Promise<unknown> => {
    const res = await neurolink.generate({ input: { text: prompt }, provider: "vertex", model: CONFIG.BRIEF_MODEL, schema: BRIEF_LLM_SCHEMA, output: { format: "json" }, disableTools: true });
    return res.content ?? res.text ?? res;
  };
  const briefs = await runProjectBrief({ projects, mappings: mappingsFile.mappings, videos, prior, model: CONFIG.BRIEF_MODEL, now: () => new Date().toISOString(), minMappings: CONFIG.BRIEF_MIN_MAPPINGS, generate });
  await writeAtomic(CONFIG.STATE.PROJECT_BRIEFS, JSON.stringify(briefs, null, 2));
  const n = Object.values(briefs).reduce((a, b) => a + b.actions.length, 0);
  console.log(`  Briefs: ${Object.keys(briefs).length} project(s), ${n} action(s).`);
}
```
Note: reuse the existing KB→IdeaVideo mapping. If `project-mapper.ts` already exports a KB-to-IdeaVideo builder, import it; otherwise add a small local `buildIdeaVideos(kb)` that maps each `[filename, entry]` to `{ id: filename-without-.mp4, title, takeaways: entry.key_takeaways.map(t=>t.takeaway), toolNames: [], sourceUrl: "" }`. **Verify the actual KB shape and the id convention against `data-builder.ts` before writing this** (ids in mappings are the stem without `.mp4`).
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Commit** `git add src/agents/project-brief.ts src/__tests__/project-brief.test.ts && git commit -m "feat(brief): incremental agent orchestration"`

---

### Task 5: Pipeline step

**Files:**
- Modify: `src/pipeline/runner.ts` (import + insert step after "Project mapping")

**Interfaces:**
- Consumes: `runProjectBriefAgent` (Task 4).

- [ ] **Step 1** Import: `import { runProjectBriefAgent } from "../agents/project-brief.js";`
- [ ] **Step 2** Insert into the `steps` array immediately AFTER `{ name: "Project mapping", ... }` and BEFORE `{ name: "Digest", ... }`:
```ts
{ name: "Project brief", run: () => runProjectBriefAgent(neurolink) },
```
- [ ] **Step 3** `npm run build` → tsc clean; `npm test` → all pass (no runner unit test; covered by build).
- [ ] **Step 4: Commit** `git add src/pipeline/runner.ts && git commit -m "feat(brief): pipeline step after project mapping"`

---

### Task 6: Data-builder emits briefs.json

**Files:**
- Modify: `src/dashboard/data-builder.ts` (read PROJECT_BRIEFS, write `dashboard/data/briefs.json`)
- Test: none new (covered by web types + manual run); optional assert in an existing builder test if present.

**Interfaces:**
- Produces: `dashboard/data/briefs.json` = `Record<string, { actions: BriefAction[] }>`.

- [ ] **Step 1** Near where mappings are loaded, load briefs:
```ts
import type { ProjectBriefs } from "../schemas/brief.js";
const projectBriefs = await loadState<ProjectBriefs>(CONFIG.STATE.PROJECT_BRIEFS, {});
```
- [ ] **Step 2** After writing the other data files, emit the public brief shape (strip hash/generatedAt):
```ts
const briefsPublic = Object.fromEntries(
  Object.entries(projectBriefs).map(([name, b]) => [name, { actions: b.actions }]),
);
await fs.writeFile(path.join(dataDir, "briefs.json"), JSON.stringify(briefsPublic), "utf8");
```
- [ ] **Step 3** `npm run build` clean; `npm run dashboard:data` writes `dashboard/data/briefs.json`.
- [ ] **Step 4: Commit** `git add src/dashboard/data-builder.ts && git commit -m "feat(brief): emit briefs.json for the dashboard"`

---

### Task 7: Web types + data loader

**Files:**
- Modify: `web/src/lib/types.ts` (add `BriefAction`, `Briefs`)
- Modify: `web/src/lib/data.svelte.ts` (add `loadBriefs`/`getBriefs`)

**Interfaces:**
- Produces: `Briefs = Record<string, { actions: BriefAction[] }>`; `getBriefs(): Briefs | null`; `loadBriefs(): void`.

- [ ] **Step 1** In `types.ts`:
```ts
export interface BriefAction { title: string; detail: string; basedOn: string[] }
export type Briefs = Record<string, { actions: BriefAction[] }>;
```
- [ ] **Step 2** In `data.svelte.ts`, mirror the existing `loadFacets`/`getFacets` pattern for `briefs.json` (a `$state` holder, a fetch guard, a getter). Fetch path: `${base}/data/briefs.json`; on 404 or parse error, set `{}` (feature simply absent).
- [ ] **Step 3** `npm --prefix web run check` → 0 errors.
- [ ] **Step 4: Commit** `git add web/src/lib/types.ts web/src/lib/data.svelte.ts && git commit -m "feat(brief): web types + briefs loader"`

---

### Task 8: Project page "Actions to try"

**Files:**
- Modify: `web/src/routes/project/[name]/+page.svelte`

- [ ] **Step 1** In `<script>`: `loadBriefs()` in an `$effect`; `const brief = $derived(getBriefs()?.[matchName] ?? null)` where `matchName` resolves case-insensitively against `getBriefs()` keys (project names are exact but guard case like the learnings filter does).
- [ ] **Step 2** Render, ABOVE the learnings `<VideoGrid>`, when `brief?.actions.length`:
```svelte
{#if brief && brief.actions.length}
  <section class="actions">
    <h2 class="actions-title">Actions to try</h2>
    <ol class="action-list">
      {#each brief.actions as a}
        <li class="action">
          <p class="action-head">{a.title}</p>
          <p class="action-detail">{a.detail}</p>
          {#if a.basedOn.length}
            <p class="based-on">Based on:
              {#each a.basedOn as id, i}<a href={'/video/' + id}>learning{i + 1 < a.basedOn.length ? '' : ''}</a>{i < a.basedOn.length - 1 ? ', ' : ''}{/each}
            </p>
          {/if}
        </li>
      {/each}
    </ol>
  </section>
{/if}
```
- [ ] **Step 3** Add scoped styles (theme-aware, using existing `--space-*`/`--color-*` vars). `npm --prefix web run check` → 0 errors.
- [ ] **Step 4: Commit** `git add web/src/routes/project/[name]/+page.svelte && git commit -m "feat(brief): Actions to try on the project page"`

---

### Task 9: IDEAS.md brief section (replace per-learning blocks)

**Files:**
- Modify: `src/agents/ideas-writer.ts` (add `writeBriefIdeas`; deprecate the per-`(video,project)` append path)
- Modify: caller that runs the ideas step (wherever `writeIdeas` is invoked — trace it) to call `writeBriefIdeas` with the briefs.
- Test: `src/__tests__/ideas-writer.test.ts` (extend)

**Interfaces:**
- Consumes: `ProjectBriefs` (Task 1), `Project` (`schemas/projects.js`), existing `FsLike`/`realFs`/`mdSafe`/`writeAtomic`.
- Produces: `writeBriefIdeas(briefs: ProjectBriefs, projects: Project[], opts?: { fsImpl?: FsLike }): Promise<void>`.

- [ ] **Step 1: Failing test**
```ts
import { writeBriefIdeas } from "../agents/ideas-writer.js";
function memFs(seed: Record<string, string> = {}) {
  const files = new Map(Object.entries(seed));
  return {
    fs: {
      readFile: async (p: string) => { if (!files.has(p)) throw new Error("enoent"); return files.get(p)!; },
      writeFile: async (p: string, d: string) => { files.set(p, d); },
      rename: async (a: string, b: string) => { files.set(b, files.get(a)!); files.delete(a); },
      access: async (p: string) => { if (!p.endsWith("/repo") && !files.has(p)) { /* dir exists */ } },
    } as any,
    files,
  };
}
it("appends a brief once, skips when same hash, replaces on new hash", async () => {
  const { fs, files } = memFs();
  const projects = [{ name: "Dopamine", description: "d", keywords: [], path: "/repo" }] as any;
  const briefsA = { Dopamine: { hash: "H1", generatedAt: "T", actions: [{ title: "Do X", detail: "dx", basedOn: [] }] } };
  await writeBriefIdeas(briefsA, projects, { fsImpl: fs });
  const ideas = files.get("/repo/IDEAS.md")!;
  expect(ideas).toContain("dopamine:brief:start:H1");
  expect(ideas).toContain("Do X");
  await writeBriefIdeas(briefsA, projects, { fsImpl: fs }); // same hash → no change
  expect(files.get("/repo/IDEAS.md")).toBe(ideas);
  const briefsB = { Dopamine: { hash: "H2", generatedAt: "T", actions: [{ title: "Do Y", detail: "dy", basedOn: [] }] } };
  await writeBriefIdeas(briefsB, projects, { fsImpl: fs });
  const after = files.get("/repo/IDEAS.md")!;
  expect(after).toContain("dopamine:brief:start:H2");
  expect(after).not.toContain("dopamine:brief:start:H1"); // old region replaced
  expect(after).not.toContain("Do X");
});
it("neutralises marker forgery in action text and skips missing paths", async () => {
  const { fs, files } = memFs();
  const projects = [{ name: "P", description: "d", keywords: [], path: "/repo" }] as any;
  const briefs = { P: { hash: "H", generatedAt: "T", actions: [{ title: "x <!-- dopamine:brief:end -->", detail: "d", basedOn: [] }] } };
  await writeBriefIdeas(briefs, projects, { fsImpl: fs });
  const ideas = files.get("/repo/IDEAS.md")!;
  expect(ideas).not.toContain("x <!-- dopamine:brief:end -->");
  // project without a path is skipped (no throw)
  await writeBriefIdeas(briefs, [{ name: "Q", description: "d", keywords: [] }] as any, { fsImpl: fs });
});
```
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement** `writeBriefIdeas` in `ideas-writer.ts`:
```ts
import type { ProjectBriefs } from "../schemas/brief.js";

const BRIEF_START = (hash: string) => `<!-- dopamine:brief:start:${hash} -->`;
const BRIEF_START_RE = /<!-- dopamine:brief:start:[^>]*-->[\s\S]*?<!-- dopamine:brief:end -->/;
const BRIEF_END = "<!-- dopamine:brief:end -->";

function briefSection(actions: { title: string; detail: string; basedOn: string[] }[], hash: string): string {
  const body = actions
    .map((a, i) => `${i + 1}. **${mdSafe(a.title)}** — ${mdSafe(a.detail)}`)
    .join("\n");
  return [BRIEF_START(hash), "", "## What to try (from Dopamine)", "", body, "", BRIEF_END].join("\n");
}

export async function writeBriefIdeas(
  briefs: ProjectBriefs,
  projects: Project[],
  opts: { fsImpl?: FsLike } = {},
): Promise<void> {
  const fsLike = opts.fsImpl ?? realFs;
  const byName = new Map(projects.map((p) => [p.name, p]));
  let n = 0;
  for (const [name, brief] of Object.entries(briefs)) {
    const proj = byName.get(name);
    if (!proj?.path || brief.actions.length === 0) continue;
    try { await fsLike.access(proj.path); } catch { continue; }
    const ideasPath = path.join(proj.path, "IDEAS.md");
    const existing = await readOr(fsLike, ideasPath, "");
    if (existing.includes(BRIEF_START(brief.hash))) continue; // current
    const section = briefSection(brief.actions, brief.hash);
    let next: string;
    if (BRIEF_START_RE.test(existing)) next = existing.replace(BRIEF_START_RE, section);
    else next = `${(existing === "" ? IDEAS_HEADER : existing).trimEnd()}\n\n${section}\n`;
    await writeAtomic(fsLike, ideasPath, next);
    n++;
  }
  if (n > 0) console.log(`  IDEAS.md: wrote/updated ${n} project brief(s).`);
}
```
- [ ] **Step 4** Trace the ideas step caller (grep `writeIdeas(`): replace the `writeIdeas(...)` invocation with `writeBriefIdeas(briefs, projects, ...)`, loading `project_briefs.json`. If `writeIdeas` becomes unused, remove it and its `ideas_state.json` handling in a follow-up step within this task; keep `ideaBlock`/`highConfidenceDrops` only if still referenced.
- [ ] **Step 5** `npm run build` clean; `npm test -- src/__tests__/ideas-writer.test.ts` → PASS.
- [ ] **Step 6: Commit** `git add src/agents/ideas-writer.ts src/__tests__/ideas-writer.test.ts <caller> && git commit -m "feat(brief): IDEAS.md brief section replaces per-learning blocks"`

---

## Self-Review

**Spec coverage:** schema (T1) ✓ · config (T2) ✓ · agent helpers (T3) + orchestration/incremental (T4) ✓ · pipeline step (T5) ✓ · data-builder briefs.json (T6) ✓ · web types+loader (T7) + project page (T8) ✓ · ideas-writer replace-not-accumulate (T9) ✓ · error handling (parseBrief→[] in T3, corrupt-state tolerance in T4 loadJson, missing path in T9) ✓ · testing (each task) ✓.

**Open verification during execution (not placeholders — explicit checks):**
- T4: confirm the KB entry shape and the videoId↔filename-stem convention against `data-builder.ts`/`project-mapper.ts` before writing `buildIdeaVideos`; prefer reusing an existing builder if one is exported.
- T4: confirm `neurolink.generate` result field (`.content` vs `.text`) against `digest.ts`'s existing call.
- T9: confirm where the ideas step is invoked today (grep `writeIdeas(`) and whether it currently runs in the pipeline or only ad-hoc.

**Type consistency:** `BriefAction{title,detail,basedOn}` identical in `src/schemas/brief.ts` (T1) and `web/src/lib/types.ts` (T7). `ProjectBriefs` used in T4/T6/T9. `BriefLearning` defined T3, consumed T4.
