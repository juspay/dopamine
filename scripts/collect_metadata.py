#!/usr/bin/env python3
"""Collect metadata for all saved Instagram posts and save to videos/metadata.json.

SESSION MANAGEMENT
------------------
The session is persisted to ~/.config/instagrapi/session.json so that
re-logins are avoided on every run.

To create or refresh the session file manually, run:

    python3 scripts/ig_login.py

That helper script performs a fresh interactive login (including 2FA/challenge
prompts) and writes a valid session.json that both this script and
download_videos.py will reuse.
"""

import json
import os
import random
import signal
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from instagrapi import Client
from instagrapi.exceptions import (
    BadPassword,
    ChallengeRequired,
    LoginRequired,
    PleaseWaitFewMinutes,
    RateLimitError,
    ReloginAttemptExceeded,
    SentryBlock,
    TwoFactorRequired,
)

load_dotenv()
sys.stdout.reconfigure(line_buffering=True)

USERNAME = os.environ["INSTAGRAM_USERNAME"]
PASSWORD = os.environ["INSTAGRAM_PASSWORD"]
SESSION_FILE = os.path.expanduser("~/.config/instagrapi/session.json")
OUTPUT_FILE = Path("./videos/metadata.json")
COOLDOWN_FILE = Path("./videos/ig_cooldown.json")
CURSOR_FILE = Path("./videos/ig_saved_cursor.json")
INCOMING_FILE = Path("./videos/metadata.incoming.json")


def _fetch_kwargs(cursor_pk, max_items, force_full):
    """collection_medias kwargs: full sweep on cold-start/force, else a bounded
    newest-first walk that stops at the cursor pk (instagrapi ``last_media_pk``)."""
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


def _check_cooldown() -> None:
    """Skip (exit 0) if a prior run hit a rate-limit and the cooldown is active."""
    if not COOLDOWN_FILE.exists():
        return
    try:
        until = datetime.fromisoformat(json.loads(COOLDOWN_FILE.read_text())["until"])
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        return
    if until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) < until:
        print(
            f"[ig] Post-rate-limit cooldown active until {until.isoformat()} — "
            "skipping this run.\n  (delete videos/ig_cooldown.json to override.)",
            flush=True,
        )
        sys.exit(0)


def _write_cooldown() -> None:
    hours = float(os.environ.get("IG_COOLDOWN_HOURS", "12"))
    until = (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()
    try:
        COOLDOWN_FILE.write_text(json.dumps({"until": until}))
        print(f"[ig] Cooldown set until {until} (IG_COOLDOWN_HOURS={hours}).", flush=True)
    except OSError:
        pass


def _clear_cooldown() -> None:
    try:
        COOLDOWN_FILE.unlink(missing_ok=True)
    except OSError:
        pass


def _build_fresh_client() -> Client:
    """Return a new Client with human-like delays configured."""
    cl = Client()
    # Human-like delays between requests to reduce bot-detection. Slightly
    # gentler defaults (3-7 s) than before; override via IG_DELAY_MIN/MAX.
    cl.delay_range = [
        float(os.environ.get("IG_DELAY_MIN", "3")),
        float(os.environ.get("IG_DELAY_MAX", "7")),
    ]
    cl.request_timeout = int(os.environ.get("IG_REQUEST_TIMEOUT_SEC", "30"))
    return cl


def _install_fetch_watchdog(seconds: int) -> None:
    """Abort the whole process if the saved-feed fetch stalls.

    On an Instagram soft-block the private API hangs instead of erroring, so
    per-request timeouts alone don't help — instagrapi just retries/sleeps.
    This SIGALRM watchdog guarantees the script exits (non-zero) with an
    actionable message instead of hanging for hours and blocking the next run.
    """
    def _fire(_signum, _frame):
        print(
            f"\n[ig] WATCHDOG: aborted after {seconds}s without completing.\n"
            "  Instagram is most likely throttling/soft-blocking this account —\n"
            "  the private API stalls instead of returning. Pause the pipeline for\n"
            "  24-48h, then refresh the session: python3 scripts/ig_login.py\n",
            flush=True,
        )
        os._exit(1)

    signal.signal(signal.SIGALRM, _fire)
    signal.alarm(seconds)


def get_client() -> Client:  # noqa: C901  (complexity acceptable for login logic)
    """
    Return an authenticated instagrapi Client.

    Strategy (in order):
      1. Load and validate the persisted session file.
      2. On LoginRequired: attempt ONE re-login using the saved device identity
         so Instagram does not treat it as a new device (avoids challenge triggers).
      3. Fall back to browser-cookie import (requires browser_cookie3).
      4. Last resort: fresh password login.

    On ChallengeRequired / TwoFactorRequired the script exits with a clear
    actionable message — automated pipelines cannot solve interactive challenges.
    Run `python3 scripts/ig_login.py` to create a fresh session interactively.
    """
    os.makedirs(os.path.dirname(SESSION_FILE), exist_ok=True)

    # ------------------------------------------------------------------
    # 1. Load the persisted session and validate it.
    # ------------------------------------------------------------------
    if os.path.exists(SESSION_FILE):
        cl = _build_fresh_client()
        try:
            # load_settings reads the JSON file and calls set_settings internally;
            # the return value is the parsed dict (kept for device-identity reuse).
            saved_settings = cl.load_settings(SESSION_FILE)
            cl.get_timeline_feed()  # lightweight validation call
            print(f"[ig] Session valid for @{USERNAME}", flush=True)
            return cl
        except LoginRequired:
            print(
                "[ig] Session expired — attempting re-login with saved device identity …",
                flush=True,
            )
            # Preserve device UUIDs so Instagram recognises the same device.
            # set_settings({}) alone would wipe them; restore immediately.
            device_uuids = saved_settings.get("uuids", {}) if isinstance(saved_settings, dict) else {}
            cl.set_settings({})
            if device_uuids:
                cl.set_uuids(device_uuids)
            try:
                cl.login(USERNAME, PASSWORD)
                cl.dump_settings(SESSION_FILE)
                print("[ig] Re-authenticated — session saved.", flush=True)
                return cl
            except (ChallengeRequired, TwoFactorRequired) as exc:
                _abort_needs_interactive_login(exc)
            except (BadPassword, ReloginAttemptExceeded, SentryBlock) as exc:
                _abort_unrecoverable(exc)
            except (PleaseWaitFewMinutes, RateLimitError) as exc:
                _abort_rate_limited(exc)
        except (ChallengeRequired, TwoFactorRequired) as exc:
            _abort_needs_interactive_login(exc)
        except (SentryBlock, ReloginAttemptExceeded) as exc:
            _abort_unrecoverable(exc)
        except (PleaseWaitFewMinutes, RateLimitError) as exc:
            _abort_rate_limited(exc)
        except Exception as exc:
            print(f"[ig] Session validation failed ({type(exc).__name__}: {exc})", flush=True)
            # Fall through to cookie/password methods below.

    # ------------------------------------------------------------------
    # 2. Try browser cookie import (optional dependency).
    # ------------------------------------------------------------------
    try:
        import browser_cookie3

        print("[ig] Trying Chrome cookie import …", flush=True)
        cj = browser_cookie3.chrome(domain_name=".instagram.com")
        cookies = {c.name: c.value for c in cj}
        if cookies.get("sessionid"):
            cl = _build_fresh_client()
            cl.login_by_sessionid(cookies["sessionid"])
            cl.dump_settings(SESSION_FILE)
            print("[ig] Logged in via Chrome cookies — session saved.", flush=True)
            return cl
    except ImportError:
        pass  # browser_cookie3 not installed — skip silently
    except Exception as exc:
        print(f"[ig] Chrome cookie import failed: {exc}", flush=True)

    # ------------------------------------------------------------------
    # 3. Fresh password login (last resort).
    # ------------------------------------------------------------------
    print("[ig] Performing fresh password login …", flush=True)
    cl = _build_fresh_client()
    try:
        cl.login(USERNAME, PASSWORD)
        cl.dump_settings(SESSION_FILE)
        print("[ig] Logged in — session saved.", flush=True)
        return cl
    except (ChallengeRequired, TwoFactorRequired) as exc:
        _abort_needs_interactive_login(exc)
    except (BadPassword,) as exc:
        _abort_unrecoverable(exc)
    except (PleaseWaitFewMinutes, RateLimitError) as exc:
        _abort_rate_limited(exc)


# ---------------------------------------------------------------------------
# Error helpers — print actionable messages then raise SystemExit so the
# pipeline step reports a clear failure rather than a silent crash.
# ---------------------------------------------------------------------------

def _abort_needs_interactive_login(exc: Exception) -> None:
    print(
        f"\n[ig] AUTHENTICATION CHALLENGE REQUIRED ({type(exc).__name__})\n"
        "  Instagram is requesting interactive verification (2FA / checkpoint).\n"
        "  The pipeline cannot solve this automatically.\n\n"
        "  ACTION REQUIRED — run this command and follow the prompts:\n"
        "    python3 scripts/ig_login.py\n\n"
        "  That script performs a fresh interactive login and writes a valid\n"
        f"  session to {SESSION_FILE} which subsequent pipeline runs will reuse.\n",
        flush=True,
    )
    raise SystemExit(1)


def _abort_unrecoverable(exc: Exception) -> None:
    print(
        f"\n[ig] UNRECOVERABLE LOGIN ERROR ({type(exc).__name__}: {exc})\n"
        "  This is not a transient failure — check your credentials or account status.\n\n"
        "  ACTION REQUIRED — run this command to start a fresh session:\n"
        "    python3 scripts/ig_login.py\n",
        flush=True,
    )
    raise SystemExit(1)


def _abort_rate_limited(exc: Exception) -> None:
    _write_cooldown()  # make subsequent runs back off automatically
    print(
        f"\n[ig] RATE LIMITED ({type(exc).__name__}: {exc})\n"
        "  Instagram is throttling requests. Wait at least 1 hour before retrying.\n"
        "  If this persists, run: python3 scripts/ig_login.py\n",
        flush=True,
    )
    raise SystemExit(1)


# ---------------------------------------------------------------------------
# Data extraction helpers
# ---------------------------------------------------------------------------

def extract_resource(r):
    """Extract metadata from a carousel resource."""
    return {
        "pk": str(r.pk),
        "media_type": r.media_type,
        "video_url": str(r.video_url) if r.video_url else None,
        "thumbnail_url": str(r.thumbnail_url) if r.thumbnail_url else None,
    }


def extract_media(media):
    """Extract metadata dict from a Media object."""
    loc = None
    if media.location:
        loc = {
            "pk": media.location.pk,
            "name": media.location.name,
            "lat": media.location.lat,
            "lng": media.location.lng,
        }

    return {
        "pk": str(media.pk),
        "code": media.code,
        "media_type": media.media_type,
        "taken_at": media.taken_at.isoformat() if media.taken_at else None,
        "caption_text": media.caption_text,
        "username": media.user.username if media.user else None,
        "full_name": media.user.full_name if media.user else None,
        "location": loc,
        "like_count": media.like_count,
        "comment_count": media.comment_count,
        "video_url": str(media.video_url) if media.video_url else None,
        "thumbnail_url": str(media.thumbnail_url) if media.thumbnail_url else None,
        "resources": [extract_resource(r) for r in (media.resources or [])],
    }


def _fetch_saved_media(cl, cursor, max_items, force_full):
    """Fetch new saves across the uncategorized feed + named collections, using
    each feed's cursor for an early stop. Returns ``(medias, new_cursor)``.

    instagrapi's ``collection_medias("saved", ..., last_media_pk=<pk>)`` walks
    ``feed/saved/posts/`` newest-first and stops when it reaches the cursor pk,
    so an incremental run pulls roughly one page instead of re-paginating every
    saved post — the request-volume reduction that starves the soft-block.
    Named collections (``feed/collection/{id}/``) get the same early-stop walk.
    The numeric-id check skips the ``ALL_MEDIA_AUTO_COLLECTION`` pseudo-collection.
    Rate-limit errors propagate so the caller can abort cleanly.
    """
    new_cursor = dict(cursor)
    by_pk = {}

    kw = _fetch_kwargs(cursor.get("saved"), max_items, force_full)
    saved = cl.collection_medias("saved", **kw)
    for media in saved:
        by_pk[str(media.pk)] = media
    new_cursor["saved"] = _next_cursor(saved, cursor.get("saved"))
    uncategorized = len(by_pk)

    try:
        collections = cl.collections()
    except (PleaseWaitFewMinutes, RateLimitError):
        raise
    except Exception as exc:
        print(
            f"[ig] Could not list collections ({type(exc).__name__}: {exc}); "
            "continuing with uncategorized saves only.",
            flush=True,
        )
        collections = []

    for col in collections:
        cid = str(col.id)
        if not cid.isdigit():
            continue  # ALL_MEDIA_AUTO_COLLECTION etc. — already covered above
        time.sleep(random.uniform(2, 6))  # jitter between collections to look less bot-like
        try:
            kwc = _fetch_kwargs(cursor.get(cid), max_items, force_full)
            items = cl.collection_medias(cid, **kwc)
            for media in items:
                by_pk.setdefault(str(media.pk), media)
            new_cursor[cid] = _next_cursor(items, cursor.get(cid))
        except (PleaseWaitFewMinutes, RateLimitError):
            raise
        except Exception as exc:
            print(
                f"[ig] Collection {col.name!r} fetch failed "
                f"({type(exc).__name__}: {exc}); skipping.",
                flush=True,
            )

    extra = len(by_pk) - uncategorized
    if extra:
        print(f"  (+{extra} additional from named collections)", flush=True)
    return list(by_pk.values()), new_cursor


def collect_metadata():
    INCOMING_FILE.parent.mkdir(parents=True, exist_ok=True)
    _check_cooldown()  # back off automatically if a recent run was rate-limited
    # Cap the whole collection at IG_FETCH_TIMEOUT_SEC (default 600s) so a
    # throttled/stalled saved-feed fetch aborts cleanly instead of hanging.
    _install_fetch_watchdog(int(os.environ.get("IG_FETCH_TIMEOUT_SEC", "600")))
    cl = get_client()

    force_full = os.environ.get("IG_FORCE_FULL", "").lower() in ("1", "true", "yes")
    max_items = int(os.environ.get("IG_INCREMENTAL_MAX", "200"))
    cursor = _load_cursor()

    incremental = bool(cursor) and not force_full
    print("Fetching new saved posts (incremental)..." if incremental
          else "Fetching all saved posts (full sync)...", flush=True)
    try:
        medias, new_cursor = _fetch_saved_media(cl, cursor, max_items, force_full)
    except (PleaseWaitFewMinutes, RateLimitError) as exc:
        _abort_rate_limited(exc)
    print(f"Fetched {len(medias)} post(s) this run.", flush=True)
    signal.alarm(0)  # fetch done — remaining work is local, cancel the watchdog

    seen_codes = set()
    results = []

    for media in medias:
        if media.code in seen_codes:
            continue
        seen_codes.add(media.code)
        results.append(extract_media(media))

    # Write only this run's batch; the TS ingest layer unions it into the
    # canonical, accumulating videos/metadata.json (dedup by pk).
    with open(INCOMING_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    _save_cursor(new_cursor)
    _clear_cooldown()  # collection succeeded — clear any stale cooldown
    print(f"Wrote {len(results)} entries to {INCOMING_FILE}", flush=True)


if __name__ == "__main__":
    collect_metadata()
