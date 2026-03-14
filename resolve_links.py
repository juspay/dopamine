#!/usr/bin/env python3
"""Resolve null/invalid URLs in links_v2.json using Gemini with Google Search grounding."""

import sys
sys.stdout.reconfigure(line_buffering=True)

import json
import re
import time
import traceback
from pathlib import Path

from google import genai
from google.genai import types
from google.genai.types import Tool, GoogleSearch

# Configuration
PROJECT = "your-gcp-project-id"
LOCATION = "us-central1"
MODEL = "gemini-2.0-flash"
LINKS_FILE = Path("videos/links_v2.json")

# Rate limiting
DELAY_BETWEEN_REQUESTS = 1.5
MAX_RETRIES = 3
RETRY_BASE_DELAY = 10


def needs_resolution(url):
    """Check if a URL needs to be resolved."""
    if url is None:
        return True
    url_str = str(url).strip()
    if url_str == "" or url_str.lower() == "null" or url_str.lower() == "none":
        return True
    if url_str.startswith("http://") or url_str.startswith("https://"):
        return False
    # It's a partial URL or product name — needs resolution
    return True


def try_fix_partial_url(url_str):
    """Try to fix obvious partial URLs without calling Gemini."""
    if url_str is None:
        return None
    url_str = str(url_str).strip()
    if url_str.lower() in ("null", "none", ""):
        return None

    # If it looks like a domain or path (contains . or /), prepend https://
    if re.match(r'^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]', url_str):
        return f"https://{url_str}"
    if url_str.startswith("github.com/") or url_str.startswith("gitlab.com/"):
        return f"https://{url_str}"
    if url_str.startswith("www."):
        return f"https://{url_str}"

    return None


def resolve_with_gemini(client, name, description, url_hint=None):
    """Use Gemini with Google Search grounding to find the actual URL."""
    google_search_tool = Tool(google_search=GoogleSearch())

    context_parts = []
    if description and str(description).lower() not in ("null", "none", ""):
        context_parts.append(f"Description: {description}")
    if url_hint and str(url_hint).lower() not in ("null", "none", ""):
        context_parts.append(f"Possible URL hint: {url_hint}")

    context = ". ".join(context_parts) if context_parts else ""

    prompt = (
        f"What is the official website URL for \"{name}\"? "
        f"{context}. "
        f"Return ONLY the full URL starting with https://, nothing else. "
        f"If it's a GitHub project, return the GitHub URL. "
        f"If you cannot find an exact URL, return your best guess. "
        f"Return ONLY one URL, no explanation."
    )

    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[google_search_tool],
                    temperature=0.0,
                )
            )
            result = response.text.strip()
            # Extract URL from response
            url_match = re.search(r'https?://[^\s<>"\')\]]+', result)
            if url_match:
                return url_match.group(0).rstrip('.')
            return None
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_BASE_DELAY * (attempt + 1)
                print(f"  Retry {attempt+1} after error: {e}")
                time.sleep(delay)
            else:
                print(f"  Failed after {MAX_RETRIES} attempts: {e}")
                return None


def resolve_with_gemini_no_search(client, name, description, url_hint=None):
    """Fallback: use Gemini without grounding."""
    context_parts = []
    if description and str(description).lower() not in ("null", "none", ""):
        context_parts.append(f"Description: {description}")
    if url_hint and str(url_hint).lower() not in ("null", "none", ""):
        context_parts.append(f"Possible URL hint: {url_hint}")

    context = ". ".join(context_parts) if context_parts else ""

    prompt = (
        f"What is the official website URL for \"{name}\"? "
        f"{context}. "
        f"Return ONLY the full URL starting with https://, nothing else."
    )

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,
            )
        )
        result = response.text.strip()
        url_match = re.search(r'https?://[^\s<>"\')\]]+', result)
        if url_match:
            return url_match.group(0).rstrip('.')
    except Exception as e:
        print(f"  Fallback also failed: {e}")
    return None


def main():
    print("Loading links_v2.json...")
    with open(LINKS_FILE) as f:
        links_data = json.load(f)

    # Collect all links that need resolution
    to_resolve = []
    for fname, entry in links_data.items():
        for i, link in enumerate(entry.get("links", [])):
            url = link.get("url")
            if needs_resolution(url):
                to_resolve.append((fname, i, link))

    print(f"Total entries: {len(links_data)}")
    total_links = sum(len(e.get("links", [])) for e in links_data.values())
    print(f"Total links: {total_links}")
    print(f"Links needing resolution: {len(to_resolve)}")

    # First pass: fix obvious partial URLs without API calls
    fixed_locally = 0
    still_need_api = []
    for fname, idx, link in to_resolve:
        url = link.get("url")
        fixed = try_fix_partial_url(url)
        if fixed:
            links_data[fname]["links"][idx]["url"] = fixed
            fixed_locally += 1
            print(f"  Fixed locally: {link['name']} -> {fixed}")
        else:
            still_need_api.append((fname, idx, link))

    print(f"\nFixed locally (partial URLs): {fixed_locally}")
    print(f"Still need API resolution: {len(still_need_api)}")

    # Deduplicate by name to avoid redundant API calls
    name_to_url = {}  # name -> resolved url
    unique_names = {}
    for fname, idx, link in still_need_api:
        name = link["name"].strip().lower()
        if name not in unique_names:
            unique_names[name] = link

    print(f"Unique names to resolve: {len(unique_names)}")

    # Initialize Gemini client
    client = genai.Client(
        vertexai=True,
        project=PROJECT,
        location=LOCATION,
    )

    # Resolve each unique name
    resolved_count = 0
    failed_count = 0
    for i, (name_key, link) in enumerate(unique_names.items()):
        name = link["name"]
        desc = link.get("description", "")
        url_hint = link.get("url")

        print(f"\n[{i+1}/{len(unique_names)}] Resolving: {name}")

        # Try Gemini with Google Search grounding
        url = resolve_with_gemini(client, name, desc, url_hint)

        if not url:
            print(f"  Grounded search failed, trying without grounding...")
            url = resolve_with_gemini_no_search(client, name, desc, url_hint)

        if url:
            name_to_url[name_key] = url
            resolved_count += 1
            print(f"  Resolved: {url}")
        else:
            failed_count += 1
            print(f"  FAILED to resolve")

        time.sleep(DELAY_BETWEEN_REQUESTS)

    # Apply resolved URLs back to all matching links
    applied = 0
    for fname, idx, link in still_need_api:
        name_key = link["name"].strip().lower()
        if name_key in name_to_url:
            links_data[fname]["links"][idx]["url"] = name_to_url[name_key]
            applied += 1

    # Save updated file
    print(f"\nSaving updated links_v2.json...")
    with open(LINKS_FILE, "w") as f:
        json.dump(links_data, f, indent=2)

    # Final stats
    remaining_null = 0
    remaining_non_http = 0
    total_final = 0
    for fname, entry in links_data.items():
        for link in entry.get("links", []):
            total_final += 1
            url = link.get("url")
            if url is None or str(url).lower() in ("null", "none", ""):
                remaining_null += 1
            elif not str(url).startswith("http"):
                remaining_non_http += 1

    print(f"\n{'='*60}")
    print(f"RESOLUTION STATS")
    print(f"{'='*60}")
    print(f"Total links: {total_final}")
    print(f"Fixed locally (partial URLs): {fixed_locally}")
    print(f"Resolved via Gemini: {resolved_count}")
    print(f"Failed to resolve: {failed_count}")
    print(f"Applied to entries: {applied}")
    print(f"Remaining null/empty: {remaining_null}")
    print(f"Remaining non-http: {remaining_non_http}")
    print(f"Total valid http(s) URLs: {total_final - remaining_null - remaining_non_http}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
