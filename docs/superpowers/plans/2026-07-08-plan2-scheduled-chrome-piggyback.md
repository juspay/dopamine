# Plan 2 — Scheduled-Chrome Piggyback

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Depends on Plan 1** (`ingestMetadata`, `STATE.METADATA_INCOMING`, `batchToSourceItems`).

**Goal:** A launchd-scheduled headless Chrome, logged into instagram.com on a dedicated profile, opens your saved page; we read the saved-feed responses Instagram's *own* web client fetches (via the DevTools protocol — zero API calls of our own), map them to `MetadataEntry`, union them through `ingestMetadata`, and download new videos from their CDN `video_url`. This is the block-resistant primary capture path.

**Architecture:** `chrome-remote-interface` drives a Chrome launched headless with `--user-data-dir=<dedicated profile>` + `--remote-debugging-port`. The harvester enables the CDP `Network` domain, navigates to `instagram.com/<user>/saved/all-posts/`, captures response bodies whose URL matches the saved-feed endpoint, parses → `MetadataEntry[]`, ingests, writes the incoming batch, and downloads new mp4s. A new `IG_COLLECTOR=piggyback` pipeline mode consumes what the harvester produced (skips the instagrapi subprocess entirely).

**Tech Stack:** TypeScript (ESM, vitest), `chrome-remote-interface`, Chrome `--headless=new`, launchd.

**Spec:** `docs/superpowers/specs/2026-07-07-reliable-instagram-ingestion-design.md`

---

### Task 1: Web-media → `MetadataEntry` map + saved-feed URL filter

**Files:**
- Create: `src/pipeline/piggyback/map-web-media.ts`
- Test: `src/__tests__/piggyback-map.test.ts`

- [ ] **Step 1: Write the failing test** (`src/__tests__/piggyback-map.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { webResponseToEntries, isSavedFeedUrl } from "../pipeline/piggyback/map-web-media.js";

const webItem = (pk: number, mt: number) => ({
  media: {
    pk, code: `c${pk}`, media_type: mt, taken_at: 1735689600, // 2025-01-01
    caption: { text: "hello" }, user: { username: "alice", full_name: "Alice" },
    like_count: 5, comment_count: 1,
    image_versions2: { candidates: [{ url: "https://cdn/thumb.jpg" }] },
    video_versions: mt === 2 ? [{ url: "https://cdn/video.mp4" }] : undefined,
  },
});

describe("isSavedFeedUrl", () => {
  it("matches the saved + collection feed endpoints only", () => {
    expect(isSavedFeedUrl("https://www.instagram.com/api/v1/feed/saved/posts/?max_id=x")).toBe(true);
    expect(isSavedFeedUrl("https://www.instagram.com/api/v1/feed/collection/123/posts/")).toBe(true);
    expect(isSavedFeedUrl("https://www.instagram.com/api/v1/feed/timeline/")).toBe(false);
  });
});

describe("webResponseToEntries", () => {
  it("maps a saved-feed response to MetadataEntry[] with a video url", () => {
    const out = webResponseToEntries({ items: [webItem(1, 2), webItem(2, 1)] });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      pk: "1", code: "c1", media_type: 2, username: "alice",
      caption_text: "hello", video_url: "https://cdn/video.mp4",
      thumbnail_url: "https://cdn/thumb.jpg", like_count: 5,
    });
    expect(out[0].taken_at).toMatch(/^2025-01-01T/);
    expect(out[1].video_url).toBeNull();
  });

  it("tolerates items without a media wrapper and skips malformed entries", () => {
    const out = webResponseToEntries({ items: [{ media: { code: "x" } }, webItem(3, 2)] as never });
    expect(out.map((e) => e.pk)).toEqual(["3"]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/piggyback-map.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement** (`src/pipeline/piggyback/map-web-media.ts`):

```ts
// src/pipeline/piggyback/map-web-media.ts
import type { MetadataEntry } from "../../types/index.js";

interface WebMedia {
  pk?: number | string;
  code?: string;
  media_type?: number;
  taken_at?: number;
  caption?: { text?: string } | null;
  user?: { username?: string; full_name?: string };
  like_count?: number;
  comment_count?: number;
  image_versions2?: { candidates?: Array<{ url?: string }> };
  video_versions?: Array<{ url?: string }>;
  carousel_media?: WebMedia[];
  location?: { pk?: number; name?: string; lat?: number | null; lng?: number | null } | null;
}
interface WebItem { media?: WebMedia }

/** The saved-feed + named-collection endpoints IG's web client hits. */
export function isSavedFeedUrl(url: string): boolean {
  return /\/api\/v1\/feed\/saved\/posts\//.test(url) ||
         /\/api\/v1\/feed\/collection\/\d+\/posts\//.test(url);
}

const isoFromEpoch = (s?: number): string | null =>
  typeof s === "number" ? new Date(s * 1000).toISOString() : null;
const thumb = (m: WebMedia): string | null => m.image_versions2?.candidates?.[0]?.url ?? null;
const vurl = (m: WebMedia): string | null => m.video_versions?.[0]?.url ?? null;

function toEntry(m: WebMedia | undefined): MetadataEntry | null {
  if (!m || m.pk == null || m.media_type == null || !m.code) return null;
  const loc = m.location
    ? { pk: m.location.pk ?? 0, name: m.location.name ?? "", lat: m.location.lat ?? null, lng: m.location.lng ?? null }
    : null;
  return {
    pk: String(m.pk),
    code: m.code,
    media_type: m.media_type,
    taken_at: isoFromEpoch(m.taken_at),
    caption_text: m.caption?.text ?? null,
    username: m.user?.username ?? null,
    full_name: m.user?.full_name ?? null,
    location: loc,
    like_count: m.like_count ?? 0,
    comment_count: m.comment_count ?? 0,
    video_url: vurl(m),
    thumbnail_url: thumb(m),
    resources: (m.carousel_media ?? []).map((r) => ({
      pk: String(r.pk ?? ""),
      media_type: r.media_type ?? 0,
      video_url: vurl(r),
      thumbnail_url: thumb(r),
    })),
  };
}

export function webResponseToEntries(json: { items?: WebItem[] }): MetadataEntry[] {
  return (json.items ?? [])
    .map((it) => toEntry(it.media ?? (it as unknown as WebMedia)))
    .filter((e): e is MetadataEntry => e !== null);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/piggyback-map.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/piggyback/map-web-media.ts src/__tests__/piggyback-map.test.ts
git commit -m "feat(piggyback): map IG web saved-feed responses to MetadataEntry"
```

---

### Task 2: Add the CDP client dependency

**Files:**
- Modify: `package.json` / `package-lock.json`

- [ ] **Step 1: Install** (npm — matches the lockfile):

Run: `npm install --save chrome-remote-interface@^0.33`
Expected: `chrome-remote-interface` added to `dependencies`; lockfile updated.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(deps): add chrome-remote-interface for the piggyback harvester"
```

---

### Task 3: `IG_COLLECTOR=piggyback` pipeline mode

**Files:**
- Modify: `src/pipeline/config.ts` (doc the new value; no code change if `IG_COLLECTOR` is already a passthrough string)
- Modify: `src/sources/instagram/collector.ts`
- Test: `src/__tests__/instagram-collector.test.ts` (extend)

The harvester (Task 4) produces `metadata.incoming.json`, ingests it, and downloads mp4s. In `piggyback` mode the pipeline's collect step must **skip the instagrapi subprocess** and simply consume that batch.

- [ ] **Step 1: Write the failing test** — assert the mode-selection helper returns which scripts (if any) run:

```ts
import { collectorScriptsFor } from "../sources/instagram/collector.js";

describe("collectorScriptsFor", () => {
  it("piggyback mode runs no python scripts", () => {
    expect(collectorScriptsFor("piggyback")).toEqual([]);
  });
  it("gallerydl mode runs the gallery-dl script", () => {
    expect(collectorScriptsFor("gallerydl")).toEqual([
      { script: "scripts/collect_saved_gallerydl.py", kind: "download" },
    ]);
  });
  it("default (instagrapi) runs collect then download", () => {
    expect(collectorScriptsFor("instagrapi")).toEqual([
      { script: "scripts/collect_metadata.py", kind: "collector" },
      { script: "scripts/download_videos.py", kind: "download" },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/__tests__/instagram-collector.test.ts`
Expected: FAIL — `collectorScriptsFor` not exported.

- [ ] **Step 3: Implement** — refactor `collect()` to use a pure selector:

```ts
type ScriptStep = { script: string; kind: "collector" | "download" };

export function collectorScriptsFor(mode: string): ScriptStep[] {
  if (mode === "piggyback") return [];
  if (mode === "gallerydl") return [{ script: "scripts/collect_saved_gallerydl.py", kind: "download" }];
  return [
    { script: "scripts/collect_metadata.py", kind: "collector" },
    { script: "scripts/download_videos.py", kind: "download" },
  ];
}
```

and in `collect()`:

```ts
    async collect(): Promise<SourceItem[]> {
      for (const step of collectorScriptsFor(CONFIG.IG_COLLECTOR)) {
        const timeout = step.kind === "collector" ? CONFIG.COLLECTOR_TIMEOUT_MS : CONFIG.DOWNLOAD_TIMEOUT_MS;
        await runScript(step.script, timeout);
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
git commit -m "feat(piggyback): add IG_COLLECTOR=piggyback mode (consume harvester batch, skip instagrapi)"
```

---

### Task 4: The CDP harvester

**Files:**
- Create: `src/pipeline/piggyback/harvester.ts`
- Create: `src/pipeline/piggyback/chrome.ts` (launch + port-wait helper)

- [ ] **Step 1: Chrome launch helper** (`src/pipeline/piggyback/chrome.ts`):

```ts
// src/pipeline/piggyback/chrome.ts
import { spawn, type ChildProcess } from "node:child_process";

const CHROME = process.env.IG_PIGGYBACK_CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function launchChrome(port: number, profileDir: string): ChildProcess {
  return spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--window-size=1280,2000",
    "about:blank",
  ], { stdio: "ignore" });
}

export async function waitForPort(port: number, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error(`Chrome DevTools port ${port} did not open within ${timeoutMs}ms`);
}
```

- [ ] **Step 2: Harvester** (`src/pipeline/piggyback/harvester.ts`):

```ts
// src/pipeline/piggyback/harvester.ts
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import CDP from "chrome-remote-interface";
import { CONFIG } from "../config.js";
import { ingestMetadata } from "../ingest.js";
import { isSavedFeedUrl, webResponseToEntries } from "./map-web-media.js";
import { launchChrome, waitForPort } from "./chrome.js";
import type { MetadataEntry } from "../../types/index.js";

const PORT = parseInt(process.env.IG_PIGGYBACK_PORT ?? "9455", 10);
const PROFILE = process.env.IG_PIGGYBACK_PROFILE_DIR ?? path.join(os.homedir(), ".dopamine-ig-profile");
const SCROLLS = parseInt(process.env.IG_PIGGYBACK_SCROLLS ?? "3", 10);
const USER = process.env.INSTAGRAM_USERNAME ?? "";
const SAVED_URL = `https://www.instagram.com/${USER}/saved/all-posts/`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function downloadNew(entries: MetadataEntry[]): Promise<number> {
  let n = 0;
  for (const e of entries) {
    if (e.media_type !== 2 || !e.video_url) continue;
    const dest = path.join(CONFIG.VIDEOS_DIR, `${e.username ?? ""}_${e.pk}.mp4`);
    try { await fs.access(dest); continue; } catch { /* missing → download */ }
    try {
      const r = await fetch(e.video_url);
      if (!r.ok) continue;
      await fs.mkdir(CONFIG.VIDEOS_DIR, { recursive: true });
      await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
      n++;
    } catch (err) { console.error(`[piggyback] download failed ${e.pk}: ${String(err).split("\n")[0]}`); }
  }
  return n;
}

export async function harvest(): Promise<void> {
  if (!USER) throw new Error("INSTAGRAM_USERNAME must be set to build the saved-page URL");
  const chrome = launchChrome(PORT, PROFILE);
  let client: Awaited<ReturnType<typeof CDP>> | undefined;
  try {
    await waitForPort(PORT);
    client = await CDP({ port: PORT });
    const { Network, Page, Runtime } = client;
    await Network.enable({});
    await Page.enable();

    const savedRequestIds: string[] = [];
    Network.responseReceived(({ requestId, response }) => {
      if (isSavedFeedUrl(response.url)) savedRequestIds.push(requestId);
    });

    await Page.navigate({ url: SAVED_URL });
    await Page.loadEventFired();
    for (let i = 0; i < SCROLLS; i++) {
      await Runtime.evaluate({ expression: "window.scrollTo(0, document.body.scrollHeight)" });
      await sleep(1800);
    }
    await sleep(2000); // settle in-flight responses

    const { result } = await Runtime.evaluate({ expression: "location.pathname" });
    if (String(result.value ?? "").includes("/accounts/login")) {
      console.error(`[piggyback] NOT LOGGED IN. Re-seed the profile:\n` +
        `  open -a "Google Chrome" --args --user-data-dir="${PROFILE}" https://www.instagram.com/\n` +
        `  (log in once, then close Chrome and re-run.)`);
      process.exitCode = 2;
      return;
    }

    const entries: MetadataEntry[] = [];
    for (const requestId of savedRequestIds) {
      try {
        const { body, base64Encoded } = await Network.getResponseBody({ requestId });
        const text = base64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
        entries.push(...webResponseToEntries(JSON.parse(text)));
      } catch { /* body evicted / not JSON — skip */ }
    }

    // dedup within this harvest by pk
    const byPk = new Map(entries.map((e) => [e.pk, e]));
    const batch = [...byPk.values()];
    console.log(`[piggyback] captured ${batch.length} saved item(s) from ${savedRequestIds.length} response(s)`);

    await fs.mkdir(path.dirname(CONFIG.STATE.METADATA_INCOMING), { recursive: true });
    await fs.writeFile(CONFIG.STATE.METADATA_INCOMING, JSON.stringify(batch, null, 2), "utf8");
    const { added, updated, total } = await ingestMetadata(batch);
    const dl = await downloadNew(batch);
    console.log(`[piggyback] ingest +${added} new, ~${updated} refreshed, ${total} total; downloaded ${dl} mp4(s)`);
  } finally {
    if (client) await client.close().catch(() => {});
    chrome.kill();
  }
}

if (process.argv[1]?.endsWith("harvester.js")) {
  harvest().catch((err) => { console.error("[piggyback] harvest failed:", err); process.exit(1); });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If CDP types are loose, `chrome-remote-interface` ships its own `.d.ts`; a targeted `// @ts-expect-error` on the event callback is acceptable if the event payload type is `unknown`.)

- [ ] **Step 4: Commit**

```bash
git add src/pipeline/piggyback/harvester.ts src/pipeline/piggyback/chrome.ts
git commit -m "feat(piggyback): CDP harvester — capture saved-feed responses, ingest, download mp4s"
```

---

### Task 5: One-time profile setup + run script + launchd schedule

**Files:**
- Create: `docs/piggyback-setup.md`
- Create: `scripts/run-piggyback.sh`
- Create: `~/Library/LaunchAgents/com.dopamine.piggyback.plist`

- [ ] **Step 1: Setup doc** (`docs/piggyback-setup.md`):

```markdown
# Piggyback harvester — one-time setup

1. Create the dedicated Chrome profile and log into Instagram once (headed):

   open -a "Google Chrome" --args --user-data-dir="$HOME/.dopamine-ig-profile" https://www.instagram.com/

   Log in fully (complete any 2FA / "save login"), confirm you can open your
   Saved page, then **quit that Chrome window**.

2. Build and test the harvester once, headless:

   npm run build && INSTAGRAM_USERNAME=<you> node dist/pipeline/piggyback/harvester.js

   Expect "captured N saved item(s)" and "downloaded M mp4(s)". If you see
   "NOT LOGGED IN", repeat step 1 (the session expired).

3. Load the schedule:

   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dopamine.piggyback.plist

Re-login (step 1) whenever the harvester logs "NOT LOGGED IN".
```

- [ ] **Step 2: Run script** (`scripts/run-piggyback.sh`):

```bash
#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
npm run build >> logs/piggyback.log 2>&1
node dist/pipeline/piggyback/harvester.js >> logs/piggyback.log 2>&1
```

Run: `chmod +x scripts/run-piggyback.sh`

- [ ] **Step 3: launchd plist** (`~/Library/LaunchAgents/com.dopamine.piggyback.plist`) — runs 30 min **before** the pipeline (8:00 Mon/Thu vs. the pipeline's 8:30) so captured items are ingested and downloaded first. Mirror the `EnvironmentVariables` (PATH/HOME/`INSTAGRAM_USERNAME`) from `com.dopamine.pipeline.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.dopamine.piggyback</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/sachinsharma/Developer/temp/dopamine/scripts/run-piggyback.sh</string>
    </array>
    <key>WorkingDirectory</key><string>/Users/sachinsharma/Developer/temp/dopamine</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key><string>/Users/sachinsharma/.pyenv/shims:/Users/sachinsharma/Library/pnpm:/Users/sachinsharma/Library/pnpm/nodejs/24.0.2/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key><string>/Users/sachinsharma</string>
        <key>INSTAGRAM_USERNAME</key><string>REPLACE_WITH_USERNAME</string>
        <key>IG_PIGGYBACK_PROFILE_DIR</key><string>/Users/sachinsharma/.dopamine-ig-profile</string>
    </dict>
    <key>StartCalendarInterval</key>
    <array>
        <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
        <dict><key>Weekday</key><integer>4</integer><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
    </array>
    <key>StandardOutPath</key><string>/Users/sachinsharma/Developer/temp/dopamine/logs/launchd-piggyback.log</string>
    <key>StandardErrorPath</key><string>/Users/sachinsharma/Developer/temp/dopamine/logs/launchd-piggyback.log</string>
    <key>RunAtLoad</key><false/>
</dict>
</plist>
```

Set the pipeline job's `IG_COLLECTOR=piggyback` (add to `com.dopamine.pipeline.plist` `EnvironmentVariables`) so its collect step consumes the harvest instead of re-hitting instagrapi.

- [ ] **Step 4: Commit** (repo files only — the plist under `~/Library` is a machine artifact; keep a copy in-repo for reference):

```bash
mkdir -p deploy/launchd && cp ~/Library/LaunchAgents/com.dopamine.piggyback.plist deploy/launchd/
git add docs/piggyback-setup.md scripts/run-piggyback.sh deploy/launchd/com.dopamine.piggyback.plist
git commit -m "feat(piggyback): scheduled-Chrome harvester setup, run script, launchd job"
```

---

### Task 6: Full verification

- [ ] **Step 1: Build + full suite**

Run: `npx tsc --noEmit && node node_modules/vitest/vitest.mjs run`
Expected: clean build; all tests pass (map + collector-mode + Plan 1 tests).

- [ ] **Step 2: Live harvester smoke test** (manual, requires the one-time login from Task 5):

Run: `npm run build && INSTAGRAM_USERNAME=<you> node dist/pipeline/piggyback/harvester.js`
Expected: "captured N saved item(s)"; `videos/metadata.incoming.json` populated; new mp4s in `videos/<user>_saved/`; `metadata.json` grew. If "NOT LOGGED IN", re-seed the profile.

- [ ] **Step 3: End-to-end** — run the pipeline in piggyback mode against the harvested batch:

Run: `IG_COLLECTOR=piggyback node dist/pipeline/runner.js --start=0 --end=2`
Expected: collect step ingests the batch and returns only-new items; acquisition acquires them; no instagrapi subprocess launched.

**Definition of done:** web-media map tested; harvester captures saved-feed responses via CDP with zero self-issued API calls, ingests, and downloads via `video_url`; `IG_COLLECTOR=piggyback` consumes the batch; launchd job scheduled 30 min ahead of the pipeline; setup documented; `tsc` + vitest green.

---

## Post-merge operational notes

- **Cadence coupling:** harvester 8:00 Mon/Thu → pipeline 8:30 Mon/Thu. Keep the 30-min gap.
- **Session upkeep:** the only recurring manual task is re-login when the harvester reports "NOT LOGGED IN" (weeks apart, typically).
- **instagrapi path retained** as a fallback: flip `IG_COLLECTOR` back to `instagrapi` (now incremental, low-volume) if the browser path needs to be bypassed.
- **Follow-up (not in scope):** an on-demand Tampermonkey userscript posting to a local `/ingest` route, for capture from your daily browser without the scheduled Chrome.
