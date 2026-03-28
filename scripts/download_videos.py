#!/usr/bin/env python3
"""Download all saved videos from your Instagram account using instagrapi."""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from instagrapi import Client

load_dotenv()
sys.stdout.reconfigure(line_buffering=True)

USERNAME = os.environ["INSTAGRAM_USERNAME"]
PASSWORD = os.environ["INSTAGRAM_PASSWORD"]
SESSION_FILE = os.path.expanduser("~/.config/instagrapi/session.json")
OUTPUT_DIR = Path("./videos") / f"{USERNAME}_saved"


def get_client() -> Client:
    from instagrapi.exceptions import LoginRequired

    cl = Client()
    cl.delay_range = [3, 7]
    cl.request_timeout = 30
    os.makedirs(os.path.dirname(SESSION_FILE), exist_ok=True)

    # Try loading saved session WITHOUT calling login()
    if os.path.exists(SESSION_FILE):
        session = cl.load_settings(SESSION_FILE)
        if session:
            try:
                cl.set_settings(session)
                cl.get_timeline_feed()  # Validate session
                print(f"Session valid for {USERNAME}", flush=True)
                return cl
            except LoginRequired:
                print("Session expired, re-authenticating with preserved device...", flush=True)
                old_session = cl.get_settings()
                cl.set_settings({})
                cl.set_uuids(old_session["uuids"])  # Keep same device identity
                cl.login(USERNAME, PASSWORD)
                cl.dump_settings(SESSION_FILE)
                print("Re-authenticated and session saved.", flush=True)
                return cl
            except Exception as e:
                print(f"Session validation failed: {e}", flush=True)

    # Try browser cookie import before password login
    try:
        import browser_cookie3
        print("Trying Chrome cookie import...", flush=True)
        cj = browser_cookie3.chrome(domain_name='.instagram.com')
        cookies = {c.name: c.value for c in cj}
        if 'sessionid' in cookies and cookies['sessionid']:
            cl.login_by_sessionid(cookies['sessionid'])
            cl.dump_settings(SESSION_FILE)
            print("Logged in via Chrome cookies.", flush=True)
            return cl
    except Exception as e:
        print(f"Chrome cookie import failed: {e}", flush=True)

    # Last resort: fresh password login
    print("Performing fresh login...", flush=True)
    cl.login(USERNAME, PASSWORD)
    cl.dump_settings(SESSION_FILE)
    print("Logged in and session saved.", flush=True)
    return cl


def download_saved_videos():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    cl = get_client()

    print(f"\nOutput: {OUTPUT_DIR}", flush=True)
    print("Fetching all saved posts (this may take a moment)...\n", flush=True)

    # Fetch ALL saved media at once (amount=0 means no limit)
    medias = cl.collection_medias("saved", amount=0)
    print(f"Found {len(medias)} total saved posts.\n", flush=True)

    # Check already downloaded files
    existing_files = {f.stem for f in OUTPUT_DIR.iterdir() if f.suffix == ".mp4"}

    # Track all known pks (downloaded + previously seen) to avoid retrying old failures
    known_pks_file = Path("./videos/known_pks.json")
    if known_pks_file.exists():
        import json
        known_pks = set(json.load(open(known_pks_file)))
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
    seen_codes = set()

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
    import json
    with open(known_pks_file, "w") as f:
        json.dump(sorted(known_pks), f)

    print(f"\nDone! Downloaded {video_count} new videos ({already_have} already had, {skipped} non-video skipped)", flush=True)
    print(f"Saved to: {OUTPUT_DIR}", flush=True)


if __name__ == "__main__":
    download_saved_videos()
