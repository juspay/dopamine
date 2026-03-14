#!/usr/bin/env python3
"""Extract knowledge from Business & Marketing and UI/UX Design videos using Gemini on Vertex AI."""

import sys
sys.stdout.reconfigure(line_buffering=True)

import json
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
CLASSIFICATIONS_FILE = Path("videos/classifications.json")
OUTPUT_FILE = Path("videos/knowledge_base_batch2.json")

# Target categories
TARGET_CATEGORIES = {"Business & Marketing", "UI/UX Design"}

# Rate limiting
DELAY_BETWEEN_REQUESTS = 3  # seconds
MAX_RETRIES = 5
RETRY_BASE_DELAY = 15  # seconds

EXTRACTION_PROMPT = """Analyze this video thoroughly and return a JSON object with:
1. "transcript": Full word-for-word transcript of everything spoken in the video. Include speaker labels if multiple speakers. If no speech, describe the audio.
2. "visual_description": Detailed description of what is shown on screen throughout the video - slides, code, demos, websites, apps, text overlays, diagrams. Break down by timestamp if the content changes.
3. "links_and_resources": Array of objects with {"url": "...", "description": "...", "timestamp": "..."} for every URL, website, tool, product, or resource mentioned or shown. Include partial URLs and tool/product names even if full URL isn't shown.
4. "key_takeaways": Array of 3-7 bullet point takeaways from the video content.
5. "topics": Array of specific topics/technologies discussed.

Be extremely thorough with the transcript - capture every word spoken.
Return ONLY valid JSON, no markdown."""


def get_target_videos():
    """Get list of video filenames in our target categories."""
    with open(CLASSIFICATIONS_FILE) as f:
        classifications = json.load(f)

    target_videos = {}
    for filename, info in classifications.items():
        category = info.get("category", "")
        if category in TARGET_CATEGORIES:
            target_videos[filename] = info
    return target_videos


def extract_knowledge(client, video_path):
    """Send video to Gemini for knowledge extraction."""
    video_bytes = video_path.read_bytes()
    file_size_mb = len(video_bytes) / (1024 * 1024)

    if file_size_mb > 50:
        thumb_name = video_path.stem + ".jpg"
        thumb_path = video_path.parent.parent / "thumbnails" / thumb_name
        if thumb_path.exists():
            print(f"  Large file ({file_size_mb:.1f}MB), using thumbnail instead...")
            thumb_bytes = thumb_path.read_bytes()
            video_part = types.Part.from_bytes(data=thumb_bytes, mime_type="image/jpeg")
        else:
            print(f"  Large file ({file_size_mb:.1f}MB), sending inline...")
            video_part = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")
    else:
        video_part = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")

    response = client.models.generate_content(
        model=MODEL,
        contents=[video_part, EXTRACTION_PROMPT],
    )

    text = response.text.strip()
    # Remove markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)

    return json.loads(text)


def main():
    print(f"Initializing Gemini client (project={PROJECT}, location={LOCATION})...")
    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)

    # Get target videos
    print("Loading classifications...")
    target_videos = get_target_videos()
    print(f"  Found {len(target_videos)} videos in target categories: {', '.join(TARGET_CATEGORIES)}")

    # Load existing results for resume support
    results = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            results = json.load(f)
        print(f"  Loaded {len(results)} existing results (resume mode)")

    # Process each video
    total = len(target_videos)
    processed = 0
    skipped = 0
    errors = 0

    for i, (filename, classification) in enumerate(sorted(target_videos.items()), 1):
        # Skip if already processed
        if filename in results and "error" not in results[filename]:
            skipped += 1
            print(f"[{i}/{total}] SKIP (already processed): {filename}")
            continue

        video_path = VIDEOS_DIR / filename
        if not video_path.exists():
            print(f"[{i}/{total}] SKIP (file not found): {filename}")
            errors += 1
            continue

        category = classification.get("category", "?")
        subcategory = classification.get("subcategory", "?")
        print(f"[{i}/{total}] Processing: {filename}")
        print(f"  Category: {category} / {subcategory}")

        # Retry loop
        for attempt in range(MAX_RETRIES):
            try:
                result = extract_knowledge(client, video_path)
                results[filename] = {
                    "category": category,
                    "subcategory": subcategory,
                    "username": classification.get("username"),
                    "pk": classification.get("pk"),
                    **result,
                }
                processed += 1
                n_takeaways = len(result.get("key_takeaways", []))
                n_links = len(result.get("links_and_resources", []))
                transcript_len = len(result.get("transcript", ""))
                print(f"  -> Done: {transcript_len} chars transcript, {n_takeaways} takeaways, {n_links} links")

                # Save after each successful extraction
                with open(OUTPUT_FILE, "w") as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)

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
                    results[filename] = {
                        "category": category,
                        "subcategory": subcategory,
                        "username": classification.get("username"),
                        "pk": classification.get("pk"),
                        "error": str(e),
                    }
                    errors += 1
                    with open(OUTPUT_FILE, "w") as f:
                        json.dump(results, f, indent=2, ensure_ascii=False)

        # Delay between requests
        time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\nDone! Processed: {processed}, Skipped: {skipped}, Errors: {errors}")
    print(f"Results saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
