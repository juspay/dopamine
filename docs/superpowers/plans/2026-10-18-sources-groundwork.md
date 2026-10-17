# Sources Groundwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let non-Instagram sources persist their items, retry failures, drain a backlog gradually, and appear in every pipeline output, without changing any Instagram record.

**Architecture:** Non-Instagram `SourceItem`s live in a new `videos/source_items.json`, merged with `metadata.json` at read time by one `loadItemIndex()` helper. A retry ledger (`videos/source_attempts.json`) tracks failures per item. Collectors return every unfinished item; a selection step applies the per-run cap. `metadata.json` and the four other Instagram files keep their shape.

**Tech Stack:** TypeScript (strict, ESM, named exports, no `any`), vitest (`src/__tests__/`), biome, existing pipeline steps.

**Spec:** `docs/superpowers/specs/2026-10-17-youtube-x-sources-design.md` sections 1, 4 and 5. Later plans (YouTube, X) consume what this one produces.

**Branch:** `workforge create -t feat -n sources-groundwork -y`, base `main`. One local commit per task; squash to one commit per PR before opening it, as recent history does.

## Global Constraints

- For every key that exists before the change, the records in `metadata.json`, `classifications.json`, `knowledge_base.json`, `links_v2.json` and `triage.json` are byte-identical afterwards (compared per key; new keys may appear). Never write `source` into those files.
- Instagram's `acquire()` returning `null` stays a silent skip and is never counted as a failure or as empty.
- `SOURCE_MAX_NEW_PER_RUN` defaults to 25, newest first; `SOURCE_SINCE` is an optional date.
- A thrown acquire error is a failure; after 5 the item is quarantined for 30 days. An item that acquires but has nothing to analyse is "empty": rechecked after 7 days, up to 4 times, then quarantined. Empty items never go through the model.
- Only the pipeline, under `.locks/pipeline`, writes `source_items.json`, `source_attempts.json` and `source_health.json`. Every JSON write uses `writeJsonAtomic`.
- A source failing for more than 24 hours alerts through `bash scripts/notify-failure.sh "<message>"`.
- No scraped content, cookies, tokens or session files are committed; test fixtures are synthetic.
- Conventions: ESM imports end in `.js`; comments only for a non-obvious why; lint with `npm run lint`; run one test file with `node node_modules/vitest/vitest.mjs run <file>`; full suite `npm test`; build `npm run build`.

## Review Focus

1. Two items with the same id in one collector batch: keep one (the later), never throw.
2. `SOURCE_SINCE` set and an item has `published_at: null`: keep the item (unknown age must not hide it).
3. A corrupt or empty `source_items.json` / `source_attempts.json`: read as empty, never throw, and the next write replaces the whole file.
4. An Instagram item inside a batch handed to the non-Instagram store: never written to `source_items.json`.
5. An id that is quarantined in the ledger but already done in `knowledge_base.json`: done wins, no retry, no alert.

## File Structure

- Create `src/sources/store.ts` (store + `loadItemIndex`), `src/sources/attempts.ts` (ledger), `src/sources/select.ts` (done test, cap, since), `src/sources/health.ts`, `src/sources/paths.ts` (`localVideoPath`), `src/scripts/compare-instagram-state.ts`.
- Modify `src/types/index.ts`, `src/pipeline/{config,state,lanes,runner}.ts`, `src/sources/registry.ts`, `src/agents/{catalog,triage,markdown,organizer,properties}.ts`, `src/dashboard/data-builder.ts`, `src/search/{db,indexer,query}.ts`, and the web card component (found in Task 9).
- Tests go in `src/__tests__/<module>.test.ts`.

---

### Task 1: Source kinds, `text_post`, config keys, atomic writer

**Files:** Modify `src/types/index.ts:64-68`, `src/pipeline/config.ts` (CONFIG and CONFIG.STATE), `src/pipeline/state.ts`, `src/sources/registry.ts`. Test `src/__tests__/registry-kinds.test.ts`, `src/__tests__/state-atomic.test.ts`.

**Interfaces:**
- Produces: `export const SOURCE_KINDS = ["instagram", "youtube"] as const; export type SourceKind = (typeof SOURCE_KINDS)[number];`
- Produces: `ContentType = "short_video" | "long_video" | "text_post"`.
- Produces: `CONFIG.SOURCE_MAX_NEW_PER_RUN: number` (default 25), `CONFIG.SOURCE_SINCE: string | undefined`, `CONFIG.STATE.SOURCE_ITEMS | SOURCE_ATTEMPTS | SOURCE_HEALTH` (paths under `videos/`).
- Produces: `export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void>` in `state.ts` (mkdir -p, write `${filePath}.tmp`, rename).
- Produces: `registry.ts` exports `SOURCE_FACTORIES` (the existing map, renamed).

- [ ] **Step 1:** Write failing tests. `registry-kinds`: `for (const k of SOURCE_KINDS) expect(typeof SOURCE_FACTORIES[k]).toBe("function")`. `state-atomic`: after `writeJsonAtomic(p, {a: 1})` the file parses to `{a: 1}` and `p + ".tmp"` does not exist; 20 concurrent writes of different objects always leave a parseable file.
- [ ] **Step 2:** Run both files; expected FAIL (missing exports).
- [ ] **Step 3:** Implement the interfaces above. Derive `SourceKind` from `SOURCE_KINDS`; keep `Record<SourceKind, ...>` on the factories so a missing factory still fails `tsc`. `SOURCE_SINCE` stays a string; it is parsed in Task 5.
- [ ] **Step 4:** Run both files and `npm run build`; expected PASS and a clean build.
- [ ] **Step 5:** Commit `feat(sources): add source kind list, text_post type, config keys and atomic writer`.

### Task 2: Item store and index

**Files:** Create `src/sources/store.ts`. Test `src/__tests__/source-store.test.ts`.

**Interfaces:**
- Consumes: `writeJsonAtomic`, `loadState`, `igMetadataToSourceItem` (`src/sources/instagram/map.ts`, id is `${username}_${pk}.mp4`).
- Produces: `export type SourceItemStore = Record<string, SourceItem>`.
- Produces: `ingestSourceItems(batch: SourceItem[], storePath: string = CONFIG.STATE.SOURCE_ITEMS): Promise<{ added: number; updated: number; skipped: number; total: number }>`: union by id, new wins, idempotent; items with `source === "instagram"` are counted in `skipped` and never written.
- Produces: `loadItemIndex(paths?: { metadata?: string; store?: string }): Promise<Map<string, SourceItem>>`: every entry of `metadata.json` (a `MetadataEntry` or an already-mapped `SourceItem`) via `igMetadataToSourceItem`, plus the store; on an id collision the Instagram entry wins; a missing or corrupt file reads as empty.

- [ ] **Step 1:** Write failing tests named: "adds, updates and is idempotent", "never writes an instagram item" (Review Focus 4), "keeps the later of two same-id items in one batch" (1), "loadItemIndex merges metadata.json and the store", "a corrupt store reads as empty and the next ingest rewrites it whole" (3). Use a temp dir for both paths.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement in `store.ts`. Dedupe the batch with a `Map` before merging.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `feat(sources): store non-instagram items and merge them with metadata at read time`.

### Task 3: Readers resolve non-Instagram items (catalog, triage, markdown)

**Files:** Modify `src/agents/catalog.ts:85-86`, `src/agents/triage.ts:176,202,236-237,283`, `src/agents/markdown.ts:387-395,404-410`. Tests extend `src/__tests__/catalog.test.ts`, `src/__tests__/triage.test.ts`; create `src/__tests__/markdown-items.test.ts`.

**Interfaces:**
- Consumes: `loadItemIndex`.
- Produces: `TriageDeps` gains `captionById?: ReadonlyMap<string, string>`; the caption is `captionByPk.get(String(cls.pk ?? "")) ?? captionById?.get(filename) ?? ""`, where `filename` is the classification key (equal to `item.id`), not the derived `makeVideoId(filename)` used for `id` at `triage.ts:186`. `runTriageAgent` fills it from the index (`item.caption_text ?? item.title ?? ""`). Instagram captions still resolve through `captionByPk` first, so their triage hashes do not change.
- Produces: catalog reads its items from `loadItemIndex()` instead of `metadata.json` alone, so a YouTube record gets `source`, `content_type`, `author` and `duration_seconds` from the store. The classifier needs no change: its lane path already reads `lane.item`, and its disk sweep is Instagram-only.
- Produces in `markdown.ts`: after `findMetadata(...)` returns undefined, fall back to the index item; narrow the `meta` parameter type of `generateMarkdown` to the fields its body reads, so an item-derived value (`username` = `item.author`, `caption_text` = `item.caption_text ?? item.title`, no like count) fits.

- [ ] **Step 1:** Write failing tests: catalog gives a store-only `youtube_abc` record `source: "youtube"` and its author; triage passes a youtube classification (`pk: null`) its caption through `captionById`; markdown for a youtube kb entry shows the channel as the author, not `unknown`.
- [ ] **Step 2:** Run the three files; expected FAIL.
- [ ] **Step 3:** Implement as above. Instagram lookups run first and are untouched.
- [ ] **Step 4:** Run them plus `npm test` for regressions; expected PASS.
- [ ] **Step 5:** Commit `feat(sources): resolve youtube and x items in catalog, triage and markdown`.

### Task 4: Retry ledger

**Files:** Create `src/sources/attempts.ts`. Test `src/__tests__/source-attempts.test.ts`.

**Interfaces:**
- Consumes: `makeRefreshGate` (`src/pipeline/refresh.ts`) for quarantine release.
- Produces:
```ts
export type AttemptState = "failed" | "empty" | "quarantined";
export interface AttemptRecord { state: AttemptState; attempts: number; last_error: string | null; last_attempt: string; next_eligible: string | null }
export type AttemptLedger = Record<string, AttemptRecord>;
export const MAX_FAILURES = 5, QUARANTINE_DAYS = 30, EMPTY_RECHECK_DAYS = 7, EMPTY_MAX_RECHECKS = 4;
export function recordFailure(l: AttemptLedger, id: string, err: unknown, now: Date): AttemptLedger;
export function recordEmpty(l: AttemptLedger, id: string, now: Date): AttemptLedger;
export function recordSuccess(l: AttemptLedger, id: string): AttemptLedger;
export function isEligible(l: AttemptLedger, id: string, now: Date): boolean;
export async function loadLedger(path?: string): Promise<AttemptLedger>;
export async function saveLedger(l: AttemptLedger, path?: string): Promise<void>;
```
All record functions are pure (return a new ledger). `last_error` keeps only the first line, 200 chars max.

- [ ] **Step 1:** Write failing tests: failures 1-4 leave the id eligible (`state: "failed"`); the 5th sets `state: "quarantined"`, `next_eligible` 30 days out, `isEligible` false until then and true after; `recordEmpty` makes it ineligible for 7 days; the 5th empty (4 rechecks) quarantines; `recordSuccess` deletes the entry; a corrupt ledger file loads as `{}`; inputs are not mutated.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement. Release from quarantine by `makeRefreshGate({ ttlDays: QUARANTINE_DAYS, maxPerRun: CONFIG.SOURCE_MAX_NEW_PER_RUN, now })` deciding on `last_attempt`.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `feat(sources): add per-item retry ledger with quarantine`.

### Task 5: Selection, cap and since

**Files:** Create `src/sources/select.ts`. Test `src/__tests__/source-select.test.ts`.

**Interfaces:**
- Produces: `export async function loadDoneIds(path: string = CONFIG.STATE.KNOWLEDGE_BASE): Promise<Set<string>>`: ids with a knowledge-base entry that has no `error`.
- Produces: `selectPending(items: SourceItem[], o: { done: ReadonlySet<string>; ledger: AttemptLedger; now: Date; max: number; since?: Date }): { selected: SourceItem[]; remaining: number }`. Input order is the feed's order (newest saved first) and is preserved; duplicates by id are dropped; done, ineligible and (when `since` is set) items with a known `published_at` before `since` are removed; the first `max` are selected; `remaining` counts the rest.

- [ ] **Step 1:** Write failing tests: 60 pending, `max: 25` selects the first 25 in order and reports `remaining: 35`; done ids skipped (Review Focus 5: a quarantined-and-done id is simply absent); ineligible skipped; `since` drops an old item but keeps `published_at: null` (2); duplicate ids collapse (1).
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement; parse `CONFIG.SOURCE_SINCE` in the caller, not here.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `feat(sources): cap non-instagram items per run and skip done or quarantined ones`.

### Task 6: Acquire hooks

**Files:** Modify `src/pipeline/lanes.ts`. Test extend `src/__tests__/lanes.test.ts`.

**Interfaces:**
- Produces: `export interface AcquireHooks { onFailure?(item: SourceItem, err: unknown): void; onEmpty?(item: SourceItem): void; onSuccess?(item: SourceItem): void }` and `acquireAll(items, registry, concurrency = 4, hooks: AcquireHooks = {})`. Hooks fire for every item; deciding who records is the runner's job (Task 7).
- Produces in `src/sources/types.ts`: `export class SourceUnavailableError extends Error {}`, thrown by a collector when the source itself cannot be reached (a network block, a login wall). It is an outage, not a property of the item: `onFailure` still fires, but Task 7's hooks must not record it in the ledger, and Task 8 records it in the source's health.

- [ ] **Step 1:** Write failing tests: a throwing `acquire` calls `onFailure` once and the rest continue; a `null` calls `onEmpty`; a result calls `onSuccess`; omitting hooks behaves exactly as today (the three existing tests still pass); a thrown `SourceUnavailableError` reaches `onFailure` with its class intact.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement; the existing `console.error` line stays.
- [ ] **Step 4:** Run `lanes.test.ts`; expected PASS.
- [ ] **Step 5:** Commit `feat(pipeline): report acquire outcomes through optional hooks`.

### Task 7: Runner wiring

**Files:** Modify `src/pipeline/runner.ts:132-154`, `package.json` (`"sources:preview": "node dist/scripts/sources-preview.js"`). Create `src/pipeline/source-policy.ts`, `src/scripts/sources-preview.ts`. Test `src/__tests__/source-policy.test.ts`.

**Interfaces:**
- Consumes: Tasks 2, 4, 5, 6, 8.
- Produces: `applySourcePolicy(collected: SourceItem[], deps: { now: Date; max: number; since?: Date; store: (b: SourceItem[]) => Promise<unknown>; done: ReadonlySet<string>; ledger: AttemptLedger }): Promise<{ items: SourceItem[]; remaining: Record<string, number> }>`: Instagram items pass through unchanged and in order; the rest are stored, then selected per source.
- Produces: `acquireHooksFor(ledgerRef: { current: AttemptLedger }, now: () => Date, onOutage?: (source: SourceKind, err: SourceUnavailableError) => void): AcquireHooks` recording failure, empty and success for non-Instagram items only; a `SourceUnavailableError` is passed to `onOutage` and never written to the ledger, so a blocked network cannot quarantine a backlog.
- Produces: `previewSources(collectors: SourceCollector[], d: { done: ReadonlySet<string>; ledger: AttemptLedger; now: Date; max: number; since?: Date }): Promise<Record<string, { listed: number; pending: number; wouldSelect: number }>>` and the script `npm run sources:preview` (`src/scripts/sources-preview.ts`), which prints it for the enabled non-Instagram collectors without storing anything. It must never call the Instagram collector, because that one runs scrapers. Run it before the first live run of a new source (spec 1.5).
- `runCollectionStep` calls `applySourcePolicy` and logs `[sources] youtube: selected 25, 311 remaining`. `runAcquisitionStep` passes the hooks, then saves the ledger and records health (Task 8). When collection was skipped (`--start>0`) the fallback list also includes unfinished store items.

- [ ] **Step 1:** Write failing tests: `previewSources` over a fake collector of 40 items with 5 done reports `{ listed: 40, pending: 35, wouldSelect: 25 }` and writes nothing; Instagram items come out identical and untouched; a `youtube` batch of 40 yields 25 and `remaining.youtube === 15`; the hooks leave an Instagram `null` unrecorded and a youtube `null` recorded as empty (spec constraint above); a `SourceUnavailableError` leaves the ledger unchanged and reaches `onOutage`.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement and wire.
- [ ] **Step 4:** Run the test and `npm test`; expected PASS.
- [ ] **Step 5:** Commit `feat(pipeline): store, select and track non-instagram items in collection`.

### Task 8: Source health and alert

**Files:** Create `src/sources/health.ts`. Test `src/__tests__/source-health.test.ts`.

**Interfaces:**
- Produces: `type HealthFile = Record<string, { last_success: string | null; last_failure: string | null; last_error: string | null }>`; `recordSourceRun(h: HealthFile, source: string, outcome: { ok: true } | { ok: false; error: string }, now: Date): HealthFile` (pure); `failingSources(h: HealthFile, now: Date, hours = 24): string[]` (sources whose latest failure is newer than their latest success and older than `hours`); `async function alertFailing(sources: string[]): Promise<void>` runs `bash scripts/notify-failure.sh "Source <name> has been failing for over 24h"` and never throws.

- [ ] **Step 1:** Write failing tests for the two pure functions: a success clears failing status; a failure 25 hours after the last success is listed, one 23 hours after is not; a never-succeeded source failing for 25 hours is listed.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement; `alertFailing` uses `execa` with `reject: false`.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `feat(sources): track per-source health and alert after 24h of failure`.

### Task 9: Properties for lane videos, local paths, dashboard and search

**Files:** Create `src/sources/paths.ts`. Modify `src/agents/properties.ts:44-101`, `src/agents/organizer.ts:35`, `src/dashboard/data-builder.ts:413-511,599-640`, `src/search/{db,indexer,query}.ts`, the web card (find it: `grep -rln "hasVideo" web --include='*.svelte' --include='*.tsx' --include='*.ts'`). Tests `src/__tests__/{properties-targets,source-paths}.test.ts`, extend the search and data-builder tests.

**Interfaces:**
- Produces: `localVideoPath(item: SourceItem | undefined, filename: string): string | null` in `paths.ts`: Instagram or no item gives `path.join(CONFIG.VIDEOS_DIR, filename)`; YouTube gives `path.join(CONFIG.YOUTUBE_VIDEOS_DIR, `${item.yt.videoId}.mp4`)`; any other source returns null.
- Produces: `propertiesTargets(diskFiles: string[], lane: LaneItem[]): Array<{ key: string; videoPath: string }>`: disk files keyed by basename as today; lane items with a `videoPath` outside `CONFIG.VIDEOS_DIR` keyed by `item.id`; duplicates collapse. `runPropertiesAgent(laneItems?: LaneItem[])` uses it and writes the thumbnail as `${key without .mp4}.jpg`; the runner passes `laneItems`.
- Dashboard: `hasVideo` and `videoPath` come from `localVideoPath` (served as `/videos/<path relative to videos/>`, the server already serves the whole folder); the video record gains `sourceUrl: string | null` (the item's `url`) and keeps `source`; the card shows a source badge, an "Open original" link when `sourceUrl` is set, a neutral placeholder when the thumbnail file is missing, and the player only when `hasVideo`. `organizer.ts` skips ids whose item is not Instagram.
- Search: add a `source` column to the indexed row and an optional `source` filter in `query.ts`, following the existing `category` facet; Instagram rows get `instagram`, derived at read time from the `.mp4` id, never stored in the frozen files.

- [ ] **Step 1:** Write failing tests: `propertiesTargets` keys a youtube mp4 `youtube_abc`; `localVideoPath` per source; data-builder gives a youtube record `hasVideo: true` and `/videos/youtube/abc.mp4` when the file exists; a search for `source: "youtube"` returns only youtube rows.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement per file; the web change follows the existing card style and adds no dependency.
- [ ] **Step 4:** Run the files, `npm test` and `npm run build`; for the web part, `npm --prefix web run build` and look at the card in a browser with a synthetic youtube record.
- [ ] **Step 5:** Commit `feat(dashboard): show source badge, original link and local video for non-instagram items`.

### Task 10: Instagram invariant check

**Files:** Create `src/scripts/compare-instagram-state.ts`; add `"check:instagram": "node dist/scripts/compare-instagram-state.js"` to `package.json`. Test `src/__tests__/compare-instagram-state.test.ts`.

**Interfaces:**
- Produces: `compareInstagramState(beforeDir: string, afterDir: string): Promise<{ checkedKeys: number; changed: string[]; removed: string[]; ok: boolean }>`: for each of the five files, every key present before is compared with `JSON.stringify` of its value after (`metadata.json` is an array keyed by `pk`; the rest are objects keyed by id); new keys are ignored; entries are `"<file>:<key>"`. The CLI takes `<beforeDir> <afterDir>` and exits 1 when not ok.

- [ ] **Step 1:** Write failing tests: identical dirs give `ok: true`; a changed value is listed in `changed`; a deleted key in `removed`; an added key is ignored.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `feat(scripts): compare instagram records key by key between two state folders`.

## Verification before opening the PR

- [ ] `npm run lint && npm test && npm run build` all pass.
- [ ] Dry run on a copy: `cp -R videos /tmp/dopamine-dry/videos`, add one synthetic youtube item to a fake collector, run the 21 steps with the fake model used for the link changes, then `npm run check:instagram -- <original videos> <dry-run videos>` reports `ok: true`.
- [ ] Re-run the same collection a second time: the ledger and store are unchanged and nothing is re-asked of the model for done items.

## Rollout

Behind `SOURCES` (default `instagram`), so merging changes nothing for Instagram. Deploy with the existing dist-only swap under `.locks/pipeline` and `.locks/piggyback`, after a backup of `videos/`. Open the PR and wait for explicit merge approval; merge with `gh pr merge <n> --rebase --delete-branch`.
