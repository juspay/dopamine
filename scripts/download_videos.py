#!/usr/bin/env python3
"""Download all saved videos from your Instagram account using instagrapi.

SESSION MANAGEMENT
------------------
The session is persisted to ~/.config/instagrapi/session.json so that
re-logins are avoided on every run.

To create or refresh the session file manually, run:

    python3 scripts/ig_login.py

That helper script performs a fresh interactive login (including 2FA/challenge
prompts) and writes a valid session.json that both this script and
collect_metadata.py will reuse.
"""

import json
import os
import signal
import sys
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
OUTPUT_DIR = Path("./videos") / f"{USERNAME}_saved"


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
    per-request timeouts alone don't help. This SIGALRM watchdog guarantees the
    script exits (non-zero) with an actionable message instead of hanging for
    hours and blocking the next scheduled run.
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
    print(
        f"\n[ig] RATE LIMITED ({type(exc).__name__}: {exc})\n"
        "  Instagram is throttling requests. Wait at least 1 hour before retrying.\n"
        "  If this persists, run: python3 scripts/ig_login.py\n",
        flush=True,
    )
    raise SystemExit(1)


# ---------------------------------------------------------------------------
# Download logic
# ---------------------------------------------------------------------------

def download_saved_videos():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    # Guard the saved-feed fetch (the soft-block hang point) at IG_FETCH_TIMEOUT_SEC
    # (default 600s), then release it before the legitimately-long download phase,
    # which the caller's execa wall-clock cap (DOWNLOAD_TIMEOUT_MS) backstops.
    _install_fetch_watchdog(int(os.environ.get("IG_FETCH_TIMEOUT_SEC", "600")))
    cl = get_client()

    print(f"\nOutput: {OUTPUT_DIR}", flush=True)
    print("Fetching all saved posts (this may take a moment)...\n", flush=True)

    # Fetch ALL saved media at once (amount=0 means no limit)
    try:
        medias = cl.collection_medias("saved", amount=0)
    except (PleaseWaitFewMinutes, RateLimitError) as exc:
        _abort_rate_limited(exc)
    print(f"Found {len(medias)} total saved posts.\n", flush=True)
    signal.alarm(0)  # saved-feed fetch done — cancel the watchdog before downloads

    # Check already downloaded files
    existing_files = {f.stem for f in OUTPUT_DIR.iterdir() if f.suffix == ".mp4"}

    # Track all known pks (downloaded + previously seen) to avoid retrying old failures
    known_pks_file = Path("./videos/known_pks.json")
    if known_pks_file.exists():
        with open(known_pks_file) as fh:  # always close the file handle
            known_pks: set[str] = set(json.load(fh))
    else:
        # Initialize from existing downloaded files + metadata
        known_pks = set()
        for f in existing_files:
            parts = f.rsplit("_", 1)
            if len(parts) == 2 and parts[1].isdigit():
                known_pks.add(parts[1])

    video_count = 0
    skipped = 0
    already_have = 0
    seen_codes: set[str] = set()

    for media in medias:
        # Skip duplicates in the list
        if media.code in seen_codes:
            continue
        seen_codes.add(media.code)

        pk_str = str(media.pk)

        if media.media_type == 2:
            if pk_str in known_pks:
                already_have += 1
                continue
            try:
                cl.video_download(media.pk, folder=OUTPUT_DIR)
                known_pks.add(pk_str)  # Only mark as known AFTER successful download
                video_count += 1
                print(f"  [{video_count}] {media.taken_at:%Y-%m-%d} by @{media.user.username} - {media.code}", flush=True)
            except Exception as e:
                print(f"  [!] Failed {media.code}: {e}", flush=True)
        elif media.media_type == 8:
            if pk_str in known_pks:
                already_have += 1
                continue
            downloaded_any = False
            for i, resource in enumerate(media.resources or []):
                if resource.media_type == 2:
                    try:
                        cl.video_download_by_url(resource.video_url, folder=OUTPUT_DIR)
                        downloaded_any = True
                        video_count += 1
                        print(f"  [{video_count}] {media.taken_at:%Y-%m-%d} by @{media.user.username} - {media.code} (slide {i+1})", flush=True)
                    except Exception as e:
                        print(f"  [!] Failed {media.code} slide {i+1}: {e}", flush=True)
            if downloaded_any:
                known_pks.add(pk_str)  # Only mark as known if at least one slide downloaded
        else:
            skipped += 1

    # Save known pks for next run
    with open(known_pks_file, "w") as fh:
        json.dump(sorted(known_pks), fh)

    print(f"\nDone! Downloaded {video_count} new videos ({already_have} already had, {skipped} non-video skipped)", flush=True)
    print(f"Saved to: {OUTPUT_DIR}", flush=True)


if __name__ == "__main__":
    download_saved_videos()
