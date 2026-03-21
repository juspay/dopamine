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
    cl = Client()
    cl.delay_range = [2, 5]
    os.makedirs(os.path.dirname(SESSION_FILE), exist_ok=True)

    if os.path.exists(SESSION_FILE):
        try:
            print("Loading saved session...", flush=True)
            cl.load_settings(SESSION_FILE)
            cl.login(USERNAME, PASSWORD)
            cl.get_timeline_feed()
            print(f"Logged in as {USERNAME}", flush=True)
            return cl
        except Exception as e:
            print(f"Saved session failed: {e}", flush=True)

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
            # Skip if we already know about this pk (downloaded or previously attempted)
            if pk_str in known_pks:
                already_have += 1
                continue
            known_pks.add(pk_str)
            try:
                cl.video_download(media.pk, folder=OUTPUT_DIR)
                video_count += 1
                print(f"  [{video_count}] {media.taken_at:%Y-%m-%d} by @{media.user.username} - {media.code}", flush=True)
            except Exception as e:
                print(f"  [!] Failed {media.code}: {e}", flush=True)
        elif media.media_type == 8:
            if pk_str in known_pks:
                already_have += 1
                continue
            known_pks.add(pk_str)
            for i, resource in enumerate(media.resources or []):
                if resource.media_type == 2:
                    try:
                        cl.video_download_by_url(resource.video_url, folder=OUTPUT_DIR)
                        video_count += 1
                        print(f"  [{video_count}] {media.taken_at:%Y-%m-%d} by @{media.user.username} - {media.code} (slide {i+1})", flush=True)
                    except Exception as e:
                        print(f"  [!] Failed {media.code} slide {i+1}: {e}", flush=True)
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
