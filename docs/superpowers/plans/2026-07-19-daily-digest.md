# Daily Learnings Digest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push a top-5 AI-composed digest of new learnings to a Shooter-compatible notify endpoint after each pipeline run.

**Architecture:** One new agent module (`src/agents/digest.ts`) with pure, dependency-injected layers — selection over `search.db`, LLM composition with mechanical fallback, HTTP delivery with roll-forward state — wired as the pipeline's final step. Zod schema in `src/schemas/digest.ts`.

**Tech Stack:** TypeScript ESM strict, `node:sqlite` (read-only via stage-1 `openSearchDb`), `@juspay/neurolink` generate + zod schema (repo pattern), global `fetch` (Node 24), vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-daily-digest-design.md`

**Conventions:** conventional commits; single-commit PR (squash before opening); public repo — no personal data.

---

### Task 1: Digest schema (`src/schemas/digest.ts`)

Zod schema mirroring repo schema style:

```ts
import { z } from "zod";

export const DigestSchema = z.object({
  headline: z.string().max(120),
  lines: z.array(z.string().max(160)),
});
export type Digest = z.infer<typeof DigestSchema>;
```

(Generous caps at the schema layer; hard truncation to 80/110 happens in code so a slightly-long model answer degrades instead of failing validation.)

- [ ] Test `src/__tests__/digest-schema.test.ts`: valid parse; over-long headline rejected; non-array lines rejected.
- [ ] Commit `feat(digest): digest schema`.

### Task 2: Config additions (`src/pipeline/config.ts`)

- [ ] `DIGEST_TOP_N: parseInt(process.env.DIGEST_TOP_N ?? "5", 10)`
- [ ] `DIGEST_PUSH_URL: process.env.DIGEST_PUSH_URL ?? \`http://localhost:${process.env.SHOOTER_LOCAL_PORT ?? "54006"}/api/notify\``
- [ ] `STATE.DIGEST_STATE: path.resolve("videos", "digest_state.json")`
- [ ] Commit with Task 3.

### Task 3: Agent (`src/agents/digest.ts`)

Exported pure pieces (all unit-tested), then the orchestrator:

```ts
export interface DigestCandidate {
  id: string; title: string; category: string; takenAt: string;
  sourceUrl: string; verification: string; implementability: number;
  usefulness: string; takeaways: string[]; toolNames: string[];
}
export interface DigestState { digestedIds: string[]; lastDigestAt: string; }

export function rankScore(c: DigestCandidate): number
export function selectCandidates(db: DatabaseSync, digestedIds: Set<string>, topN: number): DigestCandidate[]
  // SELECT from videos (+ top 3 tool names per id); filter digested; sort by
  // rankScore desc, then taken_at desc; slice topN
export function fallbackDigest(items: DigestCandidate[]): Digest
export async function composeDigest(generate: GenerateFn, items: DigestCandidate[]): Promise<Digest>
  // neurolink generate w/ DigestSchema; enforce lines.length === items.length else fallback;
  // truncate headline→80, lines→110
export function buildPushPayload(digest: Digest, items: DigestCandidate[], now: string, requestId: string): ShooterPayload
  // title "Dopamine — N new learning(s)", subtitle headline,
  // message: lines numbered + item.sourceUrl by INDEX, data{category:'digest',...}
export async function deliverPush(payload: ShooterPayload, opts: {url: string; key: string; fetchFn?: typeof fetch}): Promise<void>
  // POST, Bearer, 10s AbortSignal.timeout; throw on !res.ok
export function resolvePushKey(env: NodeJS.ProcessEnv, readFile: (p:string)=>string): string
  // DIGEST_PUSH_KEY ?? parse API_KEY= from ~/.shooter/.env ?? ""
export async function runDigestAgent(neurolink: NeuroLink, overrides?: {...DI for tests}): Promise<void>
  // load state (bootstrap: file absent → seed all ids, save, log, return)
  // select; 0 → log + return (no push)
  // compose (fallback inside); build payload; key "" or delivery error → warn + return WITHOUT marking
  // on 2xx: state.digestedIds += sent ids; saveState
```

CLI entry guard (`digest.js`) creating its own `NeuroLink` for `npm run digest`.

- [ ] Tests `src/__tests__/digest.test.ts` (temp db built via stage-1 `openSearchDb` + `indexRecords` with fake embedder):
  - rankScore ordering (verified_useful+highly_useful outranks unknown; tie → newer taken_at)
  - selectCandidates filters digested ids, limits to topN, includes takeaways+toolNames
  - bootstrap: absent state file seeds all ids, sends nothing
  - fallbackDigest lines/truncation
  - composeDigest: fake generate returning wrong line-count → fallback used; valid → used with truncation
  - buildPushPayload: numbered message, URLs attached by index, data.category === "digest"
  - deliverPush: fake fetch 200 resolves; 500 rejects; runDigestAgent marks state only on success (roll-forward on failure)
  - resolvePushKey: env wins; file parse; neither → ""
- [ ] Commit `feat(digest): top-N AI digest agent with Shooter push delivery`.

### Task 4: Wiring

- [ ] `runner.ts`: import + `{ name: "Digest", run: () => runDigestAgent(neurolink) } // 17` after Search index; update both step maps + END_STEP note (17 → 18).
- [ ] `package.json`: `"digest": "node dist/agents/digest.js"`.
- [ ] `.env.example`: DIGEST_TOP_N / DIGEST_PUSH_URL / DIGEST_PUSH_KEY block.
- [ ] `docs/mcp-server.md` untouched; add `docs/digest.md` (setup, env, roll-forward semantics, bootstrap note; `<repo>` placeholders only).
- [ ] README: one line under Usage.
- [ ] Commit `feat(pipeline): run digest as final step`.

### Task 5: Verification (not committed)

- [ ] Full suite + `tsc --noEmit` + `biome check src/agents/digest.ts src/schemas/digest.ts` clean.
- [ ] Bootstrap on real corpus (cwd = main checkout, worktree dist): expect "seeded N ids, nothing to send".
- [ ] Force a real push: temporarily clear a few ids from `videos/digest_state.json`, run `digest.js`, confirm push arrives on phone via local Shooter; re-run → no push (state marked).
- [ ] Adversarial review workflow on the branch diff; fix confirmed findings.
- [ ] Squash to one commit, push (with lease), PR, hold merge for approval.

## Self-review

Spec coverage: selection/ranking ✓ (T3), bootstrap ✓ (T3), compose+fallback ✓ (T1/T3), delivery+roll-forward ✓ (T3), wiring/env/docs ✓ (T4), privacy ✓ (state under videos/*.json; localhost defaults). Types consistent: `DigestCandidate`/`DigestState`/`Digest` defined once, used across tasks.
