#!/usr/bin/env python3
"""Interactive Instagram login helper.

Run this script ONCE to create or refresh the instagrapi session file that
both collect_metadata.py and download_videos.py reuse on every pipeline run:

    python3 scripts/ig_login.py

The script handles:
  - Standard username/password login
  - Two-factor authentication (TOTP / SMS code prompt)
  - Instagram checkpoint/challenge screens (email/SMS code prompt)
  - SentryBlock errors (account flagged — check the app)

After a successful login the session is written to:

    ~/.config/instagrapi/session.json

Subsequent pipeline runs load that file and skip the login entirely until the
session expires (typically several weeks).
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(line_buffering=True)

SESSION_FILE = os.path.expanduser("~/.config/instagrapi/session.json")
USERNAME = os.environ.get("INSTAGRAM_USERNAME", "")
PASSWORD = os.environ.get("INSTAGRAM_PASSWORD", "")

if not USERNAME or not PASSWORD:
    print(
        "ERROR: INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD must be set in .env\n"
        "       (or exported as environment variables before running this script).",
        flush=True,
    )
    sys.exit(1)


def challenge_code_handler(username: str, choice) -> str:  # type: ignore[return]
    """Prompt the user to enter a challenge verification code."""
    print(f"\n[ig] Instagram sent a verification code to your {choice}.", flush=True)
    code = input("  Enter the code: ").strip()
    return code


def change_password_handler(username: str) -> str:
    """Prompt the user to enter a new password (rare — only when IG forces it)."""
    print("\n[ig] Instagram is requiring a password change.", flush=True)
    new_pw = input("  Enter your new password: ").strip()
    return new_pw


def main() -> None:
    from instagrapi import Client
    from instagrapi.exceptions import (
        BadPassword,
        ChallengeRequired,
        PleaseWaitFewMinutes,
        RateLimitError,
        ReloginAttemptExceeded,
        SentryBlock,
        TwoFactorRequired,
    )

    os.makedirs(os.path.dirname(SESSION_FILE), exist_ok=True)

    cl = Client()
    cl.delay_range = [2, 5]
    cl.request_timeout = 30
    cl.challenge_code_handler = challenge_code_handler
    cl.change_password_handler = change_password_handler

    print(f"[ig] Logging in as @{USERNAME} …", flush=True)
    try:
        cl.login(USERNAME, PASSWORD)
        cl.dump_settings(SESSION_FILE)
        print(f"\n[ig] SUCCESS — session saved to {SESSION_FILE}", flush=True)
        print("     Both collect_metadata.py and download_videos.py will reuse it.", flush=True)

    except TwoFactorRequired:
        print("\n[ig] Two-factor authentication required.", flush=True)
        two_factor_identifier = cl.last_json.get("two_factor_info", {}).get(
            "two_factor_identifier", ""
        )
        verification_method = input(
            "  Verification method (1=SMS, 3=TOTP authenticator app): "
        ).strip()
        code = input("  Enter the 6-digit code: ").strip()
        cl.two_factor_login(
            USERNAME,
            PASSWORD,
            verification_code=code,
            two_factor_identifier=two_factor_identifier,
            identifier_type=int(verification_method),
        )
        cl.dump_settings(SESSION_FILE)
        print(f"\n[ig] SUCCESS — session saved to {SESSION_FILE}", flush=True)

    except ChallengeRequired:
        print("\n[ig] Instagram is requesting additional verification (checkpoint).", flush=True)
        print("     Follow the prompts above to complete the challenge.", flush=True)
        # challenge_code_handler is registered on the client; instagrapi will call it.
        # If we're here it means auto-challenge failed — ask the user to solve it in the app.
        print(
            "\n  If verification continues to fail:\n"
            "  1. Open the Instagram app on your phone\n"
            "  2. Complete any pending security check\n"
            "  3. Re-run this script\n",
            flush=True,
        )
        sys.exit(1)

    except BadPassword:
        print(
            "\n[ig] ERROR: Bad password. Check INSTAGRAM_PASSWORD in your .env file.",
            flush=True,
        )
        sys.exit(1)

    except SentryBlock:
        print(
            "\n[ig] ERROR: Instagram has blocked this login attempt (SentryBlock).\n"
            "  Your account or IP may be flagged.\n"
            "  1. Log in to instagram.com in a browser and resolve any security prompts.\n"
            "  2. Wait a few hours then retry.\n",
            flush=True,
        )
        sys.exit(1)

    except ReloginAttemptExceeded:
        print(
            "\n[ig] ERROR: Too many re-login attempts. Wait several hours before retrying.",
            flush=True,
        )
        sys.exit(1)

    except (PleaseWaitFewMinutes, RateLimitError) as exc:
        print(
            f"\n[ig] RATE LIMITED ({type(exc).__name__}): Instagram is throttling requests.\n"
            "  Wait at least 1 hour before retrying.",
            flush=True,
        )
        sys.exit(1)

    except Exception as exc:
        print(f"\n[ig] Unexpected error during login: {type(exc).__name__}: {exc}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
