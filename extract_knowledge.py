#!/usr/bin/env python3
"""Extract transcripts, visual descriptions, links, and takeaways from videos using Gemini on Vertex AI."""

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
CLASSIFICATIONS_FILE = Path("videos/classifications.json")
OUTPUT_FILE = Path("videos/knowledge_base.json")

# Target categories
TARGET_CATEGORIES = {"AI & Machine Learning", "Tech & Coding"}

# Rate limiting
DELAY_BETWEEN_REQUESTS = 3  # seconds
MAX_RETRIES = 5
RETRY_BASE_DELAY = 15  # seconds

PROMPT = """Analyze this video thoroughly and return a JSON object with:
1. "transcript": Full word-for-word transcript of everything spoken in the video. Include speaker labels if multiple speakers. If no speech, describe the audio.
2. "visual_description": Detailed description of what is shown on screen throughout the video - slides, code, demos, websites, apps, text overlays, diagrams. Break down by timestamp if the content changes.
3. "links_and_resources": Array of objects with {"url": "...", "description": "...", "timestamp": "..."} for every URL, website, tool, product, or resource mentioned or shown. Include partial URLs and tool/product names even if full URL isn't shown.
4. "key_takeaways": Array of 3-7 bullet point takeaways from the video content.
5. "topics": Array of specific topics/technologies discussed.

Be extremely thorough with the transcript - capture every word spoken.
Return ONLY valid JSON, no markdown."""


def get_target_videos():
    """Load classifications and filter to target categories."""
    with open(CLASSIFICATIONS_FILE) as f:
        classifications = json.load(f)

    target = {}
    for filename, info in classifications.items():
        category = info.get("category", "")
        if category in TARGET_CATEGORIES:
            target[filename] = info
    return target


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
            print(f"  Large file ({file_size_mb:.1f}MB), sending inline anyway...")
            video_part = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")
    else:
        video_part = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")

    response = client.models.generate_content(
        model=MODEL,
        contents=[video_part, PROMPT],
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

    # Load target videos
    print("Loading classifications and filtering target categories...")
    target_videos = get_target_videos()
    print(f"  Found {len(target_videos)} videos in target categories: {', '.join(TARGET_CATEGORIES)}")

    # Load existing knowledge base for resume support
    knowledge_base = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            knowledge_base = json.load(f)
        print(f"  Loaded {len(knowledge_base)} existing entries (resume mode)")

    # Process each video
    filenames = sorted(target_videos.keys())
    total = len(filenames)
    processed = 0
    skipped = 0
    errors = 0

    for i, filename in enumerate(filenames, 1):
        # Skip if already processed successfully
        if filename in knowledge_base and "error" not in knowledge_base[filename]:
            skipped += 1
            print(f"[{i}/{total}] SKIP (already processed): {filename}")
            continue

        video_path = VIDEOS_DIR / filename
        if not video_path.exists():
            print(f"[{i}/{total}] SKIP (file not found): {filename}")
            errors += 1
            continue

        classification = target_videos[filename]
        category = classification.get("category", "?")
        description = classification.get("description", "")[:80]
        print(f"[{i}/{total}] Processing: {filename}")
        print(f"  Category: {category} | {description}")

        # Retry loop
        for attempt in range(MAX_RETRIES):
            try:
                result = extract_knowledge(client, video_path)
                knowledge_base[filename] = {
                    "category": category,
                    "subcategory": classification.get("subcategory"),
                    "classification_tags": classification.get("tags", []),
                    "username": classification.get("username"),
                    **result,
                }
                processed += 1
                topics = result.get("topics", [])
                takeaway_count = len(result.get("key_takeaways", []))
                links_count = len(result.get("links_and_resources", []))
                print(f"  -> Done: {takeaway_count} takeaways, {links_count} links, topics: {', '.join(topics[:5])}")

                # Save after each successful extraction
                with open(OUTPUT_FILE, "w") as f:
                    json.dump(knowledge_base, f, indent=2, ensure_ascii=False)

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
                    knowledge_base[filename] = {
                        "category": category,
                        "subcategory": classification.get("subcategory"),
                        "username": classification.get("username"),
                        "error": str(e),
                    }
                    errors += 1
                    # Save even on error
                    with open(OUTPUT_FILE, "w") as f:
                        json.dump(knowledge_base, f, indent=2, ensure_ascii=False)

        # Delay between requests
        time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\nDone! Processed: {processed}, Skipped: {skipped}, Errors: {errors}")
    print(f"Results saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
