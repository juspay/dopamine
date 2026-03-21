#!/usr/bin/env python3
"""Collect metadata for all saved Instagram posts and save to videos/metadata.json."""

import json
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
OUTPUT_FILE = Path("./videos/metadata.json")


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


def collect_metadata():
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    cl = get_client()

    print("Fetching all saved posts (this may take a moment)...", flush=True)
    medias = cl.collection_medias("saved", amount=0)
    print(f"Found {len(medias)} total saved posts.", flush=True)

    seen_codes = set()
    results = []

    for media in medias:
        if media.code in seen_codes:
            continue
        seen_codes.add(media.code)
        results.append(extract_media(media))

    print(f"Deduplicated to {len(results)} unique posts.", flush=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Saved metadata to {OUTPUT_FILE}", flush=True)


if __name__ == "__main__":
    collect_metadata()
