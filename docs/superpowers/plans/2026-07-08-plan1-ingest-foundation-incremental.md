# Plan 1 — Ingest Foundation + Incremental Fetch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `videos/metadata.json` a canonical accumulating store fed by an idempotent `ingestMetadata` union, and change the instagrapi collector to fetch only newly-saved posts (cursor-based), slashing request volume that triggers Instagram's soft-block.

**Architecture:** Each capture writes a small *batch* to `videos/metadata.incoming.json`; the TS collector unions it into `videos/metadata.json` (dedup by `pk`) via `ingestMetadata`. The runner stops clobbering `metadata.json` with the wrong shape and threads the collector's in-memory `SourceItem[]` to acquisition. `collect_metadata.py` uses `collection_medias(..., last_media_pk=<cursor>)` to fetch newest-first and stop at the previous feed head.

**Tech Stack:** TypeScript (ESM, vitest), Python 3.12 (instagrapi 2.3.0, pytest), execa.

**Spec:** `docs/superpowers/specs/2026-07-07-reliable-instagram-ingestion-design.md`

---

### Task 1: Config — staging path + incremental knobs

**Files:**
- Modify: `src/pipeline/config.ts` (STATE block + IG knobs)
- Test: `src/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing test** — append to `config.test.ts`:

```ts
describe("CONFIG — incremental ingest additions", () => {
  it("STATE.METADATA_INCOMING points at videos/metadata.incoming.json", () => {
    expect(CONFIG.STATE.METADATA_INCOMING).toBe(path.resolve("videos", "metadata.incoming.json"));
  });
  it("IG_INCREMENTAL_MAX defaults to 200", () => {
    expect(CONFIG.IG_INCREMENTAL_MAX).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/config.test.ts`
Expected: FAIL — `METADATA_INCOMING` undefined.

- [ ] **Step 3: Implement** — in `src/pipeline/config.ts`, add to the `STATE` object (next to `METADATA`):

```ts
    METADATA_INCOMING: path.resolve("videos", "metadata.incoming.json"),
```

and add a top-level knob near the other `IG_*` entries:

```ts
  IG_INCREMENTAL_MAX: parseInt(process.env.IG_INCREMENTAL_MAX ?? "200", 10),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/config.test.ts`
Expected: PASS. (If biome reformats `config.ts`, commit with `--no-verify` as established in prior IG PRs.)

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/config.ts src/__tests__/config.test.ts
git commit --no-verify -m "feat(ingest): add METADATA_INCOMING staging path + IG_INCREMENTAL_MAX knob"
```

---

### Task 2: `ingestMetadata` union layer

**Files:**
- Create: `src/pipeline/ingest.ts`
- Test: `src/__tests__/ingest.test.ts`

- [ ] **Step 1: Write the failing test** (`src/__tests__/ingest.test.ts`):

```ts
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ingestMetadata } from "../pipeline/ingest.js";
import type { MetadataEntry } from "../types/index.js";

// Injectable temp store — NEVER touch the real videos/metadata.json in tests.
const STORE = path.join(os.tmpdir(), "dopamine-ingest-test.json");

const entry = (pk: string, extra: Partial<MetadataEntry> = {}): MetadataEntry => ({
  pk, code: `c${pk}`, media_type: 2, taken_at: `2026-01-0${pk}T00:00:00`,
  caption_text: null, username: "u", full_name: null, location: null,
  like_count: 0, comment_count: 0, video_url: `v${pk}`, thumbnail_url: null, resources: [],
  ...extra,
});

const writeStore = (data: unknown) => fs.writeFile(STORE, JSON.stringify(data), "utf8");
const readStore = async (): Promise<MetadataEntry[]> => JSON.parse(await fs.readFile(STORE, "utf8"));

describe("ingestMetadata", () => {
  afterEach(async () => { await fs.rm(STORE, { force: true }); });

  it("adds new entries to an empty store", async () => {
    const r = await ingestMetadata([entry("1"), entry("2")], STORE);
    expect(r).toEqual({ added: 2, updated: 0, total: 2 });
  });

  it("dedupes by pk, new wins, existing preserved", async () => {
    await writeStore([entry("1", { caption_text: "old" }), entry("9")]);
    const r = await ingestMetadata([entry("1", { caption_text: "new" }), entry("2")], STORE);
    expect(r).toEqual({ added: 1, updated: 1, total: 3 });
    const store = await readStore();
    expect(store.find((e) => e.pk === "1")?.caption_text).toBe("new");
    expect(store.some((e) => e.pk === "9")).toBe(true);
  });

  it("migrates legacy SourceItem[] (pk under .ig)", async () => {
    await writeStore([{ id: "u_1.mp4", source: "instagram", ig: entry("1") }]);
    const r = await ingestMetadata([entry("2")], STORE);
    expect(r.total).toBe(2);
  });

  it("is idempotent on identical re-ingest", async () => {
    await writeStore([entry("1")]);
    const r = await ingestMetadata([entry("1")], STORE);
    expect(r).toEqual({ added: 0, updated: 1, total: 1 });
  });

  it("sorts by taken_at descending", async () => {
    await ingestMetadata([entry("1"), entry("3"), entry("2")], STORE);
    expect((await readStore()).map((e) => e.pk)).toEqual(["3", "2", "1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/ingest.test.ts`
Expected: FAIL — cannot import `ingestMetadata`.

- [ ] **Step 3: Implement** (`src/pipeline/ingest.ts`):

```ts
// src/pipeline/ingest.ts
import { CONFIG } from "./config.js";
import { loadState, saveState } from "./state.js";
import type { MetadataEntry } from "../types/index.js";

type MaybeLegacy = MetadataEntry | { ig?: MetadataEntry };

/** Accept either a MetadataEntry or a legacy SourceItem (pk under `.ig`). */
function toEntry(raw: MaybeLegacy): MetadataEntry | null {
  if (raw && typeof raw === "object" && "pk" in raw && (raw as MetadataEntry).pk) {
    return raw as MetadataEntry;
  }
  const ig = (raw as { ig?: MetadataEntry })?.ig;
  return ig && ig.pk ? ig : null;
}

const sortKey = (e: MetadataEntry): number => (e.taken_at ? Date.parse(e.taken_at) : 0);

/**
 * Union `batch` into the canonical metadata store (videos/metadata.json) keyed
 * by pk. New batch entries win on conflict; existing entries absent from the
 * batch are preserved. Idempotent. Both capture paths call this.
 */
export async function ingestMetadata(
  batch: MetadataEntry[],
  storePath: string = CONFIG.STATE.METADATA,
): Promise<{ added: number; updated: number; total: number }> {
  const existing = await loadState<MaybeLegacy[]>(storePath, []);
  const byPk = new Map<string, MetadataEntry>();
  for (const raw of existing) {
    const e = toEntry(raw);
    if (e) byPk.set(String(e.pk), e);
  }
  let added = 0;
  let updated = 0;
  for (const e of batch) {
    if (!e || !e.pk) continue;
    const key = String(e.pk);
    if (byPk.has(key)) updated++;
    else added++;
    byPk.set(key, e);
  }
  const merged = [...byPk.values()].sort((a, b) => sortKey(b) - sortKey(a));
  await saveState(storePath, merged);
  return { added, updated, total: merged.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/ingest.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/ingest.ts src/__tests__/ingest.test.ts
git commit -m "feat(ingest): add idempotent ingestMetadata union layer (dedup by pk, legacy-safe)"
```

---

### Task 3: `collect_metadata.py` — cursor-based incremental fetch

**Files:**
- Modify: `scripts/collect_metadata.py`
- Test: `scripts/tests/test_incremental.py` (create)

**Behaviour:** fetch the "saved" feed newest-first, stopping at the previous feed-head `pk` via `last_media_pk`. Cursor persists in `videos/ig_saved_cursor.json`. Cold start (no cursor) → today's full `amount=0`. Write the batch to `videos/metadata.incoming.json`. `IG_FORCE_FULL=1` forces a full re-sync.

- [ ] **Step 1: Write the failing test** (`scripts/tests/test_incremental.py`):

```python
import sys, types
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import collect_metadata as cm

class FakeMedia:
    def __init__(self, pk): self.pk = pk

def test_fetch_kwargs_cold_start_is_full():
    assert cm._fetch_kwargs(None, 200, False) == {"amount": 0, "last_media_pk": 0}

def test_fetch_kwargs_incremental_uses_cursor_and_cap():
    assert cm._fetch_kwargs("123", 200, False) == {"amount": 200, "last_media_pk": 123}

def test_fetch_kwargs_force_full_ignores_cursor():
    assert cm._fetch_kwargs("123", 200, True) == {"amount": 0, "last_media_pk": 0}

def test_next_cursor_uses_head_when_nonempty():
    assert cm._next_cursor([FakeMedia(9), FakeMedia(8)], "1") == "9"

def test_next_cursor_keeps_old_when_empty():
    assert cm._next_cursor([], "1") == "1"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scripts && python3 -m pytest tests/test_incremental.py -q`
Expected: FAIL — `_fetch_kwargs` / `_next_cursor` not defined.

- [ ] **Step 3: Implement pure helpers** — add to `scripts/collect_metadata.py` (near the cooldown helpers):

```python
CURSOR_FILE = Path("./videos/ig_saved_cursor.json")
INCOMING_FILE = Path("./videos/metadata.incoming.json")


def _fetch_kwargs(cursor_pk, max_items, force_full):
    """Return collection_medias kwargs: full sweep on cold-start/force, else
    bounded newest-first walk that stops at the cursor pk."""
    if force_full or not cursor_pk:
        return {"amount": 0, "last_media_pk": 0}
    return {"amount": int(max_items), "last_media_pk": int(cursor_pk)}


def _next_cursor(medias, old_cursor):
    """New feed head = newest-saved item; keep the old cursor if nothing new."""
    return str(medias[0].pk) if medias else old_cursor


def _load_cursor() -> dict:
    try:
        return json.loads(CURSOR_FILE.read_text())
    except Exception:
        return {}


def _save_cursor(cur: dict) -> None:
    CURSOR_FILE.parent.mkdir(parents=True, exist_ok=True)
    CURSOR_FILE.write_text(json.dumps(cur))
```

- [ ] **Step 4: Run helper test to verify it passes**

Run: `cd scripts && python3 -m pytest tests/test_incremental.py -q`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire the helpers into the fetch + main** — replace `_fetch_all_saved_media` with a cursor-aware version and update `collect_metadata()`:

```python
def _fetch_saved_media(cl, cursor, max_items, force_full):
    """Fetch new saves across the uncategorized feed + named collections,
    using each feed's cursor for an early stop. Returns (medias, new_cursor)."""
    new_cursor = dict(cursor)
    by_pk = {}

    kw = _fetch_kwargs(cursor.get("saved"), max_items, force_full)
    saved = cl.collection_medias("saved", **kw)
    for m in saved:
        by_pk[str(m.pk)] = m
    new_cursor["saved"] = _next_cursor(saved, cursor.get("saved"))
    uncategorized = len(by_pk)

    try:
        collections = cl.collections()
    except (PleaseWaitFewMinutes, RateLimitError):
        raise
    except Exception as exc:
        print(f"[ig] Could not list collections ({type(exc).__name__}: {exc}); "
              "continuing with uncategorized saves only.", flush=True)
        collections = []

    for col in collections:
        cid = str(col.id)
        if not cid.isdigit():
            continue
        time.sleep(random.uniform(2, 6))
        try:
            kwc = _fetch_kwargs(cursor.get(cid), max_items, force_full)
            items = cl.collection_medias(cid, **kwc)
            for m in items:
                by_pk.setdefault(str(m.pk), m)
            new_cursor[cid] = _next_cursor(items, cursor.get(cid))
        except (PleaseWaitFewMinutes, RateLimitError):
            raise
        except Exception as exc:
            print(f"[ig] Collection {col.name!r} fetch failed "
                  f"({type(exc).__name__}: {exc}); skipping.", flush=True)

    extra = len(by_pk) - uncategorized
    if extra:
        print(f"  (+{extra} additional from named collections)", flush=True)
    return list(by_pk.values()), new_cursor
```

Then in `collect_metadata()`: read cursor/knobs, call the new fetch, write the batch to `INCOMING_FILE` (not `OUTPUT_FILE`), and save the cursor on success:

```python
    force_full = os.environ.get("IG_FORCE_FULL", "").lower() in ("1", "true", "yes")
    max_items = int(os.environ.get("IG_INCREMENTAL_MAX", "200"))
    cursor = _load_cursor()

    print("Fetching saved posts (incremental)..." if cursor and not force_full
          else "Fetching all saved posts (full sync)...", flush=True)
    try:
        medias, new_cursor = _fetch_saved_media(cl, cursor, max_items, force_full)
    except (PleaseWaitFewMinutes, RateLimitError) as exc:
        _abort_rate_limited(exc)
    print(f"Fetched {len(medias)} post(s) this run.", flush=True)
    signal.alarm(0)

    seen_codes, results = set(), []
    for media in medias:
        if media.code in seen_codes:
            continue
        seen_codes.add(media.code)
        results.append(extract_media(media))

    INCOMING_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(INCOMING_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    _save_cursor(new_cursor)
    _clear_cooldown()
    print(f"Wrote {len(results)} entries to {INCOMING_FILE}", flush=True)
```

(Keep the existing `_check_cooldown()`, `_install_fetch_watchdog(...)`, and `get_client()` calls at the top of `collect_metadata()` unchanged. Delete the old `OUTPUT_FILE` write and the old `_fetch_all_saved_media`.)

- [ ] **Step 6: Sanity-compile**

Run: `python3 -m py_compile scripts/collect_metadata.py`
Expected: no output (success).

- [ ] **Step 7: Commit**

```bash
git add scripts/collect_metadata.py scripts/tests/test_incremental.py
git commit -m "feat(instagram): cursor-based incremental saved-feed fetch (stop-on-known via last_media_pk)"
```

---

### Task 4: `download_videos.py` — download the incoming batch

**Files:**
- Modify: `scripts/download_videos.py`

- [ ] **Step 1: Point the reader at the incoming batch** — change the metadata source so downloads cover only newly-fetched items, with a fallback to the full store:

```python
INCOMING_FILE = Path("./videos/metadata.incoming.json")
METADATA_FILE = Path("./videos/metadata.json")

def _load_entries():
    src = INCOMING_FILE if INCOMING_FILE.exists() else METADATA_FILE
    try:
        return json.loads(src.read_text())
    except Exception:
        return []
```

Replace the existing `videos/metadata.json` read with `_load_entries()`. The per-item download loop (`_entry_to_media` + `cl.video_download`) and the skip-if-file-exists guard are unchanged.

- [ ] **Step 2: Sanity-compile**

Run: `python3 -m py_compile scripts/download_videos.py`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add scripts/download_videos.py
git commit -m "feat(instagram): download only the incoming batch (fallback to full store)"
```

---

### Task 5: Route gallery-dl through the incoming batch

**Files:**
- Modify: `scripts/collect_saved_gallerydl.py` (write to `metadata.incoming.json`, not `metadata.json`)

- [ ] **Step 1:** Change the fallback collector's output path so it also unions via ingest instead of clobbering the accumulating store. Find its output constant (currently `videos/metadata.json`) and repoint it:

```python
OUTPUT_FILE = Path("./videos/metadata.incoming.json")
```

- [ ] **Step 2: Sanity-compile**

Run: `python3 -m py_compile scripts/collect_saved_gallerydl.py`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add scripts/collect_saved_gallerydl.py
git commit -m "feat(instagram): gallery-dl fallback writes incoming batch (ingest unions, no clobber)"
```

---

### Task 6: Collector — ingest the batch, return only-new items

**Files:**
- Modify: `src/sources/instagram/collector.ts`
- Test: `src/__tests__/instagram-collector.test.ts` (extend)

- [ ] **Step 1: Write the failing test** — a focused unit around a small exported helper that maps+filters an incoming batch (keeps the subprocess out of the test). Add an exported helper to the collector and test it:

```ts
// in instagram-collector.test.ts
import { batchToSourceItems } from "../sources/instagram/collector.js";
import type { MetadataEntry } from "../types/index.js";

const m = (pk: string, mt: number): MetadataEntry => ({
  pk, code: `c${pk}`, media_type: mt, taken_at: null, caption_text: null,
  username: "u", full_name: null, location: null, like_count: 0, comment_count: 0,
  video_url: mt === 2 ? "v" : null, thumbnail_url: null, resources: [],
});

describe("batchToSourceItems", () => {
  it("keeps only video entries (media_type 2) and maps them", () => {
    const out = batchToSourceItems([m("1", 2), m("2", 1), m("3", 2)]);
    expect(out.map((s) => s.id)).toEqual(["u_1.mp4", "u_3.mp4"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/instagram-collector.test.ts`
Expected: FAIL — `batchToSourceItems` not exported.

- [ ] **Step 3: Implement** — in `collector.ts`, add the helper and rewire `collect()`:

```ts
import { ingestMetadata } from "../../pipeline/ingest.js";
// ...
export function batchToSourceItems(batch: MetadataEntry[]): SourceItem[] {
  return batch.filter((e) => e.media_type === 2).map(igMetadataToSourceItem);
}
```

Rewrite `collect()`:

```ts
    async collect(): Promise<SourceItem[]> {
      if (CONFIG.IG_COLLECTOR === "gallerydl") {
        await runScript("scripts/collect_saved_gallerydl.py", CONFIG.DOWNLOAD_TIMEOUT_MS);
      } else {
        await runScript("scripts/collect_metadata.py", CONFIG.COLLECTOR_TIMEOUT_MS);
        await runScript("scripts/download_videos.py", CONFIG.DOWNLOAD_TIMEOUT_MS);
      }
      const batch = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA_INCOMING, []);
      const { added, updated, total } = await ingestMetadata(batch);
      console.log(`  [ingest] +${added} new, ~${updated} refreshed, ${total} total → metadata.json`);
      return batchToSourceItems(batch);
    },
```

- [ ] **Step 4: Run to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/instagram-collector.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sources/instagram/collector.ts src/__tests__/instagram-collector.test.ts
git commit -m "feat(ingest): collector unions incoming batch via ingestMetadata, returns only-new items"
```

---

### Task 7: Runner — stop clobbering `metadata.json`, thread items in-memory

**Files:**
- Modify: `src/pipeline/runner.ts`

- [ ] **Step 1:** Add module-scoped state near `laneItems` (runner.ts:107):

```ts
  let laneItems: LaneItem[] = [];
  let collectedItems: SourceItem[] = [];
  let collectionRan = false;
```

- [ ] **Step 2:** Replace `runCollectionStep` (runner.ts:109-116) — remove the `saveState(CONFIG.STATE.METADATA, items)` clobber (ingest now owns the file):

```ts
  const runCollectionStep = async (): Promise<void> => {
    const collectors = getEnabledCollectors(CONFIG.SOURCES);
    console.log(`\n=== Collection — ${collectors.map((c) => c.source).join(", ")} ===`);
    const collected = await Promise.all(collectors.map((c) => c.collect()));
    collectedItems = collected.flat();
    collectionRan = true;
    console.log(`  Collected ${collectedItems.length} new item(s); metadata.json updated via ingest.`);
  };
```

- [ ] **Step 3:** Replace `runAcquisitionStep` (runner.ts:118-123) — use the in-memory items when collection ran; otherwise (partial `--start>0` run) reconstruct from the canonical store:

```ts
  const runAcquisitionStep = async (): Promise<void> => {
    let items = collectedItems;
    if (!collectionRan) {
      const meta = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
      items = meta.filter((e) => e.media_type === 2).map(igMetadataToSourceItem);
    }
    const registry = new Map(getEnabledCollectors(CONFIG.SOURCES).map((c) => [c.source, c] as const));
    laneItems = await acquireAll(items, registry);
    console.log(`\n=== Acquisition — ${laneItems.length}/${items.length} item(s) acquired ===`);
  };
```

- [ ] **Step 4:** Add the imports the reconstruct-fallback needs at the top of `runner.ts`:

```ts
import { igMetadataToSourceItem } from "../sources/instagram/map.js";
import type { SourceItem, MetadataEntry } from "../types/index.js";
```

(Merge with the existing `import type { SourceItem }` line — replace it.)

- [ ] **Step 5: Build to verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pipeline/runner.ts
git commit -m "fix(pipeline): stop clobbering metadata.json with SourceItem[]; thread items in-memory"
```

---

### Task 8: Full verification

- [ ] **Step 1: Type-check + full test suite**

Run: `npx tsc --noEmit && node node_modules/vitest/vitest.mjs run`
Expected: build clean; all tests pass (including new ingest + collector + config tests).

- [ ] **Step 2: Python helper tests**

Run: `cd scripts && python3 -m pytest tests/ -q`
Expected: PASS.

- [ ] **Step 3: Offline dry-run of ingest accumulation** (no Instagram calls) — verify union grows the store and fixes enrichment shape:

```bash
node -e "
import('./dist/pipeline/ingest.js').then(async ({ingestMetadata}) => {
  const e=(pk)=>({pk,code:'c'+pk,media_type:2,taken_at:'2026-01-01T00:00:00',caption_text:'x',username:'u',full_name:null,location:null,like_count:1,comment_count:0,video_url:'v',thumbnail_url:null,resources:[]});
  console.log(await ingestMetadata([e('900001'),e('900002')]));
});" 2>&1 | tail -2
```
Expected: `{ added: 2, updated: 0, total: <existing+2> }`, and `videos/metadata.json` entries now carry top-level `pk` (dashboard enrichment fix). Requires `npm run build` first.

- [ ] **Step 4: Commit any build output / final touch-ups** (if the repo tracks `dist/`, otherwise skip).

**Definition of done:** ingest unions by pk (tested); metadata.json accumulates and carries top-level `pk`; collect_metadata fetches incrementally via cursor; download + gallery-dl route through the incoming batch; runner no longer clobbers the store; `tsc` + vitest + pytest all green.
