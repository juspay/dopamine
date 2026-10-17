# X Harvester Implementation Plan (provisional until the spike says GO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session once it is final. Steps use checkbox (`- [ ]`) syntax.

**Status:** Outline only. Do not start until `2026-10-18-x-spike-findings.md` records GO. Tasks 2 and 3 get their exact field paths and fixtures from that document, and the settings in Task 3 get their final values from it. On NO-GO this plan is deleted.

**Goal:** Capture the user's X bookmarks daily from a logged-in Chrome profile, and flow them through the pipeline as `x` items.

**Architecture:** A separate scheduled harvester (its own lock and launchd job, built like the Instagram piggyback) observes the bookmark GraphQL responses and writes `videos/x_incoming.json` and `videos/x_harvest_status.json` atomically. An `XCollector` in `src/sources/x/` reads only those files; the pipeline never drives Chrome.

**Spec:** `docs/superpowers/specs/2026-10-17-youtube-x-sources-design.md` sections 3 and 4. **Requires** the groundwork plan merged.

**Branch:** `workforge create -t feat -n x-harvester -y`, base `main` after the groundwork merges.

## Global Constraints

- Read only; once a day at 06:00 IST by default; scroll pauses of 2 to 4.5 s with jitter; one run at a time through `.locks/xharvest`.
- Stop at once on a login wall, challenge, "unusual activity" or HTTP 429: exit code `3`, write a cool-off marker, alert, no retry for 24 hours. Other failures retry up to 3 times, 60 s apart.
- Fail loudly when the page shows posts but zero were parsed (X changed its format).
- Settings: `X_HARVEST_SCROLLS` (40), `X_HARVEST_PORT` (9456), `X_PROFILE_DIR` (`~/.dopamine-x-profile`, mode 700), `X_HARVEST_HEADED` (off), `X_FEEDS` (`bookmarks`; `bookmarks,likes` opt-in).
- The harvester never writes `source_items.json`, `source_attempts.json` or `source_health.json`; only the pipeline does.
- No stealth, fingerprint patching, proxies or captcha solving. No scraped content, session files or cookies in the repo; fixtures are synthetic.
- Item mapping: id `x_<tweetId>`; `content_type` `text_post`, or `short_video` when the post has video; title is the first line (120 characters); author `@handle`; `caption_text` the full text; `url` the post URL.

## Tasks (to be expanded to test-first steps after the spike)

1. **Add `"x"` to `SOURCE_KINDS`** (`src/types/index.ts`), a factory in `SOURCE_FACTORIES`, and `CONFIG.X_*` keys. The registry test from groundwork Task 1 must pass.
2. **Parser.** `src/sources/x/parse.ts`: `export interface XPost { id: string; handle: string; name: string; createdAt: string | null; text: string; links: string[]; photos: string[]; videoUrl: string | null; quoted: XPost | null }` and `parseBookmarksResponse(body: unknown): { posts: XPost[]; bottomCursor: string | null; unparsed: number }`, tolerant of wrappers (`TweetWithVisibilityResults`, tombstones, empty results, `note_tweet`). Tests use the spike's synthetic fixtures; one test asserts `unparsed > 0` with zero posts raises the fail-loudly path.
3. **Harvester.** `src/pipeline/x-harvest/harvester.ts`, a `launchChrome` option for headed mode (`launchChrome(port, profileDir, { headed?: boolean })`, default unchanged), the capture loop with the safety rails above, incremental stop after a run of already-stored ids, `writeJsonAtomic` outputs, exit code 3 and the cool-off marker. Tests drive the loop with a fake CDP client: login-wall stops with code 3 and no retry; 429 stops; zero-parsed fails loudly; incremental stop; a second run adds zero.
4. **Collector and acquire.** `src/sources/x/collector.ts`: `collect()` ingests `x_incoming.json` into the store and returns stored `x` items not done and not quarantined; `acquire()` builds the transcript from the post, then the quoted post, then the expanded link list; the first photo becomes the thumbnail at `videos/thumbnails/<item.id>.jpg`; a video post uses the captured mp4, then `yt-dlp` on the post URL, then proceeds as text with a note; `null` when there is no text and no media. A text-only post flows as `text_post` (confirm the classifier, knowledge and link steps accept `videoPath: null`, the YouTube long-video path already does). Extend `localVideoPath` (`src/sources/paths.ts`) for `x` with `videos/x/<tweetId>.mp4`.
5. **Scheduling and setup.** `scripts/run-x-harvest.sh` (lock, retries, `notify-failure.sh`, modelled on `scripts/run-piggyback.sh`), `deploy/launchd/com.dopamine.x-harvest.plist` (template, stays unloaded), `docs/x-harvest-setup.md` (one-time login on the profile, smoke test, loading the job, the cool-off marker, headed mode if the spike chose it).
6. **Dashboard.** X badge and the "Open original" link already exist from the groundwork; verify a text-post card renders with the placeholder thumbnail and no player.
7. **Acceptance (live, from the design).** The harvest count matches the bookmarks page; a second run adds zero; logging out produces the alert and exit code 3 with no retry; `npm run check:instagram -- <before> <after>` is `ok: true`.

## Rollout

Dist-only deploy under both locks after a backup of `videos/`. The launchd job is loaded by Sachin after the one-time login, and `SOURCES=instagram,youtube,x` is set only then.
