#!/usr/bin/env python3
"""Classify Instagram saved videos using Gemini on Vertex AI."""

import sys
sys.stdout.reconfigure(line_buffering=True)

import json
import os
import re
import time
import traceback
from pathlib import Path

from google import genai
from google.genai import types

# Configuration
PROJECT = "your-gcp-project-id"
LOCATION = "us-central1"
MODEL = "gemini-2.0-flash"
VIDEOS_DIR = Path("videos/user_saved")
METADATA_FILE = Path("videos/metadata.json")
VIDEO_PROPS_FILE = Path("videos/video_properties.json")
OUTPUT_FILE = Path("videos/classifications.json")

# Rate limiting
DELAY_BETWEEN_REQUESTS = 2  # seconds
MAX_RETRIES = 5
RETRY_BASE_DELAY = 10  # seconds


def load_metadata():
    """Load metadata and build pk -> metadata lookup."""
    with open(METADATA_FILE) as f:
        metadata_list = json.load(f)
    pk_lookup = {}
    for entry in metadata_list:
        pk_lookup[str(entry["pk"])] = entry
    return pk_lookup


def extract_pk_from_filename(filename):
    """Extract pk from filename pattern: {username}_{pk}.mp4"""
    # Match the last group of digits before .mp4
    m = re.search(r'_(\d{10,})\.mp4$', filename)
    if m:
        return m.group(1)
    return None


def extract_hashtags(caption):
    """Extract hashtags from caption text."""
    if not caption:
        return []
    return re.findall(r'#\w+', caption)


def classify_video(client, video_path, metadata):
    """Send video to Gemini for classification."""
    username = metadata.get("username", "unknown") if metadata else "unknown"
    caption = metadata.get("caption_text", "") if metadata else ""
    hashtags = ", ".join(extract_hashtags(caption)) if caption else ""

    prompt = f"""Analyze this video and its Instagram metadata. Return a JSON object with:
- "category": auto-discover the best category (e.g., "Tech & Coding", "Interior Design", "Food & Cooking", "AI & Machine Learning", "Business & Marketing", "Anime & Entertainment", "Travel & Lifestyle", "UI/UX Design", "Fitness & Health", "Education", etc.)
- "subcategory": a more specific subcategory
- "tags": array of 5-10 descriptive tags
- "description": 1-2 sentence description of the video content
- "language": primary language spoken/shown
- "mood": the mood/tone (e.g., "educational", "entertaining", "inspirational", "tutorial", "promotional")

Instagram metadata:
- Username: {username}
- Caption: {caption}
- Hashtags: {hashtags}

Return ONLY valid JSON, no markdown."""

    # Read video file - send inline (Vertex AI supports up to ~100MB inline)
    # For very large files (>50MB), use thumbnail instead
    video_bytes = video_path.read_bytes()
    file_size_mb = len(video_bytes) / (1024 * 1024)

    if file_size_mb > 50:
        # Use thumbnail for very large videos
        thumb_name = video_path.stem + ".jpg"
        thumb_path = video_path.parent.parent / "thumbnails" / thumb_name
        if thumb_path.exists():
            print(f"  Large file ({file_size_mb:.1f}MB), using thumbnail instead...")
            thumb_bytes = thumb_path.read_bytes()
            video_part = types.Part.from_bytes(data=thumb_bytes, mime_type="image/jpeg")
        else:
            print(f"  Large file ({file_size_mb:.1f}MB), no thumbnail, sending inline anyway...")
            video_part = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")
    else:
        video_part = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")

    response = client.models.generate_content(
        model=MODEL,
        contents=[video_part, prompt],
    )

    # Parse JSON response
    text = response.text.strip()
    # Remove markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)

    return json.loads(text)


def main():
    print(f"Initializing Gemini client (project={PROJECT}, location={LOCATION})...")
    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)

    # Load data
    print("Loading metadata...")
    pk_lookup = load_metadata()
    print(f"  Loaded {len(pk_lookup)} metadata entries")

    with open(VIDEO_PROPS_FILE) as f:
        video_props = json.load(f)
    print(f"  Loaded {len(video_props)} video properties")

    # Load existing classifications for resume support
    classifications = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            classifications = json.load(f)
        print(f"  Loaded {len(classifications)} existing classifications (resume mode)")

    # Get all video files
    video_files = sorted(VIDEOS_DIR.glob("*.mp4"))
    print(f"  Found {len(video_files)} video files")

    # Classify each video
    total = len(video_files)
    classified = 0
    skipped = 0
    errors = 0

    for i, video_path in enumerate(video_files, 1):
        filename = video_path.name

        # Skip if already classified
        if filename in classifications:
            skipped += 1
            print(f"[{i}/{total}] SKIP (already classified): {filename}")
            continue

        # Match to metadata
        pk = extract_pk_from_filename(filename)
        metadata = pk_lookup.get(pk) if pk else None

        if metadata:
            username = metadata.get("username", "?")
            caption_preview = (metadata.get("caption_text", "") or "")[:60]
        else:
            username = "?"
            caption_preview = "(no metadata)"

        print(f"[{i}/{total}] Classifying: {filename}")
        print(f"  User: {username} | Caption: {caption_preview}...")

        # Retry loop
        for attempt in range(MAX_RETRIES):
            try:
                result = classify_video(client, video_path, metadata)
                classifications[filename] = {
                    "pk": pk,
                    "code": metadata.get("code") if metadata else None,
                    "username": metadata.get("username") if metadata else None,
                    **result,
                }
                classified += 1
                print(f"  -> {result.get('category', '?')} / {result.get('subcategory', '?')}")

                # Save after each successful classification
                with open(OUTPUT_FILE, "w") as f:
                    json.dump(classifications, f, indent=2, ensure_ascii=False)

                break
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    print(f"  Rate limited (attempt {attempt+1}/{MAX_RETRIES}), waiting {delay}s...")
                    time.sleep(delay)
                elif attempt < MAX_RETRIES - 1:
                    delay = RETRY_BASE_DELAY * (attempt + 1)
                    print(f"  Error (attempt {attempt+1}/{MAX_RETRIES}): {e}")
                    print(f"  Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    print(f"  FAILED after {MAX_RETRIES} attempts: {e}")
                    traceback.print_exc()
                    classifications[filename] = {
                        "pk": pk,
                        "code": metadata.get("code") if metadata else None,
                        "username": metadata.get("username") if metadata else None,
                        "error": str(e),
                    }
                    errors += 1
                    # Save even on error
                    with open(OUTPUT_FILE, "w") as f:
                        json.dump(classifications, f, indent=2, ensure_ascii=False)

        # Delay between requests
        time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\nDone! Classified: {classified}, Skipped: {skipped}, Errors: {errors}")
    print(f"Results saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
