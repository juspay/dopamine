# Dopamine Dashboard Redesign — Implementation Plan

> **For agentic workers:** This plan is executed as a multi-agent **workflow**. Phases 0–2 and 4–5 are
> sequential; Phase 3 (pages) fans out in parallel. Logic tasks include complete code + tests; UI tasks
> are spec + acceptance-criteria driven (agents write idiomatic Svelte against the real data). Steps use
> `- [ ]` checkboxes.

**Goal:** Replace the monolithic generated `dashboard/index.html` with a SvelteKit single-page app that is
deeply cross-linked, deep-linkable, responsive, and visually refined — without compromising the daily
pipeline/server reliability.

**Architecture:** A SvelteKit app (`web/`, `adapter-static` SPA) builds into `dashboard/` and is served at
root by the existing express server with SPA fallback. Pipeline step 11 becomes a build-free **data builder**
that emits static JSON to `dashboard/data/`. App built on UI change; data refreshed daily.

**Tech Stack:** SvelteKit 2 + Svelte 5, Vite, `@sveltejs/adapter-static`, TypeScript, vanilla CSS (tokens),
Node data builder (reuses existing `loadState`), express server, vitest (data-builder tests).

**Spec:** `docs/superpowers/specs/2026-05-29-dashboard-redesign-design.md`

---

## File Structure

```
web/                                  # SvelteKit source
  package.json                        # app deps (svelte, kit, vite, adapter-static)
  svelte.config.js                    # adapter-static, SPA fallback, base=''
  vite.config.ts
  tsconfig.json
  src/
    app.html                          # shell
    app.css                           # imports theme tokens + base
    lib/
      theme.css                       # design tokens (dark control-room)
      types.ts                        # data contracts (mirror of builder output)
      data.ts                         # client data access (fetch + cache)
      format.ts                       # fmtDuration, fmtDate, fmtNumber, catColor/catBg
      components/
        TopBar.svelte  SearchBox.svelte  VideoCard.svelte  VideoGrid.svelte
        Chip.svelte  CategoryChip.svelte  TagChip.svelte  CreatorLink.svelte
        VerificationBadge.svelte  RelatedRail.svelte  Breadcrumbs.svelte
        SectionNav.svelte  ActionableItem.svelte  EmptyState.svelte  Spinner.svelte
    routes/
      +layout.svelte                  # TopBar + <slot/>; ssr=false
      +layout.ts                      # export const ssr=false, prerender=false
      +page.svelte                    # / home (discover & browse)
      videos/+page.svelte             # /videos library
      video/[id]/+page.svelte         # /video/<id> entity page
      creator/[name]/+page.svelte     # /creator/<name>
      category/[cat]/+page.svelte     # /category/<cat>
      tag/[tag]/+page.svelte          # /tag/<tag>
      tools/+page.svelte              # /tools
      kb/+page.svelte                 # /kb reading browse
      search/+page.svelte             # /search?q=
dashboard/                            # BUILT app output (served) + data/
  data/{index.json.gz, video/<id>.json, facets.json, tools.json, meta.json}
src/dashboard/data-builder.ts         # NEW: emits dashboard/data/* (pure Node)
src/dashboard/related.ts              # NEW: related-videos algorithm (+ tests)
src/dashboard/data-builder.test.ts    # NEW: vitest
src/agents/dashboard.ts               # step 11 body replaced to call data-builder
src/server/dashboard-server.ts        # serve app + data + media, SPA fallback
package.json                          # scripts: dashboard:data, dashboard:build, dashboard:all
```

---

## Phase 0 — Foundations (sequential)

### Task 0.1: Scaffold SvelteKit app

**Files:** Create `web/package.json`, `web/svelte.config.js`, `web/vite.config.ts`, `web/tsconfig.json`,
`web/src/app.html`, `web/src/app.css`, `web/src/routes/+layout.svelte`, `web/src/routes/+layout.ts`,
`web/src/routes/+page.svelte` (placeholder). Modify root `package.json` scripts.

- [ ] **Step 1:** Create `web/package.json`:
```json
{
  "name": "dopamine-web",
  "private": true,
  "type": "module",
  "scripts": { "build": "vite build", "check": "svelte-check --tsconfig ./tsconfig.json", "dev": "vite dev" },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.0",
    "@sveltejs/kit": "^2.8.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte": "^5.1.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```
- [ ] **Step 2:** `web/svelte.config.js` — adapter-static SPA, output to repo `dashboard/`:
```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ pages: '../dashboard', assets: '../dashboard', fallback: 'index.html', precompress: false, strict: false }),
    paths: { base: '' }
  }
};
```
- [ ] **Step 3:** `web/src/routes/+layout.ts`: `export const ssr = false; export const prerender = false; export const trailingSlash = 'never';`
- [ ] **Step 4:** Minimal `app.html` (standard SvelteKit shell with `%sveltekit.head%`/`%sveltekit.body%`, `<html lang="en">`, dark `<meta name="color-scheme" content="dark">`, viewport meta).
- [ ] **Step 5:** Root `package.json` scripts — add:
```
"dashboard:data": "node dist/dashboard/data-builder.js",
"dashboard:build": "cd web && npm install && npm run build",
"dashboard:all": "npm run build && npm run dashboard:data && npm run dashboard:build"
```
- [ ] **Step 6:** Install + placeholder build. Run: `cd web && npm install && npm run build`
  Expected: build succeeds, `dashboard/index.html` + `dashboard/_app/` produced.
- [ ] **Step 7:** Commit: `git add web package.json && git commit -m "feat(web): scaffold SvelteKit static app"`

**Acceptance:** `cd web && npm run build` exits 0 and writes `dashboard/index.html` and `dashboard/_app/`.

### Task 0.2: Data contracts (`web/src/lib/types.ts`)

- [ ] **Step 1:** Define and export the contract types EXACTLY as the builder emits (single source of truth,
  copied verbatim into the builder in Task 1.1):
```ts
export interface IndexRecord {
  id: string; title: string; username: string; fullName: string;
  category: string; subcategory: string; tags: string[];
  thumb: string; date: string; likes: number; durationSec: number;
  verification: string; confidence: number; implementability: number;
  usefulness: string; hasVideo: boolean;
}
export interface ActionableItem {
  name: string; type: string; description: string; url: string;
  installCommand: string; code: string; urlStatus: string; verification: string;
}
export interface LinkItem { name?: string; url: string; type?: string; description?: string; timestamp?: string; }
export interface ItemResult { itemName: string; researchSummary: string; implementationResult: string; isUrlLive: string; notes: string; }
export interface VideoDetail extends IndexRecord {
  code: string; pk: string | null; caption: string; hashtags: string[];
  transcript: string; visualDescription: string; keyTakeaways: string[]; topics: string[];
  links: LinkItem[]; actionableItems: ActionableItem[]; verificationSummary: string;
  itemResults: ItemResult[]; relatedIds: string[]; videoPath: string | null;
  resolution: string; fileSizeMb: number;
}
export interface Facets {
  categories: { name: string; count: number; color: string; bg: string }[];
  creators: { name: string; fullName: string; count: number }[];
  tags: { name: string; count: number }[];
  topics: { name: string; count: number }[];
}
export interface ToolRecord {
  name: string; type: string; url: string; urlStatus: string;
  videoId: string; videoTitle: string; username: string; category: string;
  verification: string; description: string;
}
export interface Meta { generatedAt: string; totalVideos: number; totalCategories: number; totalDurationSec: number; }
export interface IndexFile { meta: Meta; videos: IndexRecord[]; }
```
- [ ] **Step 2:** Commit: `git add web/src/lib/types.ts && git commit -m "feat(web): data contract types"`

### Task 0.3: Theme tokens (`web/src/lib/theme.css`, `web/src/app.css`)

- [ ] **Step 1:** `theme.css` — CSS custom properties for the refined dark control-room palette (from spec §8):
```css
:root{
  --bg:#0b0d10; --surface:#14171c; --elevated:#1c2026; --border:#262b33;
  --text:#e8ebef; --muted:#9aa3ad; --faint:#6b7480;
  --accent:#f0a868; --accent-press:#e0945a;
  --ok:#3fb950; --warn:#d29922; --neutral:#8b949e; --bad:#f85149;
  --radius:10px; --radius-pill:999px; --maxw:1320px;
  --t-fast:120ms; --t:160ms;
  --fs-0:12px;--fs-1:14px;--fs-2:16px;--fs-3:20px;--fs-4:26px;--fs-5:34px;
}
```
- [ ] **Step 2:** `app.css` — `@import './lib/theme.css';` + base resets (box-sizing, body bg/text/font,
  link color `var(--accent)`, focus-visible ring, `::selection`), system/Inter font stack, smooth-scroll.
- [ ] **Step 3:** Commit: `git add web/src/lib/theme.css web/src/app.css && git commit -m "feat(web): dark control-room theme tokens"`

**Acceptance:** build still succeeds; body renders on `--bg` with `--text`.

---

## Phase 1 — Data layer (sequential; the contract everything depends on)

### Task 1.1: Data builder core (`src/dashboard/data-builder.ts`)

Reuse the loading/normalization logic from `src/agents/dashboard.ts:155-321` (loadState of KNOWLEDGE_BASE,
CATALOG, VERIFICATIONS, ANALYSIS; transcript/visual_description/links normalization; catalog-by-filename map).
Additionally load `CONFIG.STATE.CLASSIFICATIONS`, `CONFIG.STATE.METADATA` (for `full_name`, join by pk),
`CONFIG.STATE.RESEARCH` (for per-item `url_status`), `CONFIG.STATE.LINKS_V2`, `CONFIG.STATE.PROPERTIES`.

- [ ] **Step 1:** Build a `NormalizedVideo` per filename merging all sources. `id = filename` without `.mp4`.
  Resolve `videoPath`: if a file `path.join(CONFIG.VIDEOS_DIR, filename)` exists → `"/videos/<basename(VIDEOS_DIR)>/<filename>"`, else null. `thumb = "/videos/thumbnails/<id>.jpg"`. `title` = catalog.description || first key_takeaway || "(untitled)".
- [ ] **Step 2:** Merge per-item research `url_status` and verification `item_results` into `actionableItems`
  (match `analysis.actionable_items[].name` to `research.items[].item_name` and `verifications.item_results[].item_name`).
- [ ] **Step 3:** Emit compact `IndexRecord[]` and per-video `VideoDetail`. Write:
  `dashboard/data/index.json.gz` (gzip of `{meta,videos}`), `dashboard/data/video/<id>.json`,
  `dashboard/data/meta.json`. Use `fs.mkdir(recursive)`.
- [ ] **Step 4:** Log counts. **Acceptance:** `node dist/dashboard/data-builder.js` writes 375 detail files +
  index with 375 records; `meta.totalCategories === 12`.

### Task 1.2: Facets + tools (`src/dashboard/data-builder.ts`)

- [ ] **Step 1:** Compute `facets.json`: categories (name,count,color,bg via the 12-color maps lifted from
  `dashboard.ts` catColor/catBg into `src/dashboard/colors.ts`), creators (group by username; drop empty),
  tags (count from classifications.tags), topics (from knowledge_base.topics). Sort by count desc.
- [ ] **Step 2:** Compute `tools.json`: flatten verified `actionableItems` with a non-empty `url` across all
  videos where source `verification` ∈ {verified_useful, partially_verified}; include `urlStatus`, `videoId`,
  `videoTitle`, `username`, `category`. Dedup by (name,url) keeping the best `urlStatus`.
- [ ] **Step 3:** Commit: `git add src/dashboard package.json && git commit -m "feat(dashboard): data builder — index, detail, facets, tools"`

**Acceptance:** `facets.categories` has 12 entries with colors; `tools.json` non-empty; valid JSON.

### Task 1.3: Related-videos algorithm (`src/dashboard/related.ts` + test)

- [ ] **Step 1:** Implement (pure, deterministic):
```ts
export interface RelInput { id:string; tags:string[]; topics:string[]; category:string; username:string; toolUrls:string[]; date:string; }
export function computeRelated(all: RelInput[], k = 8): Map<string,string[]> {
  const norm = (s:string)=>s.toLowerCase().trim();
  const out = new Map<string,string[]>();
  for (const a of all) {
    const aT=new Set(a.tags.map(norm)), aTo=new Set(a.topics.map(norm)), aU=new Set(a.toolUrls);
    const scored:{id:string;score:number;date:string}[]=[];
    for (const b of all) {
      if (b.id===a.id) continue;
      let s=0;
      for (const t of b.tags) if (aT.has(norm(t))) s+=3;
      for (const t of b.topics) if (aTo.has(norm(t))) s+=2;
      if (a.category && b.category===a.category) s+=2;
      if (a.username && b.username===a.username) s+=1;
      for (const u of b.toolUrls) if (aU.has(u)) s+=1;
      if (s>0) scored.push({id:b.id,score:s,date:b.date||''});
    }
    scored.sort((x,y)=> y.score-x.score || y.date.localeCompare(x.date));
    out.set(a.id, scored.slice(0,k).map(z=>z.id));
  }
  return out;
}
```
- [ ] **Step 2:** Test `src/dashboard/related.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeRelated } from './related.js';
describe('computeRelated', () => {
  it('ranks shared tags highest and excludes self', () => {
    const r = computeRelated([
      {id:'a',tags:['x','y'],topics:[],category:'C',username:'u',toolUrls:[],date:'2'},
      {id:'b',tags:['x','y'],topics:[],category:'C',username:'u',toolUrls:[],date:'1'},
      {id:'c',tags:['z'],topics:[],category:'D',username:'v',toolUrls:[],date:'3'},
    ]);
    expect(r.get('a')).toEqual(['b']);          // c shares nothing -> excluded
    expect(r.get('a')).not.toContain('a');
  });
});
```
- [ ] **Step 3:** Run: `npx vitest run src/dashboard/related.test.ts` — Expected: PASS.
- [ ] **Step 4:** Wire `relatedIds` into each `VideoDetail` (Task 1.1 output). Commit:
  `git add src/dashboard && git commit -m "feat(dashboard): related-videos algorithm + test"`

### Task 1.4: Wire as pipeline step 11

- [ ] **Step 1:** Modify `src/agents/dashboard.ts` `runDashboardAgent()` to call the data builder
  (`import { buildDashboardData } from '../dashboard/data-builder.js'`) instead of writing HTML. Keep the
  export name so `runner.ts` step 11 and `npm run dashboard` are unchanged. Remove the giant `buildHtml`.
- [ ] **Step 2:** Build + run step 11 only: `npm run build && node dist/pipeline/runner.js --start=10 --end=10`
  Expected: data written, no HTML.
- [ ] **Step 3:** Commit: `git add src/agents/dashboard.ts && git commit -m "refactor(dashboard): step 11 emits data JSON (build-free)"`

**Acceptance:** Daily pipeline step 11 produces `dashboard/data/*` and never invokes vite.

---

## Phase 2 — App shell + data access + components (sequential)

### Task 2.1: Client data access (`web/src/lib/data.ts`, `web/src/lib/format.ts`)

- [ ] **Step 1:** `data.ts`: `loadIndex()` fetches `/data/index.json.gz` (browser auto-decompresses gzip via
  `Content-Encoding`; server must send it — fallback to ungzipped `/data/index.json` if needed), caches in a
  module singleton + a Svelte store; `loadDetail(id)` fetches `/data/video/${encodeURIComponent(id)}.json`
  (per-id cache); `loadFacets()`, `loadTools()`. All return typed data from `types.ts`. Handle 404 → null.
- [ ] **Step 2:** `format.ts`: `fmtDuration(sec)`, `fmtDate(iso)`, `fmtNumber(n)`, `catColor(cat)`, `catBg(cat)`
  (12-category maps), `igUrl(code)`, `verifClass(score)`.
- [ ] **Step 3:** Commit.

**Decision on gzip:** simplest reliable path = builder writes BOTH `index.json` (plain) and the server sets
`Content-Encoding` only if serving `.gz`. To avoid server complexity, builder writes plain `index.json`
(server gzips via express compression middleware). Update Task 1.1 to write plain `index.json`; add
`compression` middleware in Task 4.1. (No `.gz` file needed.)

### Task 2.2: App shell (`+layout.svelte`, `TopBar`, `SearchBox`)

- [ ] **Step 1:** `+layout.svelte`: imports `app.css`, renders `<TopBar/>` + `<main class="container">{@render children()}</main>`. Loads index once on mount into the store.
- [ ] **Step 2:** `TopBar.svelte`: sticky, slim. Logo "Dopamine" → `/`. Global `SearchBox` (submits to `/search?q=`). Nav links: Home, Videos, Tools, Knowledge. Mobile: collapses to logo + search icon + hamburger menu.
- [ ] **Step 3:** Commit.

**Acceptance:** every page shows the top bar; nav links route client-side; mobile menu toggles at ≤640px.

### Task 2.3: Shared components

Build each as a focused `.svelte` file with typed props (`types.ts`). Acceptance = renders from real data, is
keyboard-focusable, responsive.

- [ ] `VideoCard.svelte` (props: `IndexRecord`) — thumbnail (16:9, lazy, `▶` fallback), category chip overlay,
  duration overlay, title (2-line clamp), `CreatorLink`, up to 5 `TagChip`, date·likes, verification dot.
  Whole card → `/video/<id>`; creator/category/tags are nested links (stopPropagation).
- [ ] `VideoGrid.svelte` (props: `IndexRecord[]`) — responsive auto-fill grid (`minmax(300px,1fr)`),
  windowed rendering for >60 items (render in chunks on scroll / `IntersectionObserver` sentinel).
- [ ] `CategoryChip` (→`/category/<cat>`, colored), `TagChip` (→`/tag/<tag>`), `CreatorLink` (→`/creator/<name>`),
  `Chip` (generic), `VerificationBadge` (color by score), `RelatedRail` (props: `id[]` → resolve from index,
  horizontal scroll of small cards), `Breadcrumbs`, `SectionNav` (in-page anchor tabs), `ActionableItem`
  (name, type, description, install/code blocks, url-status badge, external link), `EmptyState`, `Spinner`.
- [ ] Commit per logical group: `git commit -m "feat(web): shared components"`

---

## Phase 3 — Pages (PARALLEL fan-out; each depends only on Phase 2 contracts)

Each task: build the route `+page.svelte` (+ `+page.ts` loader reading the route param + store/data lib).
Acceptance criteria listed per page. All pages: responsive (1→2→3→4 cols as applicable), use shared
components, every entity reference is a link, show `EmptyState` when no data, `Spinner` while loading.

- [ ] **3.1 Home `/`** — hero/title; global `SearchBox`; **category tiles** (from facets, colored, →`/category`);
  **Recent** `VideoGrid` (newest ~12, "See all"→`/videos`); **Top creators** (facets.creators top ~10 →`/creator`);
  **Trending tags** (facets.tags top ~20 →`/tag`); **Verified tools peek** (tools top ~6 →`/tools`).
  Acceptance: every section links out; loads from index+facets+tools; mobile single-column.
- [ ] **3.2 Library `/videos`** — `SearchBox` (filters index client-side), category filter chips (multi-select),
  verification filter, sort (date/duration/likes/category), `VideoGrid`. Filter state in URL query
  (`?cat=&sort=&q=&verif=`) so it's shareable. Stats reflect the **filtered** set.
- [ ] **3.3 Entity `/video/[id]`** — `loadDetail(id)`. Layout: main column + Related sidebar (desktop) → stacked
  (mobile). Main: title, `Breadcrumbs` (Home › Category › title), `CreatorLink`, category/tags chips, Instagram
  link (`igUrl(code)`), inline `<video controls>` from `videoPath` (or thumbnail if null). `SectionNav` anchors:
  Takeaways · Transcript · On-screen · Tools · Links. Tools section uses `ActionableItem` with per-item
  url-status + verification. Sidebar: `VerificationBadge` + summary + `RelatedRail`.
  Acceptance: from this page you can reach creator, category, each tag, each tool URL, each related video;
  direct load of `/video/<id>` + refresh works (SPA fallback).
- [ ] **3.4 Creator `/creator/[name]`** — header (@name, fullName, count, total likes), `VideoGrid` of their
  videos (filter index by username). Breadcrumbs. Acceptance: links back to each video; 404→EmptyState.
- [ ] **3.5 Category `/category/[cat]`** — header (name colored, count), sub-category sub-filter chips,
  `VideoGrid`. Acceptance: decode `[cat]`; links to videos/creators/tags.
- [ ] **3.6 Tag `/tag/[tag]`** — header (#tag, count), `VideoGrid` of videos containing the tag (case-insensitive).
- [ ] **3.7 Tools `/tools`** — `loadTools()`. Filters: url-status (live/redirect/dead/all), type, category, text.
  Each row: tool name, type, url-status badge, external link, →source video + its category/creator. Sort by
  status then category. Acceptance: "live only" filter works; each tool links to its `/video/<id>`.
- [ ] **3.8 KB `/kb`** — reading-optimized list: per-entry takeaways + topics + transcript excerpt + search
  (transcript/takeaways/topics/tools). Each entry → `/video/<id>`. Acceptance: full-text search returns hits
  with context; comfortable reading measure.
- [ ] **3.9 Search `/search?q=`** — reads `q` from URL; searches index (title, username, category, subcategory,
  tags) + optionally detail topics; grouped results (videos / creators / tags / tools); empty + no-results
  states. Acceptance: `/search?q=agent` returns relevant grouped hits; updating query updates results.

---

## Phase 4 — Server + integration (sequential)

### Task 4.1: Update `src/server/dashboard-server.ts`

- [ ] **Step 1:** Replace the strict allowlist with: dotfile block (keep) → `compression()` → static serve of
  `dashboard/` at `/` (assets: `_app`, `index.html`, `data`) → static serve `/videos` → **SPA fallback**:
```ts
// after static middlewares:
app.get('*', async (req, res) => {
  if (req.method !== 'GET' || !req.accepts('html')) { res.status(404).send('Not found'); return; }
  if (req.path.startsWith('/videos') || req.path.startsWith('/data') || req.path.includes('.')) { res.status(404).send('Not found'); return; }
  try { res.type('html').send(await fs.readFile(path.resolve('dashboard/index.html'), 'utf-8')); }
  catch { res.status(404).send('Not found'); }
});
```
- [ ] **Step 2:** Update CSP to allow the built app: `default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'`.
- [ ] **Step 3:** Add `compression` dep (`npm i compression @types/compression`). Keep PORT/HOST envs.
  Fold the old `/` overview into the app home (remove the overview.html handler, or 301 `/dashboard`→`/`).
- [ ] **Step 4:** `npm run build` (tsc). Commit: `git add src/server package.json package-lock.json && git commit -m "feat(server): serve SvelteKit app with SPA fallback + data"`

**Acceptance:** `curl -s -o /dev/null -w '%{http_code}' http://localhost:PORT/video/anything` → 200 (index.html);
`/data/meta.json` → 200 JSON; `/videos/thumbnails/<id>.jpg` → 200.

### Task 4.2: Full build + restart + smoke

- [ ] **Step 1:** `npm run dashboard:all` (tsc + data + web build).
- [ ] **Step 2:** Restart dashboard: `launchctl kickstart -k gui/$(id -u)/com.dopamine.dashboard`.
- [ ] **Step 3:** Smoke: curl `/`, `/data/index.json`, `/data/meta.json`, a `/data/video/<id>.json` → all 200.
- [ ] **Step 4:** Commit built output: `git add dashboard && git commit -m "build(dashboard): SvelteKit app + data"`

---

## Phase 5 — Verification (Chrome MCP) — sequential, last

- [ ] **Step 1:** Clean single-instance browser reset: `pkill -9 -f 'chrome-devtools-mcp/chrome-profile';
  rm -f ~/.cache/chrome-devtools-mcp/chrome-profile/Singleton*` then navigate fresh.
- [ ] **Step 2:** Desktop 1440×900 screenshots of: `/`, `/videos`, a `/video/<id>`, `/creator/<name>`,
  `/category/<cat>`, `/tools`. Verify refined dark aesthetic + layout.
- [ ] **Step 3:** Mobile 390×844 screenshots of the same — verify single-column, condensed top bar, no overflow.
- [ ] **Step 4:** Click-through cross-links: video→creator→back; video→tag→category; tool→source video; related rail.
- [ ] **Step 5:** Deep-link + refresh: open `/video/<id>` directly and reload — page renders (SPA fallback works).
- [ ] **Step 6:** Console-error check (`list_console_messages`) — zero errors; network panel — data assets 200.
- [ ] **Step 7:** Fix any defects found (loop back to the owning task), rebuild, re-verify.

**Done when:** all pages render correctly on desktop + mobile, all cross-links work, deep-link+refresh works,
no console errors, and the daily pipeline step 11 still emits data without a frontend build.

---

## Self-Review

- **Spec coverage:** §4 arch→Tasks 0.1/1.4/4.1; §5 routes→Phase 3; §6 cross-linking→VideoCard/entity/related;
  §7 data+related→Phase 1; §8 visual→0.3/components; §9 responsive→components+pages; §10 perf→index/detail
  split + windowing; §12 build/deploy→0.1/4.x; §13 migration→1.4/4.1; §14 verification→Phase 5. ✓ No gaps.
- **Placeholders:** logic tasks carry complete code + tests; UI tasks are spec+acceptance by design (agents
  write Svelte against real data). No "TBD/handle edge cases" left as the *only* content of a code step.
- **Type consistency:** `IndexRecord`/`VideoDetail`/`Facets`/`ToolRecord` defined once (0.2), emitted by the
  builder (1.x), consumed by `data.ts` (2.1) and all pages. `computeRelated` I/O matches `relatedIds`.
