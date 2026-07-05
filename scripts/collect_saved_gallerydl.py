#!/usr/bin/env python3
"""Fallback saved-posts collector using gallery-dl instead of instagrapi.

WHY THIS EXISTS
---------------
instagrapi logs in with the account's credentials and emulates the Instagram
*mobile private API*. At production cadence that request signature is prone to
soft-blocks (feed/saved/posts stalls for hours). gallery-dl instead authenticates
via *exported browser cookies* and hits the web endpoints — a materially different
access path that may not be throttled at the same time. This script is a drop-in
alternative for the collect_metadata.py + download_videos.py pair.

It downloads saved videos into videos/<username>_saved/<username>_<pk>.mp4 and
writes videos/metadata.json in the same MetadataEntry shape the TypeScript
pipeline consumes (src/types/index.ts), so nothing downstream changes.

SELECTION
---------
Set IG_COLLECTOR=gallerydl — the pipeline's collector.ts runs this script instead
of the instagrapi pair.

AUTH (one of)
-------------
  IG_COOKIES_FROM_BROWSER=chrome        # or firefox / safari / edge / brave ...
  IG_COOKIES_FILE=/path/to/cookies.txt  # Netscape cookies.txt export

OPTIONAL
--------
  IG_SAVED_COLLECTIONS="Hhhh/18108476032316846,Chutiya/18015476110044023"
      gallery-dl's /saved/all-posts covers only *uncategorized* saves (same limit
      as instagrapi's feed/saved/posts). Add named collections as "Name/ID" pairs
      (or full .../saved/Name/ID URLs) to fetch those too.
  IG_GDL_SLEEP="3.0-7.0"       # --sleep-request range (seconds)
  IG_GDL_TIMEOUT_SEC=2400      # hard cap for the whole gallery-dl run
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(line_buffering=True)

USERNAME = os.environ["INSTAGRAM_USERNAME"]
ROOT = "https://www.instagram.com"
SAVED_DIR = Path("./videos") / f"{USERNAME}_saved"
METADATA_FILE = Path("./videos/metadata.json")
KNOWN_PKS_FILE = Path("./videos/known_pks.json")


# ---------------------------------------------------------------------------
# Pure helpers (unit-testable without gallery-dl or the network)
# ---------------------------------------------------------------------------

def gdl_date_to_iso(value):
    """Normalise gallery-dl's date ('YYYY-MM-DD HH:MM:SS', assumed UTC) to ISO."""
    if not value or not isinstance(value, str):
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    return value  # already ISO-ish — pass through


def sidecar_to_entry(gdl):
    """Map one gallery-dl metadata dict to the pipeline's MetadataEntry shape."""
    pk = str(gdl.get("post_id") or gdl.get("media_id") or "").strip()
    return {
        "pk": pk,
        "code": gdl.get("post_shortcode") or gdl.get("shortcode") or "",
        "media_type": 2 if gdl.get("video_url") else 1,
        "taken_at": gdl_date_to_iso(gdl.get("date") or gdl.get("post_date")),
        "caption_text": gdl.get("description"),
        "username": gdl.get("username"),
        "full_name": gdl.get("fullname"),
        "location": None,
        "like_count": gdl.get("likes", 0) or 0,
        "comment_count": 0,
        "video_url": gdl.get("video_url"),
        "thumbnail_url": gdl.get("display_url"),
        "resources": [],
    }


def build_saved_urls():
    """The saved 'All posts' URL plus any named collections from env."""
    urls = [f"{ROOT}/{USERNAME}/saved/all-posts/"]
    raw = os.environ.get("IG_SAVED_COLLECTIONS", "").strip()
    for part in (p.strip() for p in raw.split(",") if p.strip()):
        urls.append(part if part.startswith("http") else f"{ROOT}/{USERNAME}/saved/{part}/")
    return urls


# ---------------------------------------------------------------------------
# gallery-dl invocation
# ---------------------------------------------------------------------------

def _cookie_args():
    if os.environ.get("IG_COOKIES_FILE"):
        return ["--cookies", os.environ["IG_COOKIES_FILE"]]
    browser = os.environ.get("IG_COOKIES_FROM_BROWSER")
    if browser:
        return ["--cookies-from-browser", browser]
    print(
        "[gdl] ERROR: the gallery-dl collector needs browser cookies.\n"
        "  Set one of:\n"
        "    IG_COOKIES_FROM_BROWSER=chrome   (or firefox / safari / edge / brave)\n"
        "    IG_COOKIES_FILE=/path/to/cookies.txt  (Netscape format)\n",
        flush=True,
    )
    raise SystemExit(1)


def _run_gallerydl(urls):
    argv = [
        "gallery-dl",
        *_cookie_args(),
        "--directory", str(SAVED_DIR),                      # flat output dir
        "--filename", "{username}_{post_id}.{extension}",   # matches the pipeline's id
        "--write-metadata",                                 # one <file>.json sidecar per file
        "--filter", "video_url",                            # videos only — skip image posts
        "--sleep-request", os.environ.get("IG_GDL_SLEEP", "3.0-7.0"),
        "--retries", "3",
        "-o", "extractor.instagram.videos=true",
        *urls,
    ]
    timeout = int(os.environ.get("IG_GDL_TIMEOUT_SEC", "2400"))
    print(f"[gdl] running gallery-dl over {len(urls)} saved URL(s), timeout {timeout}s …", flush=True)
    try:
        return subprocess.run(argv, cwd=os.getcwd(), timeout=timeout).returncode
    except subprocess.TimeoutExpired:
        print(
            f"\n[gdl] WATCHDOG: gallery-dl exceeded {timeout}s and was killed.\n"
            "  Likely an Instagram rate-limit/soft-block. Refresh your browser cookies\n"
            "  (log in at instagram.com), wait, and retry.\n",
            flush=True,
        )
        raise SystemExit(1)
    except FileNotFoundError:
        print(
            "[gdl] ERROR: gallery-dl is not installed.\n"
            "  pip install -r scripts/requirements.txt\n",
            flush=True,
        )
        raise SystemExit(1)


def _build_metadata_from_sidecars():
    """Read gallery-dl's <file>.json sidecars into deduplicated MetadataEntry list."""
    by_pk = {}
    for sidecar in sorted(SAVED_DIR.glob("*.mp4.json")):
        try:
            gdl = json.loads(sidecar.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        entry = sidecar_to_entry(gdl)
        if entry["pk"]:
            by_pk.setdefault(entry["pk"], entry)
    return by_pk


def collect():
    SAVED_DIR.mkdir(parents=True, exist_ok=True)
    urls = build_saved_urls()
    print(f"Fetching saved posts via gallery-dl ({len(urls)} URL(s))...", flush=True)

    rc = _run_gallerydl(urls)
    # gallery-dl exit codes: 0 = ok, 4 = some individual downloads failed (non-fatal).
    if rc not in (0, 4):
        print(f"[gdl] gallery-dl exited {rc} — treating as failure.", flush=True)
        raise SystemExit(rc or 1)

    by_pk = _build_metadata_from_sidecars()
    entries = list(by_pk.values())
    videos = [e for e in entries if e["media_type"] == 2]
    print(f"Found {len(entries)} saved post(s) ({len(videos)} video(s)).", flush=True)

    METADATA_FILE.write_text(
        json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Saved metadata to {METADATA_FILE}", flush=True)

    # Union into the known_pks ledger so instagrapi runs stay in sync.
    known = set()
    if KNOWN_PKS_FILE.exists():
        try:
            known = {str(x) for x in json.loads(KNOWN_PKS_FILE.read_text())}
        except (OSError, json.JSONDecodeError):
            known = set()
    known.update(by_pk.keys())
    KNOWN_PKS_FILE.write_text(json.dumps(sorted(known), indent=2), encoding="utf-8")


if __name__ == "__main__":
    collect()
