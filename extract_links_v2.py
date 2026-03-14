#!/usr/bin/env python3
"""Extract actual URLs from knowledge base videos using Gemini."""

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
KB1_FILE = Path("videos/knowledge_base.json")
KB2_FILE = Path("videos/knowledge_base_batch2.json")
OUTPUT_FILE = Path("videos/links_v2.json")

# Rate limiting
DELAY_BETWEEN_REQUESTS = 2  # seconds
MAX_RETRIES = 5
RETRY_BASE_DELAY = 10  # seconds

PROMPT = """Watch this video very carefully. I need you to extract EVERY actual URL, website, tool, app, GitHub repo, or online resource that is:
1. SHOWN on screen (look at browser address bars, text on slides, links in descriptions, QR codes, watermarks)
2. SPOKEN by the narrator (listen for "go to...", "check out...", "link in bio", domain names mentioned verbally)
3. INFERABLE from the tools/products discussed (e.g., if they demo "Claude Code", the URL is https://claude.ai)

For EACH resource found, provide:
- "name": The tool/product/resource name
- "url": The ACTUAL full URL (https://...). If you saw it on screen, use exactly what was shown. If not shown but you know the real URL, provide it. If you truly cannot determine the URL, set to null.
- "type": one of "shown_on_screen", "mentioned_verbally", "inferred_from_context"
- "description": What it is and why it was mentioned
- "timestamp": Approximate timestamp in the video

Return a JSON object: {"links": [...]}
Return ONLY valid JSON, no markdown.
Be extremely thorough - pause on every frame that shows a URL, website, or tool name."""


def extract_links(client, video_path):
    """Send video to Gemini to extract links."""
    video_bytes = video_path.read_bytes()
    file_size_mb = len(video_bytes) / (1024 * 1024)

    if file_size_mb > 50:
        thumb_name = video_path.stem + ".jpg"
        thumb_path = video_path.parent.parent / "thumbnails" / thumb_name
        if thumb_path.exists():
            print(f"  Large file ({file_size_mb:.1f}MB), using thumbnail...")
            thumb_bytes = thumb_path.read_bytes()
            video_part = types.Part.from_bytes(data=thumb_bytes, mime_type="image/jpeg")
        else:
            print(f"  Large file ({file_size_mb:.1f}MB), sending inline...")
            video_part = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")
    else:
        video_part = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")

    response = client.models.generate_content(
        model=MODEL,
        contents=[video_part, PROMPT],
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)

    return json.loads(text)


def main():
    print(f"Initializing Gemini client (project={PROJECT}, location={LOCATION})...")
    client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)

    # Load both knowledge bases to get list of videos to process
    all_videos = {}
    with open(KB1_FILE) as f:
        kb1 = json.load(f)
        for k in kb1:
            all_videos[k] = "kb1"
    with open(KB2_FILE) as f:
        kb2 = json.load(f)
        for k in kb2:
            all_videos[k] = "kb2"

    print(f"Total videos in knowledge bases: {len(all_videos)}")

    # Load existing results for resume
    results = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE) as f:
            results = json.load(f)
        print(f"Loaded {len(results)} existing results (resume mode)")

    total = len(all_videos)
    processed = 0
    skipped = 0
    errors = 0
    total_links_found = 0

    for i, (filename, source) in enumerate(all_videos.items(), 1):
        # Skip if already processed
        if filename in results:
            skipped += 1
            existing_links = len(results[filename].get("links", []))
            total_links_found += existing_links
            print(f"[{i}/{total}] SKIP (already done): {filename} ({existing_links} links)")
            continue

        video_path = VIDEOS_DIR / filename
        if not video_path.exists():
            print(f"[{i}/{total}] MISSING: {filename}")
            results[filename] = {"links": [], "error": "file_not_found"}
            errors += 1
            continue

        print(f"[{i}/{total}] Processing ({source}): {filename}")

        for attempt in range(MAX_RETRIES):
            try:
                result = extract_links(client, video_path)
                links = result.get("links", [])
                results[filename] = result
                processed += 1
                total_links_found += len(links)
                urls_with_real = sum(1 for l in links if l.get("url") and l["url"].startswith("http"))
                print(f"  -> Found {len(links)} links ({urls_with_real} with real URLs)")

                # Save after each
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
                    results[filename] = {"links": [], "error": str(e)}
                    errors += 1
                    with open(OUTPUT_FILE, "w") as f:
                        json.dump(results, f, indent=2, ensure_ascii=False)

        time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\nDone!")
    print(f"  Processed: {processed}")
    print(f"  Skipped (resumed): {skipped}")
    print(f"  Errors: {errors}")
    print(f"  Total links found: {total_links_found}")
    print(f"Results saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
