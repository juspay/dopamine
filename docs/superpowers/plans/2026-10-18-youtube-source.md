# YouTube Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch YouTube on end to end: liked videos and Watch Later by default, own playlists opt-in, retried failures, items visible in the dashboard, and working on a network that blocks `youtube.com`.

**Architecture:** The existing collector keeps listing through the Data API; Watch Later lists through `yt-dlp` with a cookie file; playlists go through `playlistItems.list`. Collection returns every unfinished item (the groundwork plan caps and tracks them). Acquisition keeps captions even if the mp4 fails. A reachability probe and a Gemini transcript fallback cover the network block found on 2026-10-18.

**Tech Stack:** TypeScript (strict, ESM, named exports, no `any`), `googleapis`, `google-auth-library`, `yt-dlp`, `@juspay/neurolink`, vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-youtube-x-sources-design.md` section 2. **Requires** `2026-10-18-sources-groundwork.md` merged first (store, ledger, hooks, `SourceUnavailableError`).

**Branch:** `workforge create -t feat -n youtube-source -y`, base `main` after the groundwork merges.

## Global Constraints

- OAuth uses the loopback redirect `http://127.0.0.1:<random port>`; scope stays `https://www.googleapis.com/auth/youtube.readonly`. The `urn:ietf:wg:oauth:2.0:oob` redirect is removed.
- Feeds on by default: liked videos and Watch Later. Own playlists only through `YOUTUBE_PLAYLIST_IDS` (comma-separated, empty by default).
- `YT_COOKIES_FILE` lives outside the repo, mode 600, never logged. Cookies go only on the single request that lists Watch Later, at most once per pipeline run; downloads use no cookies except one retry for an age-restricted video. Unset, unreadable or expired cookies skip Watch Later with a log line; other feeds still run.
- mp4 only for videos of `YT_DOWNLOAD_MAX_SECONDS` (default 300) or less; longer ones are transcript-only. A failed mp4 download must not discard captions already fetched.
- A network block (connection reset, timeout) is not an item failure: it never counts toward the 5-failure limit.
- No credentials, cookies or tokens in the repo or in logs; fixtures are synthetic.
- Conventions as in the groundwork plan (ESM `.js` imports, biome, vitest in `src/__tests__/`, `node node_modules/vitest/vitest.mjs run <file>`).

## Review Focus

1. A deleted or private video in the liked list (empty id or title "Deleted video"): skipped, not counted as a failure.
2. A live or upcoming stream (duration `PT0S`): no mp4 download attempt; treated as empty.
3. A cookie file readable by group or others: refused, Watch Later skipped.
4. An age-restricted video: one retry with the cookie file when set, otherwise a counted failure.
5. The network dropping halfway through a run: the first items succeed, the rest raise `SourceUnavailableError`, nothing is quarantined.

## File Structure

- Create `src/sources/youtube/{feeds,network,doctor,gemini-transcript}.ts`.
- Modify `src/sources/youtube/{auth,collector,download,ytdlp,map}.ts`, `src/pipeline/config.ts`, `package.json`.
- Create `docs/youtube-setup.md`.
- Tests in `src/__tests__/` (`youtube-*.test.ts`).

---

### Task 1: Loopback OAuth

**Files:** Modify `src/sources/youtube/auth.ts`. Test extend `src/__tests__/youtube-auth.test.ts`.

**Interfaces:**
- Produces: `export interface LoopbackServer { redirectUri: string; waitForCode(): Promise<string>; close(): void }` and `export async function startLoopbackServer(timeoutMs = 300_000): Promise<LoopbackServer>` (binds `127.0.0.1`, port 0; serves one `GET /` carrying `?code=` or `?error=`; replies a short HTML page; closes itself).
- Produces: `buildOAuthClient(env: YoutubeAuthEnv, redirectUri?: string): OAuth2Client` (no OOB default; a refresh needs no redirect).
- `main()`: start the server, build the client with its `redirectUri`, print the consent URL, wait for the code, `getToken`, `upsertEnvVar(".env", "YOUTUBE_REFRESH_TOKEN", ...)`.

- [ ] **Step 1:** Write failing tests: a GET with `?code=abc` resolves `waitForCode()` to `abc`; `?error=access_denied` rejects with that text; `redirectUri` starts with `http://127.0.0.1:` and its port is above 0; the timeout rejects; `buildOAuthClient` no longer contains `urn:ietf` anywhere in its options.
- [ ] **Step 2:** Run the file; expected FAIL.
- [ ] **Step 3:** Implement with `node:http`. Reject on timeout and close the server on every path.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `fix(youtube): use the loopback redirect for the OAuth consent flow`.

### Task 2: Collector returns everything, feeds as a list

**Files:** Modify `src/sources/youtube/collector.ts:28-33,75-81`, `src/pipeline/config.ts` (remove `YOUTUBE_KNOWN_IDS`). Test extend `src/__tests__/youtube-collector.test.ts`.

**Interfaces:**
- Produces: `export interface FeedSource { name: string; list(): Promise<YtVideoRaw[]> }`; `makeYoutubeCollector(deps?: { feeds?: FeedSource[] }): SourceCollector`. `collect()` lists every feed, maps with `mapYtVideo`, returns items in feed order deduped by video id (first feed wins), and writes no state. A throwing feed is logged and skipped; if every feed throws, `collect()` throws so health records the failure. Raw entries with an empty id or title `Deleted video`/`Private video` are dropped (Review Focus 1).
- Removes `dedupeNewItems` and its test; `videos/youtube_known_ids.json` stays on disk, unused.

- [ ] **Step 1:** Write failing tests: two `collect()` calls return the same ids; `saveState` is never called; ids shared by two feeds appear once, in the first feed's position; one failing feed still returns the other's items; all failing throws; a raw entry with `id: ""` is dropped.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement; the existing liked-videos lister becomes `makeLikedFeed(): FeedSource` unchanged in behaviour.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `fix(youtube): return every unfinished item instead of recording ids before acquisition`.

### Task 3: Watch Later and playlist feeds

**Files:** Create `src/sources/youtube/feeds.ts`. Modify `src/pipeline/config.ts` (`YOUTUBE_PLAYLIST_IDS: string[]`, `YT_COOKIES_FILE: string | undefined`, `YOUTUBE_PROXY: string | undefined`). Test `src/__tests__/youtube-feeds.test.ts`.

**Interfaces:**
- Produces: `buildWatchLaterArgs(cookiesFile: string, proxy?: string): string[]` giving `["--cookies", file, ("--proxy", url)?, "--flat-playlist", "--dump-single-json", "--no-warnings", ":ytwatchlater"]`.
- Produces: `parseFlatPlaylist(json: string): YtVideoRaw[]` (id, title, duration, channel from the flat entries; `publishedAt: null`; `thumbnailUrl: "https://i.ytimg.com/vi/<id>/hqdefault.jpg"`).
- Produces: `makeWatchLaterFeed(d: { run: ExecRunner; cookiesFile?: string; proxy?: string; statMode(p: string): Promise<number | null> }): FeedSource`: returns `[]` with the log lines `[youtube] Watch Later skipped: YT_COOKIES_FILE is not set`, `... file missing`, `... file is readable by others (chmod 600)` or `... cookies look expired, re-export them`; otherwise runs yt-dlp once per process (memoised), so cookies are sent at most once per run. Any other yt-dlp failure throws.
- Produces: `makePlaylistFeed(id: string, d: { listPage(id: string, token: string | null): Promise<{ ids: string[]; next: string | null }>; details(ids: string[]): Promise<YtVideoRaw[]> }): FeedSource` (`details` is called in chunks of 50). `makeYoutubeCollector` default feeds: liked, Watch Later, then one per id in `CONFIG.YOUTUBE_PLAYLIST_IDS`.

- [ ] **Step 1:** Write failing tests: `parseFlatPlaylist` on a synthetic two-entry JSON; `buildWatchLaterArgs` has `--cookies <file>` once and `:ytwatchlater` last; skipped with each log line for unset, missing and mode 0o644 (Review Focus 3); a stderr of `Sign in to confirm` returns `[]` with the "expired" line; calling `list()` twice runs the runner once; 120 playlist ids make three `details` calls; no log line contains the cookie file's contents.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement; real `run` is the existing `execa`-based runner, real `statMode` uses `fs.stat(...).mode & 0o777`.
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `feat(youtube): add Watch Later and opt-in playlist feeds`.

### Task 4: Acquire keeps captions, is idempotent, saves a thumbnail

**Files:** Modify `src/sources/youtube/{download,ytdlp}.ts`. Test extend `src/__tests__/youtube-download.test.ts`, `src/__tests__/youtube-ytdlp.test.ts`.

**Interfaces:**
- Produces: `buildCaptionArgs(videoId, out, proxy?)`, `buildVideoArgs(videoId, out, proxy?)`: `--proxy <url>` is inserted before the URL only when given (existing tests unchanged).
- Produces: `AcquireDeps` gains `exists(p: string): Promise<boolean>`, `thumbDir: string`, `fetchBytes(url: string): Promise<Uint8Array>`, `writeFile(p: string, b: Uint8Array): Promise<void>`, `proxy?: string`, `cookiesFile?: string`. `acquireYoutube(item, deps): Promise<AcquiredAssets | null>`.
- Behaviour: skip the caption run when a `<id>.en*.vtt` exists and the mp4 run when `<id>.mp4` exists; a caption-run error that is a network failure rethrows as `SourceUnavailableError`, any other throws as is; an mp4-run error keeps the transcript and returns `videoPath: null` (logged); an age-restricted error (`Sign in to confirm your age`) retries that run once with `--cookies` when `cookiesFile` is set (Review Focus 4); `duration_seconds === 0` skips the mp4 run (2); the thumbnail is written to `<thumbDir>/<item.id>.jpg` when absent, and a thumbnail fetch error is logged, never thrown; returns `null` when there is neither a transcript nor a video (empty).

- [ ] **Step 1:** Write failing tests: captions kept when the video run throws; `null` for a long video with no VTT; the caption run skipped when a VTT exists; the age-restricted retry adds `--cookies` exactly once; a zero-duration item never runs the video command; thumbnail written once and a failing fetch still returns assets; `--proxy` appears only when given.
- [ ] **Step 2:** Run both files; expected FAIL.
- [ ] **Step 3:** Implement; `makeYoutubeCollector().acquire` builds the real deps (`CONFIG.YOUTUBE_VIDEOS_DIR`, `CONFIG.THUMB_DIR`, `fetch`, `CONFIG.YT_COOKIES_FILE`, `CONFIG.YOUTUBE_PROXY`).
- [ ] **Step 4:** Run; expected PASS.
- [ ] **Step 5:** Commit `fix(youtube): keep captions when the video download fails and make acquisition resumable`.

### Task 5: Reachability probe and `youtube:doctor`

**Files:** Create `src/sources/youtube/{network,doctor}.ts`. Modify `package.json` (`"youtube:doctor": "node dist/sources/youtube/doctor.js"`). Test `src/__tests__/youtube-network.test.ts`.

**Interfaces:**
- Produces: `type HostStatus = "ok" | "reset" | "timeout" | "dns" | "http_error"`; `YOUTUBE_HOSTS = ["www.googleapis.com", "www.youtube.com", "i.ytimg.com", "redirector.googlevideo.com"] as const`; `classifyError(err: unknown): HostStatus` (`ECONNRESET`/"reset" → reset, `ETIMEDOUT`/abort → timeout, `ENOTFOUND` → dns); `probeHosts(hosts: readonly string[], get: (url: string, ms: number) => Promise<{ status: number }>): Promise<Record<string, HostStatus>>` (any status below 500 counts as ok: a 403 or 404 proves reachability); `isNetworkFailure(message: string): boolean` matching `Connection reset`, `ECONNRESET`, `timed out`, `Unable to download API page`.
- Produces: the doctor prints one line per host plus one verdict (API, web, media reachable), and exits 1 only when the web is unreachable, `YOUTUBE_PROXY` does not fix it, and the Gemini fallback is off.
- The acquire path runs a memoised web probe once per process: unreachable and no proxy means it skips yt-dlp and goes to Task 6, or throws `SourceUnavailableError("youtube.com is unreachable from this network; set YOUTUBE_PROXY or enable the Gemini fallback")`.

- [ ] **Step 1:** Write failing tests with a fake `get`: statuses map to `ok`/`reset`/`timeout`/`dns`; a 403 and a 404 are `ok`, a 502 is `http_error`; `isNetworkFailure` is true for the yt-dlp message seen on 2026-10-18 (`Unable to download API page: ('Connection aborted.', ConnectionResetError(54, 'Connection reset by peer'))`) and false for `Video unavailable`; the probe is called once for ten acquires (Review Focus 5 setup).
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement with global `fetch` and `AbortSignal.timeout(8000)` for the real `get`.
- [ ] **Step 4:** Run; expected PASS. Then run `npm run build && npm run youtube:doctor` on this Mac; expected today: `www.googleapis.com` ok, `www.youtube.com` reset, `i.ytimg.com` ok.
- [ ] **Step 5:** Commit `feat(youtube): detect a blocked network and report it with youtube:doctor`.

### Task 6: Gemini transcript fallback (gated by a spike)

**Files:** Create `src/sources/youtube/gemini-transcript.ts`. Modify `src/sources/youtube/download.ts`, `src/pipeline/config.ts` (`YOUTUBE_GEMINI_FALLBACK: boolean`, default true; `0`/`off` disables). Test `src/__tests__/youtube-gemini.test.ts`.

**Gate (do first, report the result in the PR):** find out whether Neurolink 12.49.14 can send a YouTube URL to Gemini on Vertex as a media part (`grep -rniE "youtube|fileUri|file_data|videoUrl" node_modules/@juspay/neurolink/dist`), then run one probe against a public video from a throwaway script outside the repo. If neither works, delete this task, say so in the PR, and leave the block handled by `YOUTUBE_PROXY` only.

**Interfaces:**
- Produces: `makeGeminiTranscriber(): (videoId: string) => Promise<string | null>` (lazy `new NeuroLink()`, `CONFIG.MODEL`, `disableTools: true`, `timeout: "180s"`, `assertNotTruncated`; returns plain transcript text capped at 20,000 characters, `null` when the model returns nothing). `AcquireDeps` gains `transcribe?: (videoId: string) => Promise<string | null>`.
- Behaviour: used only when the caption run fails with a network failure or the web probe says unreachable; never when yt-dlp simply finds no captions. The item stays transcript-only (no mp4, no thumbnail from yt-dlp; the `i.ytimg.com` thumbnail still works).

- [ ] **Step 1:** Run the gate above. Write failing tests with a fake `transcribe`: a network-failed caption run uses it and returns its text; a successful run without captions does not call it; `YOUTUBE_GEMINI_FALLBACK=off` does not call it and throws `SourceUnavailableError`.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement the transcriber and wire it into `acquireYoutube`.
- [ ] **Step 4:** Run; expected PASS. Then run one real liked video through `acquire` and read the transcript.
- [ ] **Step 5:** Commit `feat(youtube): fall back to a Gemini transcript when youtube.com is unreachable`.

### Task 7: Setup guide, enablement and live acceptance

**Files:** Create `docs/youtube-setup.md`; add the new settings to `.env.example` if it exists. No new tests.

- [ ] **Step 1:** Write `docs/youtube-setup.md` in the style of `docs/piggyback-setup.md`: create the OAuth client (Desktop app), the three `.env` keys, `npm run youtube:auth` (expect Google's "unverified app" warning once), exporting cookies for Watch Later (`yt-dlp --cookies-from-browser chrome:<profile> --cookies <tmp>` then keep only Google and YouTube domains, `chmod 600`, set `YT_COOKIES_FILE`), `YOUTUBE_PROXY`, `youtube:doctor`, then `SOURCES=instagram,youtube`.
- [ ] **Step 2:** On a copy of live state: `SOURCES=instagram,youtube`, fake model, run all 21 steps with the real Data API; expected: at least 10 liked videos in `source_items.json`, `knowledge_base.json`, the dashboard data and the search index with source `youtube`.
- [ ] **Step 3:** Break one video on purpose (a fake `acquire` that throws a non-network error): expected `source_attempts.json` shows attempts 1 to 5, then `quarantined`, and no retry in the sixth run; a `SourceUnavailableError` run leaves attempts unchanged.
- [ ] **Step 4:** `npm run check:instagram -- <before> <after>` reports `ok: true`.
- [ ] **Step 5:** Commit `docs(youtube): add the setup guide`; open the PR and wait for explicit merge approval.

## Rollout

`SOURCES` stays `instagram` until you set it. After merge: dist-only deploy under both locks after a backup of `videos/`, then set `SOURCES=instagram,youtube` and watch the first scheduled run drain 25 items.
