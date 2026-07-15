# Piggyback harvester — setup

The piggyback harvester opens your Instagram saved page in a headless Chrome
(logged in on a dedicated profile) and reads the saved-feed responses
Instagram's own web client fetches — so it issues **zero** API calls of its own
and sidesteps the private-API soft-block. It's the block-resistant primary
capture path; the incremental instagrapi collector remains as a fallback.

## One-time setup

1. **Create the dedicated Chrome profile and log into Instagram once (headed):**

   ```
   open -a "Google Chrome" --args --user-data-dir="$HOME/.dopamine-ig-profile" https://www.instagram.com/
   ```

   Log in fully (complete any 2FA / "save login info"), confirm you can open
   your Saved page, then **quit that Chrome window**. The session cookie now
   lives in `~/.dopamine-ig-profile` and the headless harvester reuses it.

2. **Smoke-test the harvester once, headless** (reads `INSTAGRAM_USERNAME` from `.env`):

   ```
   npm run build && node dist/pipeline/piggyback/harvester.js
   ```

   Expect `captured N saved item(s)` and `downloaded M mp4(s)`. If you instead
   see `NOT LOGGED IN`, repeat step 1 (the session expired).

3. **Install the schedule** — copy the template, fill the placeholders, bootstrap:

   ```
   cp deploy/launchd/com.dopamine.piggyback.plist ~/Library/LaunchAgents/
   # edit ~/Library/LaunchAgents/com.dopamine.piggyback.plist and replace:
   #   REPLACE_WITH_PROJECT_DIR  → absolute path to this repo
   #   REPLACE_WITH_HOME         → your $HOME
   # INSTAGRAM_USERNAME is NOT set in the plist — the harvester reads it from .env
   # (via dotenv). Make sure .env's INSTAGRAM_USERNAME is the saved-scraping account,
   # not your personal handle, so the launchd job can't drift from the rest of the pipeline.
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dopamine.piggyback.plist
   ```

4. **Switch the pipeline to consume the harvest** — add `IG_COLLECTOR=piggyback`
   to `com.dopamine.pipeline.plist`'s `EnvironmentVariables` so its collect step
   ingests the harvested batch instead of re-hitting instagrapi.

## Cadence

Harvester runs **daily at 8:00**, the pipeline **8:30** — the 30-minute gap lets
captured items be ingested + downloaded before the pipeline builds. Daily (vs
weekly) means a missed or failed run costs at most a day.

`run-piggyback.sh` **retries up to 3 times** (60s apart) if the harvester exits
non-zero — a 0-capture (feed never loaded) or not-logged-in — so a transient slow
render self-heals within the slot instead of waiting for tomorrow.

## Run on demand

Don't want to wait for the 8:00 slot, or recovering from a failed auto-run? Run
the whole flow — harvest, then the full pipeline (enrich + dashboard) — manually:

```
bash scripts/run-now.sh
```

Safe to run anytime; the harvest and metadata ingest are idempotent.

## Failure alerts

When a scheduled harvest fails all retries (or the pipeline hard-fails), the
launcher calls `scripts/notify-failure.sh`, which:

1. appends to `logs/piggyback-failures.log` (always — durable + greppable);
2. posts a macOS desktop notification (best-effort; launchd may suppress it);
3. if `PIGGYBACK_ALERT_WEBHOOK` is set in `.env`, POSTs a Slack-compatible
   `{"text": …}` payload to it — the reliable channel when you're away from the
   machine. Any Slack incoming-webhook URL works.

So even with daily runs, a genuine outage surfaces immediately instead of going
unnoticed for days.

## Maintenance

The only recurring manual task is re-running step 1 when the harvester logs
`NOT LOGGED IN` (typically weeks apart). To bypass the browser path entirely,
set `IG_COLLECTOR=instagrapi` (now incremental, low-volume) or `gallerydl`.

## Environment knobs

| Var | Default | Meaning |
|-----|---------|---------|
| `IG_PIGGYBACK_PROFILE_DIR` | `~/.dopamine-ig-profile` | Chrome profile with the IG session |
| `IG_PIGGYBACK_PORT` | `9455` | CDP remote-debugging port |
| `IG_PIGGYBACK_SCROLLS` | `4` | saved-page scrolls (more = deeper backfill) |
| `IG_PIGGYBACK_INITIAL_MS` | `6000` | wait after navigate before scrolling — raise if a scheduled/headless run captures 0 (launchd's Chrome renders the feed slower than interactive) |
| `IG_PIGGYBACK_SCROLL_MS` | `2200` | pause between scrolls |
| `IG_PIGGYBACK_SETTLE_MS` | `3000` | wait after the last scroll for in-flight responses to settle |
| `IG_PIGGYBACK_CHROME` | macOS Chrome path | Chrome binary override |
