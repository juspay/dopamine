#!/usr/bin/env python3
"""Merge extracted links back into knowledge base files."""

import sys
sys.stdout.reconfigure(line_buffering=True)

import json
from pathlib import Path

LINKS_FILE = Path("videos/links_v2.json")
KB1_FILE = Path("videos/knowledge_base.json")
KB2_FILE = Path("videos/knowledge_base_batch2.json")


def main():
    # Load links
    with open(LINKS_FILE) as f:
        links_data = json.load(f)
    print(f"Loaded links for {len(links_data)} videos")

    # Load knowledge bases
    with open(KB1_FILE) as f:
        kb1 = json.load(f)
    with open(KB2_FILE) as f:
        kb2 = json.load(f)
    print(f"KB1: {len(kb1)} videos, KB2: {len(kb2)} videos")

    # Stats
    total_links = 0
    real_urls = 0
    null_urls = 0
    videos_updated = 0

    def merge_links(kb, name):
        nonlocal total_links, real_urls, null_urls, videos_updated
        for filename in kb:
            if filename in links_data:
                new_links = links_data[filename].get("links", [])
                if new_links:
                    # Convert to the knowledge base format
                    formatted_links = []
                    for link in new_links:
                        entry = {
                            "name": link.get("name", ""),
                            "url": link.get("url"),
                            "type": link.get("type", "inferred_from_context"),
                            "description": link.get("description", ""),
                            "timestamp": link.get("timestamp", ""),
                        }
                        formatted_links.append(entry)
                        total_links += 1
                        if entry["url"] and isinstance(entry["url"], str) and entry["url"].startswith("http"):
                            real_urls += 1
                        else:
                            null_urls += 1

                    kb[filename]["links_and_resources"] = formatted_links
                    videos_updated += 1
                else:
                    # No links found - set empty
                    kb[filename]["links_and_resources"] = []
            else:
                print(f"  WARNING: No link data for {filename}")

    merge_links(kb1, "KB1")
    merge_links(kb2, "KB2")

    # Save updated knowledge bases
    with open(KB1_FILE, "w") as f:
        json.dump(kb1, f, indent=2, ensure_ascii=False)
    print(f"Saved updated {KB1_FILE}")

    with open(KB2_FILE, "w") as f:
        json.dump(kb2, f, indent=2, ensure_ascii=False)
    print(f"Saved updated {KB2_FILE}")

    # Print stats
    print(f"\n=== MERGE STATS ===")
    print(f"Videos updated: {videos_updated}")
    print(f"Total links: {total_links}")
    print(f"Real URLs (https://...): {real_urls}")
    print(f"Null/missing URLs: {null_urls}")
    print(f"URL coverage: {real_urls}/{total_links} ({100*real_urls/max(total_links,1):.1f}%)")


if __name__ == "__main__":
    main()
