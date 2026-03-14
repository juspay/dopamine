#!/usr/bin/env python3
"""Generate a unified searchable catalog from Instagram metadata, ffprobe data, and Gemini classifications."""

import json
import csv
import re
import os

VIDEOS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos")


def extract_hashtags(caption):
    """Extract hashtags from caption text."""
    if not caption:
        return []
    return re.findall(r"#(\w+)", caption)


def parse_filename(filename):
    """Extract username and pk from filename pattern: {username}_{pk}.mp4"""
    match = re.match(r"^(.+)_(\d+)\.mp4$", filename)
    if match:
        return match.group(1), match.group(2)
    return None, None


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    metadata_list = load_json(os.path.join(VIDEOS_DIR, "metadata.json"))
    video_props = load_json(os.path.join(VIDEOS_DIR, "video_properties.json"))
    classifications = load_json(os.path.join(VIDEOS_DIR, "classifications.json"))

    # Index metadata by pk (string)
    meta_by_pk = {}
    for entry in metadata_list:
        pk = str(entry.get("pk", ""))
        if pk:
            meta_by_pk[pk] = entry

    # Build catalog from classifications (169 entries, one per video file)
    catalog = []

    for filename in sorted(classifications.keys()):
        cls = classifications[filename]
        props = video_props.get(filename, {})

        # Try to find Instagram metadata
        # 1. Use pk from classification if available
        # 2. Parse pk from filename
        meta = None
        cls_pk = cls.get("pk")
        if cls_pk:
            meta = meta_by_pk.get(str(cls_pk))
        if not meta:
            _, file_pk = parse_filename(filename)
            if file_pk:
                meta = meta_by_pk.get(file_pk)

        caption = meta.get("caption_text", "") if meta else ""
        hashtags = extract_hashtags(caption)

        width = props.get("width", 0)
        height = props.get("height", 0)
        resolution = f"{width}x{height}" if width and height else ""
        file_size_mb = round(props.get("file_size", 0) / (1024 * 1024), 2) if props.get("file_size") else 0

        record = {
            "filename": filename,
            "category": cls.get("category", ""),
            "subcategory": cls.get("subcategory", ""),
            "tags": cls.get("tags", []),
            "description": cls.get("description", ""),
            "duration_seconds": props.get("duration", 0),
            "resolution": resolution,
            "file_size_mb": file_size_mb,
            "instagram_user": cls.get("username") or (meta.get("username", "") if meta else ""),
            "caption": caption,
            "hashtags": hashtags,
            "language": cls.get("language", ""),
            "mood": cls.get("mood", ""),
            "taken_at": meta.get("taken_at", "") if meta else "",
            "like_count": meta.get("like_count", 0) if meta else 0,
            "comment_count": meta.get("comment_count", 0) if meta else 0,
        }
        catalog.append(record)

    # Save JSON
    json_path = os.path.join(VIDEOS_DIR, "catalog.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    print(f"Saved {json_path} ({len(catalog)} records)")

    # Save CSV
    csv_path = os.path.join(VIDEOS_DIR, "catalog.csv")
    fieldnames = [
        "filename", "category", "subcategory", "tags", "description",
        "duration_seconds", "resolution", "file_size_mb", "instagram_user",
        "caption", "hashtags", "language", "mood", "taken_at",
        "like_count", "comment_count"
    ]
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for record in catalog:
            row = dict(record)
            row["tags"] = ";".join(row["tags"])
            row["hashtags"] = ";".join(row["hashtags"])
            writer.writerow(row)
    print(f"Saved {csv_path} ({len(catalog)} records)")

    # Summary stats
    print(f"\n=== Summary ===")
    print(f"Total videos: {len(catalog)}")
    category_counts = {}
    for r in catalog:
        cat = r["category"] or "(uncategorized)"
        category_counts[cat] = category_counts.get(cat, 0) + 1
    print(f"\nCategories ({len(category_counts)}):")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()
