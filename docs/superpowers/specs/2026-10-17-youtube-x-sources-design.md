# YouTube and X sources — design

Date: 2026-10-17. Status: read by a fresh reviewer, Sachin's decisions recorded,
awaiting his approval. Nothing here is built.

## Intent

Dopamine only ingests Instagram saves (about 700 videos). Sachin is not getting
enough value from it and wants it to ingest from more places, starting with
**YouTube** and **X (Twitter)**, so that what he saves, likes and bookmarks on
those platforms lands in the same knowledge base, triage, search and dashboard
as his Instagram saves.

Success looks like this:

- A YouTube liked video, a video in a chosen playlist, and an X bookmark each
  appear in the dashboard and in search with a source badge, having gone through
  all 21 pipeline steps with no manual step.
- A download that fails once is retried on the next run instead of being lost.
- The existing Instagram records are untouched.
- The X capture can fail (logged out, challenged, X changes its page) without
  hurting the pipeline run, and he is told within the day.

## Decisions made by Sachin

- YouTube and X are designed together, shared groundwork first.
- X is read through a **logged-in browser session**, not the paid X API. He was
  told this goes against X's terms and puts the account at some risk, and chose
  it anyway.
- **History:** when a source is first switched on, ingest everything, drained
  gradually (25 items per source per run, newest first).
- **YouTube feeds:** liked videos and Watch Later are on by default; his own
  playlists are an opt-in.
- **X feeds:** bookmarks only; likes are an opt-in setting.
- **If X blocks the headless profile** and a headed run does not help: run a
  visible Chrome window at the scheduled time rather than stop.

Everything else below is **my call** unless it says otherwise.

## Current state (checked in the code at commit e11f512)

- `SourceCollector` (`src/sources/types.ts`) has `collect()` and `acquire()`.
  Instagram and YouTube implement it; `src/sources/registry.ts` maps
  `SourceKind` to a factory, so adding a kind without a factory fails to compile.
- **YouTube is built but off.** `src/sources/youtube/` lists *liked* videos
  through the Data API (OAuth, `youtube.readonly`), fetches English captions with
  `yt-dlp`, and downloads the mp4 only for videos of 300 s or less (longer ones
  are transcript-only). Tests exist. The live `.env` has no `SOURCES` line
  (default `instagram`) and no `YOUTUBE_*` credentials, and no YouTube state
  exists on this machine.
- **Three defects in that code**, found by reading, not by running:
  1. `youtube:auth` uses the `urn:ietf:wg:oauth:2.0:oob` redirect
     (`src/sources/youtube/auth.ts:19`), which Google retired in 2023.
  2. `collect()` records an id as known before `acquire()` runs
     (`collector.ts:79`) and returns only the new ones. A failed `yt-dlp` run
     drops that video forever. Instagram avoids this by returning its whole
     incoming batch every run and letting every downstream step skip what is
     already done.
  3. Collected items live only in memory (`runner.ts:133-136`). `ingestMetadata`
     (`src/pipeline/ingest.ts`) accepts only Instagram-shaped entries and
     silently drops anything else, so nothing writes YouTube items to
     `metadata.json`. Triage, Markdown, Catalog and the dashboard builder read
     that file.
- `runPropertiesAgent` finds videos by scanning `videos/`. YouTube mp4s go to
  `videos/youtube/`, so they would never get duration, resolution or thumbnails.
- Instagram already has a separate scheduled job for the fragile browser part
  (`src/pipeline/piggyback/harvester.ts`): a headless Chrome on a dedicated
  profile (`~/.dopamine-ig-profile`, one-time manual login) that only *observes*
  the responses Instagram's own web page fetches, over CDP. Retries, failure
  alerts (`scripts/notify-failure.sh`), a launchd template
  (`deploy/launchd/com.dopamine.piggyback.plist`) and a setup doc
  (`docs/piggyback-setup.md`) exist and should be reused.
- `ContentType` is `short_video | long_video`, with a comment reserving
  `text_post | image_post | article_link` (`src/types/index.ts:67`).

## Goals

1. YouTube: liked videos (existing) and Watch Later by default, and his own
   playlists as an opt-in, end to end.
2. X: bookmarks end to end, with the post text, quoted post, links, images and
   video; likes as an opt-in second feed.
3. Groundwork shared by both so a third source (Reddit, Telegram) is a small
   addition.

## Non-goals

- Monitoring other people's accounts, searching, or following creators.
- Any write action on either platform.
- TikTok, LinkedIn, Reddit, Telegram: separate designs.
- Replacing or changing the Instagram path.
- Merging the same content seen on two platforms.
- Thread expansion, multi-image vision, and a no-captions fallback for YouTube
  in the first release (see Later).

## Anti-goals (a failure even if it technically works)

- Anything that could get the X account restricted: write actions, high request
  rates, several sessions at once, stealth or fingerprint tricks, proxies, or
  solving challenges automatically.
- Losing an item without a trace.
- Changing the shape of `metadata.json` or any of the existing Instagram records.
- Committing scraped content, session files, cookies or tokens. Test fixtures are
  synthetic.

## Design

### 1. Shared groundwork (first)

**1.1 Store for non-Instagram items.** A new `videos/source_items.json`
(`Record<id, SourceItem>`) written by `ingestSourceItems()`, which mirrors
`ingestMetadata` (union, idempotent, injectable path). `metadata.json` keeps its
Instagram shape so the existing records and consumers do not change. A single
`loadItemIndex()` helper merges both for the places that look an item up by id:
`catalog.ts` (already maps both shapes through `asSourceItem`), `triage.ts`,
`markdown.ts`, `classifier.ts` and `dashboard/data-builder.ts`.

**1.2 Return every unfinished item; keep a failure ledger (YouTube and X only).**
- *Done* means the item has a `knowledge_base.json` entry without an error, the
  same test the knowledge step uses to skip. A collector returns every item it
  knows that is not done and not quarantined, the way Instagram returns its
  batch; downstream resume logic makes redelivery harmless. `acquire()` is
  idempotent and checks for files already on disk (captions, mp4) before
  downloading, so an item that fails at a later step is cheap to redo.
- `youtube_known_ids.json` is replaced by `videos/source_attempts.json`, a ledger
  `{id: {state, attempts, last_error, last_attempt}}` written through a shared
  helper (`src/sources/attempts.ts`), not by `acquireAll`. `acquireAll`
  (`src/pipeline/lanes.ts`) gains an optional `onFailure(item, err)` callback
  that the runner wires to the ledger for non-Instagram items only. Instagram is
  unchanged: its `null` ("mp4 not on disk yet") stays a silent skip and is never
  counted.
- Outcomes for YouTube and X. A thrown error is a **failure** and counts toward
  the limit; after 5 the item is quarantined for 30 days and logged (reusing the
  TTL and per-run cap gate, `makeRefreshGate`). An item that acquires but has
  nothing to analyse (a long video with no captions, a post with no text and no
  media) returns `null` and is recorded as **empty**: rechecked after 7 days, up
  to 4 times, because auto-captions often appear hours later, then quarantined.
  Empty items never go through the model.

**1.3 Items without a video.** Add `text_post` to `ContentType`. `acquire()` may
return no video and no thumbnail with transcript text, as long YouTube videos
already do. `runPropertiesAgent` also takes lane video paths (so YouTube mp4s get
properties) and skips items without one. The catalog already defaults
`content_type` to `short_video`; it must read the real value. A YouTube or X
card in the dashboard must show a thumbnail (written to the thumbnails directory
under the item id stem so the existing path rule works, or a neutral placeholder
when there is none), the title, the author (channel or `@handle`), a source
badge, an "open original" link to the watch or post URL, and an inline player
only when a local mp4 exists (`hasVideo`, already in the data). `organizer.ts`
skips non-Instagram items so no broken symlinks are made into the Instagram
folders. The search index gains a source facet.

**1.4 Source health.** Each source records its last successful capture in
`videos/source_health.json`; the existing failure alert channel is used when a
source has been failing for more than 24 hours.

**1.5 Draining a backlog.** Enabling a source can surface thousands of old items.
Each collector returns at most `SOURCE_MAX_NEW_PER_RUN` (default 25) not-yet-done
items per run, newest first, so a backlog drains over successive runs (four a
day) without stretching any one run, and the log says how many remain. An
optional `SOURCE_SINCE` date limits how far back to go. A count of what would be
ingested is printed before the first live run.

**1.6 Who writes which file.** Only the pipeline, under `.locks/pipeline`, writes
`source_items.json`, `source_attempts.json` and `source_health.json`. The X
harvester never touches them: it writes `videos/x_incoming.json` and
`videos/x_harvest_status.json`, each atomically (temp file, then rename) through
a small `writeJsonAtomic` helper, and `XCollector.collect()` ingests the incoming
file into the store, as Instagram does with `metadata_incoming`. The harvester
takes its own lock, `.locks/xharvest`, so two X runs cannot overlap. `saveState`
and the existing files are unchanged.

### 2. YouTube

- **Login:** replace the out-of-band flow with the loopback redirect
  (`http://127.0.0.1:<random port>`); scope stays `youtube.readonly`.
- **Feeds, on by default:** liked videos (existing, official API) and Watch Later.
  The Data API does not list Watch Later, so it goes through `yt-dlp` with a
  cookie file (`YT_COOKIES_FILE`, outside the repo, mode 600, never logged),
  exported once with `yt-dlp --cookies-from-browser chrome --cookies <file>`. His
  Google login cookies can get the account throttled, so exposure is kept small:
  cookies are sent only on the single request that lists Watch Later, at most
  once per pipeline run; fetching the videos themselves uses no cookies, except as
  a fallback for an age-restricted video. If `YT_COOKIES_FILE` is unset or the
  cookies have expired, Watch Later is skipped with a clear log line and the other
  feeds still run; the plan documents the re-export.
- **Opt-in feed:** his own playlists through `playlistItems.list`, listed in
  `YOUTUBE_PLAYLIST_IDS` (empty by default).
- **Acquire:** unchanged (captions, plus the mp4 at 300 s or less), but a failed
  mp4 download must not discard captions already fetched.
- **Enabling:** the user sets `SOURCES=instagram,youtube` and the three
  `YOUTUBE_*` variables after running `npm run youtube:auth` once.

### 3. X

**3.0 Spike first, with a go/no-go gate.** Nothing about X has been run against
the live site, and the GraphQL names below are from memory. Before the X PR is
planned in detail, a throwaway spike logs in once on the dedicated profile and
captures a few bookmarks headless. If X blocks the headless profile, the spike
may try one headed run to see whether the block is about headless alone. If X
still challenges it, the X slice stops there and reports; no workaround is
attempted (see anti-goals). If a headed run works where headless does not, the
harvester runs headed (`X_HARVEST_HEADED=1`), opening a visible Chrome window at
the scheduled time; the spike also checks that this works from a launchd agent
and when the screen is locked. If it does not, the X slice stops and is reported.

**3.1 Shape.** A separate scheduled harvester, built like the Instagram one, and
an `XCollector` in `src/sources/x/` that only reads what the harvester stored.
The fragile browser work never runs inside the pipeline or under its locks.

**3.2 Session.** A dedicated Chrome profile `~/.dopamine-x-profile`, DevTools
port 9456, headless, launched through the existing `launchChrome`. He logs in
once by hand (including any 2FA), exactly as for Instagram. The profile lives
outside the repo with mode 700.

**3.3 Capture.** Open `https://x.com/i/bookmarks` and read the GraphQL responses
the page itself fetches over CDP (the `Bookmarks` operation, as I remember it;
likes use `Likes`). We observe; we do not call X's endpoints ourselves and we do
not scrape the page layout. The capture keeps: post id, author handle and name,
created time, the full text (long posts arrive in a separate `note_tweet` field),
expanded link URLs, photo URLs, the best mp4 variant for video, and the quoted
post. Bookmarks come newest first, so an incremental run stops after a run of
already-stored ids. Depth per run is `X_HARVEST_SCROLLS` (default 40); a deeper
backfill is the same command with a larger value, self-limiting at the end of the
feed. Response shapes are parsed tolerantly and a contract test with a synthetic
fixture guards them.

**3.4 Safety rails.**
- Read only: no click on like, bookmark, follow or any other control.
- One run at a time (`.locks/xharvest`), once a day at 06:00 IST by default;
  each of the pipeline's four daily runs ingests whatever the harvester last
  wrote, so the 06:30 run picks up the morning harvest. Scroll pauses of 2 to
  4.5 s with jitter.
- Stop at once on a login wall, a challenge or "unusual activity" page, or an
  HTTP 429: exit with a distinct code (3), write a cool-off marker, alert, and do
  not retry for 24 hours. Other failures retry up to 3 times, 60 s apart, like
  Instagram.
- Fail loudly if the page shows posts but zero were parsed (X changed its
  format), instead of reporting an empty success.
- No stealth plugins, fingerprint patching, proxies or captcha solving.

**3.5 Collector.** `collect()` returns stored X items that are not yet in the
knowledge base and not quarantined (section 1.2). Item mapping: id `x_<tweetId>`;
`content_type` `text_post`, or `short_video` when the post has video; title is
the first line (120 characters); author is `@handle`; `caption_text` the full
text; `url` the post URL.

**3.6 Acquire.** Transcript text is the post, then the quoted post, then the
list of expanded link URLs (so the existing link steps see them). The first photo
becomes the thumbnail. A video post uses the mp4 variant captured in-session; if
that fails, `yt-dlp` on the post URL; if that also fails the item still proceeds
as text with a note.

### 4. Configuration and files

New settings: `SOURCES` (existing), `YOUTUBE_PLAYLIST_IDS`, `YT_COOKIES_FILE`,
`SOURCE_MAX_NEW_PER_RUN`, `SOURCE_SINCE`, `X_HARVEST_SCROLLS`, `X_HARVEST_PORT`,
`X_PROFILE_DIR`, `X_HARVEST_HEADED`, `X_FEEDS` (`bookmarks` by default, or
`bookmarks,likes`). New state: `videos/source_items.json`,
`videos/source_attempts.json`, `videos/source_health.json`, `videos/x/` for
downloaded media. New launchd template `deploy/launchd/com.dopamine.x-harvest.plist`
and `docs/x-harvest-setup.md`.

### 5. Testing and acceptance

- Unit tests per module, including a synthetic X response fixture and a registry
  test that fails when a `SourceKind` has no factory.
- Dry run on a copy of the live state with a fake model, as was done for the link
  changes: a synthetic YouTube item and X item pass all 21 steps.
- **The Instagram invariant.** For every key that exists before the change, the
  records in `metadata.json`, `classifications.json`, `knowledge_base.json`,
  `links_v2.json` and `triage.json` are byte-identical afterwards, compared per
  key because new keys appear. Derived outputs (catalog, dashboard data, search
  index) may gain a `source` value and facet; for Instagram it is derived at read
  time from the `.mp4` id and the `ig` field and never written into the frozen
  files.
- YouTube live: at least 10 liked videos reach the dashboard and search; a
  deliberately failing video is retried next run and quarantined after 5 failures.
- X live: the harvest count matches the number shown on the bookmarks page; a
  second run adds zero; logging out produces the alert and exit code 3 with no
  retry.

### 6. Rollout

Behind `SOURCES`; the X job is a launchd template that stays unloaded until the
one-time login is done. Deployed with the same dist-only swap under the pipeline
and piggyback locks, after a backup of `videos/`. Order: groundwork, YouTube,
then X, each its own PR.

## Left to the builder

Exact GraphQL field paths (verify against the live page), the dashboard badge
and filter styling, how `loadItemIndex()` is threaded through each consumer, and
the retry back-off between the 5 failures.

## Later

Self-thread expansion (each thread costs a page load, so it needs a daily
budget); up to four images per post sent to the model; a no-captions fallback for
YouTube by passing the video URL to Gemini; likes as a default feed; collapsing
duplicates across platforms.

## Still needed from Sachin (during the build, not before)

- A Google OAuth client of type "Desktop app" for the live YouTube run. The plan
  will include the steps to create one.
- A one-time export of his Google cookies to `YT_COOKIES_FILE`, and a one-time
  manual login to X on the dedicated profile.

Assumed, not asked: the X account is the one that holds his bookmarks (his
primary account).
