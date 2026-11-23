# YouTube setup

Dopamine can ingest your liked videos, your Watch Later list and, if you list them, your
own playlists. Liked videos and playlists come through the YouTube Data API (read-only);
Watch Later is not in that API, so it is listed with `yt-dlp` and a cookie file.

## 1. Check what is missing

```bash
npm run build && npm run youtube:doctor
```

It prints one line per requirement and ends with `Ready` or the list of things to fix.
It changes nothing.

## 2. OAuth client (once)

In the Google Cloud console: create a project, enable **YouTube Data API v3**, set up the
consent screen (External, add yourself as a test user, add the scope
`https://www.googleapis.com/auth/youtube.readonly`), and create an OAuth client of type
**Desktop app**. Put its id and secret in `.env`:

```
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
```

## 3. Refresh token

```bash
npm run youtube:auth
```

Open the printed URL, approve read-only access (Google shows an "unverified app" warning
for your own app), and the command writes `YOUTUBE_REFRESH_TOKEN` to `.env`. You have five
minutes. While the consent screen is in **Testing**, Google expires this token after 7
days: run the command again when `npm run youtube:doctor` reports the refresh token as `rejected` (it asks Google), or publish the app
to production to stop that.

## 4. Watch Later cookies (optional)

```bash
umask 077; tmp=$(mktemp -d)
yt-dlp --cookies-from-browser chrome:Default --cookies "$tmp/all.txt" \
  --flat-playlist --simulate ":ytwatchlater"
# keep only Google and YouTube cookies; the full file holds every site's cookies
mkdir -p -m 700 ~/.dopamine-secrets
awk -F'\t' '/^# (Netscape )?HTTP Cookie File/ || $1 ~ /(youtube|google)\.com$/' "$tmp/all.txt" \
  > ~/.dopamine-secrets/youtube-cookies.txt
chmod 600 ~/.dopamine-secrets/youtube-cookies.txt; rm -r "$tmp"
```

Then set `YT_COOKIES_FILE=/Users/<you>/.dopamine-secrets/youtube-cookies.txt` in `.env`.
macOS may ask to let yt-dlp read "Chrome Safe Storage". The cookies are your Google login:
they are sent on one request per pipeline run, never logged, and Watch Later is skipped
with a clear line if the file is missing, readable by others, or stale ("the playlist does
not exist" from YouTube means stale; export again).

## 5. Playlists (optional)

`YOUTUBE_PLAYLIST_IDS=PLxxxx,PLyyyy` adds your own playlists.

## 6. Switch it on

```bash
npm run sources:preview        # how many items the first run would take; stores nothing
```

Then set `SOURCES=instagram,youtube`. Each run takes at most `SOURCE_MAX_NEW_PER_RUN`
(25) unfinished videos, newest first, so a long history drains over several runs.

## Troubleshooting

- **`youtube.com, default route: reset`** in the doctor: a VPN or firewall blocks YouTube.
  Set `DOPAMINE_EGRESS_INTERFACE=en0` (see `docs/piggyback-setup.md`).
- **`HTTP Error 403` on a video download**: `yt-dlp` is out of date. `pip install -U yt-dlp`.
- A video whose download fails because the network dropped is tried again on a later run.
  One whose download fails for another reason (no mp4 format) is analysed from its
  captions alone. A long video with no captions yet is rechecked after
  7 days.
- `SOURCE_SINCE` does not limit Watch Later: that list carries no publish dates, so all of
  it is ingested, 25 per run.
- A premiere or live stream that has not aired, and a video that was deleted or made
  private, count as "nothing to analyse": rechecked weekly, then set aside.

## Music

Liked music is left out: a video in YouTube's Music category, or from an auto-generated
"Artist - Topic" channel, is not collected. Set `YOUTUBE_INCLUDE_MUSIC=1` to keep it.
