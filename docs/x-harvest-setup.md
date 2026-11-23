# X bookmarks harvester

Dopamine can ingest the posts you bookmark on X. A separate scheduled job opens your
bookmarks page once a day in a Chrome profile that is already logged in, and reads the
responses X's own page fetches. It requests nothing itself and has no way to click: it
cannot like, follow, post or un-bookmark. The pipeline never drives the browser; it reads
the file the harvester leaves (`videos/x_incoming.json`).

**Know what this is.** Reading X through a logged-in browser is against X's terms, and X can
limit or suspend an account for it. The job is built to be quiet (once a day, slow scrolls,
read-only) and to stop the moment X objects, not to hide.

## One-time setup

1. Log in on a dedicated profile (not your everyday one):

   ```bash
   open -na "Google Chrome" --args --user-data-dir="$HOME/.dopamine-x-profile" https://x.com/i/flow/login
   ```

   Sign in, open Bookmarks, check your posts are there, then **quit that Chrome window**:
   a profile can be open in only one Chrome. If a VPN blocks x.com, start
   `npm run egress:proxy` in another terminal first and add
   `--proxy-server=http://127.0.0.1:9460` to the command (see `docs/piggyback-setup.md`).

2. Try one capture by hand:

   ```bash
   npm run build && npm run x:harvest
   ```

   Expect `captured N bookmark(s) ... N new`. A second run should say `0 new`.

3. Schedule it: copy `deploy/launchd/com.dopamine.x-harvest.plist` to
   `~/Library/LaunchAgents/`, replace the two `REPLACE_WITH_*` placeholders, then

   ```bash
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dopamine.x-harvest.plist
   ```

4. Add `x` to `SOURCES` in `.env`, for example `SOURCES=instagram,youtube,x`.

## What it does when X objects

The rule is one visit to X per day, and never a retry of a refusal.

| What happens | Exit code | What the job does |
|---|---|---|
| A login page, a "confirm it's you" or "unusual activity" page, a locked or suspended notice, HTTP 401/403/429 or any error on the bookmarks request, or an error body | 3 | Stops at once, keeps any bookmarks already read, records a cool-off of about a day (23 hours) in `videos/x_harvest_status.json`, alerts once. Not retried. |
| The page never fetches its bookmarks (a sign-in prompt without a redirect, an error page) | 4 | Nothing is scrolled. Alerts once. Not retried; the next day's run tries again. |
| The answer is not a timeline this code knows, or posts are listed but none can be read (X changed its format) | 4 | Fails with "response format has probably changed" instead of reporting an empty success. Not retried. |
| Chrome or its DevTools port did not start | 5 | Nothing reached X, so this alone is retried, up to 3 times, 60 s apart. |

The words on the page are only checked for a challenge while no bookmarks have arrived, so a
bookmarked post that mentions a "locked account" does not stop the job.

After an exit code 3, open the profile by hand (step 1) to see what X wants. To run again
before the cool-off ends, delete `videos/x_harvest_status.json` and `.locks/xharvest-cooloff`;
do that only once you have dealt with whatever X asked for.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `X_PROFILE_DIR` | `~/.dopamine-x-profile` | Chrome profile holding the X login |
| `X_HARVEST_PORT` | `9456` | DevTools port for this job's Chrome |
| `X_HARVEST_SCROLLS` | `40` | Most scrolls per run (0 to 100). It stops earlier at the end of the feed. Until one run has reached the end, every run scrolls to this limit, and the log says older bookmarks are still to come; after that, a run stops once it sees 20 posts in a row it already has |
| `X_HARVEST_HEADLESS` | off | By default a Chrome window opens for about 20 seconds while the job runs. `1` runs with no window, but headless Chrome names itself `HeadlessChrome` to X, which a normal sign-in never does |
| `DOPAMINE_EGRESS_INTERFACE` | unset | Send all HTTPS traffic, the browser included, out through this interface when a VPN blocks x.com |

## What ends up in Dopamine

Each bookmark becomes an item `x_<post id>`: the post's text (the full text of a long
post), the post it quotes, and its links go to the model as the transcript. The first photo
becomes the thumbnail. A video is downloaded from the link captured in the session, then
with `yt-dlp` if that link has expired; if neither works the post is still analysed as text.
Shortened `t.co` links in the text are replaced with where they go. A post with no text
and no video (a photo on its own) is skipped. Likes are not captured. The capture file keeps
posts you later un-bookmark.

## Limits found when this was built

Checked against the live site on 2026-11-20 with an account holding 8 bookmarks: three
headless runs, no challenge. The default was then changed to a visible window, which had
not yet been run against X when this was written. Not exercised: a feed long enough to paginate,
deleted or restricted posts, and X's own cap on how far back bookmarks go. X moves the tab
to `/i/history`; the capture keys on the `Bookmarks` request, not on the address.
