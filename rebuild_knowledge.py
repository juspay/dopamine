#!/usr/bin/env python3
"""Rebuild knowledge base files with resolved links from links_v2.json."""

import sys
sys.stdout.reconfigure(line_buffering=True)

import json
import subprocess
from pathlib import Path

LINKS_FILE = Path("videos/links_v2.json")
KB1_FILE = Path("videos/knowledge_base.json")
KB2_FILE = Path("videos/knowledge_base_batch2.json")


def build_links_lookup(links_data):
    """Build a lookup from filename -> list of link dicts for knowledge base format."""
    lookup = {}
    for fname, entry in links_data.items():
        links = entry.get("links", [])
        # Convert to knowledge base format
        kb_links = []
        for link in links:
            url = link.get("url")
            if url and str(url).lower() not in ("null", "none", ""):
                kb_link = {
                    "url": url,
                    "description": link.get("description", link.get("name", "")),
                    "timestamp": link.get("timestamp", "")
                }
                kb_links.append(kb_link)
            else:
                # Keep it but with the name as url (original behavior)
                kb_link = {
                    "url": link.get("name", ""),
                    "description": link.get("description", ""),
                    "timestamp": link.get("timestamp", "")
                }
                kb_links.append(kb_link)
        lookup[fname] = kb_links
    return lookup


def update_kb(kb_file, links_lookup):
    """Update a knowledge base file with resolved links."""
    print(f"\nUpdating {kb_file}...")
    with open(kb_file) as f:
        kb = json.load(f)

    updated = 0
    skipped = 0
    for fname, entry in kb.items():
        if fname in links_lookup:
            entry["links_and_resources"] = links_lookup[fname]
            updated += 1
        else:
            skipped += 1

    with open(kb_file, "w") as f:
        json.dump(kb, f, indent=2)

    print(f"  Updated {updated} entries, skipped {skipped} (no links data)")
    return updated, skipped


def main():
    print("Loading links_v2.json...")
    with open(LINKS_FILE) as f:
        links_data = json.load(f)

    print(f"Links entries: {len(links_data)}")

    # Count resolved URLs
    total_links = 0
    resolved = 0
    for entry in links_data.values():
        for link in entry.get("links", []):
            total_links += 1
            url = link.get("url")
            if url and str(url).startswith("http"):
                resolved += 1

    print(f"Total links: {total_links}")
    print(f"Resolved (http): {resolved}")
    print(f"Unresolved: {total_links - resolved}")

    # Build lookup
    links_lookup = build_links_lookup(links_data)

    # Update both KB files
    u1, s1 = update_kb(KB1_FILE, links_lookup)
    u2, s2 = update_kb(KB2_FILE, links_lookup)

    # Regenerate markdown
    print("\nRegenerating markdown files...")
    result = subprocess.run(
        [sys.executable, "generate_markdown.py"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("  Markdown generation successful!")
        if result.stdout.strip():
            # Print last few lines
            lines = result.stdout.strip().split("\n")
            for line in lines[-5:]:
                print(f"  {line}")
    else:
        print(f"  Markdown generation failed: {result.stderr}")

    # Regenerate dashboard
    print("\nRegenerating dashboard...")
    result = subprocess.run(
        [sys.executable, "build_dashboard_v2.py"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("  Dashboard generation successful!")
        if result.stdout.strip():
            lines = result.stdout.strip().split("\n")
            for line in lines[-5:]:
                print(f"  {line}")
    else:
        print(f"  Dashboard generation failed: {result.stderr}")

    # Final stats
    print(f"\n{'='*60}")
    print(f"REBUILD STATS")
    print(f"{'='*60}")
    print(f"KB1 updated: {u1} entries")
    print(f"KB2 updated: {u2} entries")
    print(f"Total links: {total_links}")
    print(f"Resolved URLs: {resolved}/{total_links} ({100*resolved//total_links}%)")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
