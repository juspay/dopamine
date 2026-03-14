#!/usr/bin/env python3
"""Generate markdown files for each video in the knowledge base."""

import sys
sys.stdout.reconfigure(line_buffering=True)

import json
import os
import re
from datetime import datetime


def sanitize_filename(name):
    """Convert a string into a safe filename."""
    name = re.sub(r'[^\w\s\-]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    return name[:80] if name else 'untitled'


def sanitize_dirname(name):
    """Convert a category name to a safe directory name."""
    name = re.sub(r'[^\w\s\-&]', '', name)
    name = re.sub(r'\s+', '_', name.strip())
    return name


def format_duration(seconds):
    """Format duration in seconds to mm:ss or hh:mm:ss."""
    if seconds is None:
        return "N/A"
    seconds = int(seconds)
    if seconds >= 3600:
        return f"{seconds // 3600}:{(seconds % 3600) // 60:02d}:{seconds % 60:02d}"
    return f"{seconds // 60}:{seconds % 60:02d}"


def format_transcript(transcript):
    """Format transcript which can be a string or list."""
    if transcript is None:
        return "_No transcript available._"
    if isinstance(transcript, list):
        return "\n".join(f"> {line}" for line in transcript if line)
    if isinstance(transcript, str):
        if not transcript.strip():
            return "_No transcript available._"
        return transcript
    return str(transcript)


def format_visual_description(visual):
    """Format visual description which can be a string or list of dicts."""
    if visual is None:
        return "_No visual description available._"
    if isinstance(visual, str):
        return visual if visual.strip() else "_No visual description available._"
    if isinstance(visual, list):
        parts = []
        for item in visual:
            if isinstance(item, dict):
                ts = item.get('timestamp', '')
                desc = item.get('description', '')
                parts.append(f"**[{ts}]** {desc}")
            else:
                parts.append(str(item))
        return "\n\n".join(parts) if parts else "_No visual description available._"
    return str(visual)


def build_metadata_index(metadata_list):
    """Build lookup dicts from metadata list: by pk and by filename pattern."""
    by_pk = {}
    by_username_pk = {}
    for entry in metadata_list:
        pk = str(entry.get('pk', ''))
        username = entry.get('username', '')
        if pk:
            by_pk[pk] = entry
        if username and pk:
            key = f"{username}_{pk}.mp4"
            by_username_pk[key] = entry


    return by_pk, by_username_pk


def find_metadata(filename, kb_entry, by_pk, by_username_pk):
    """Find metadata for a knowledge base entry."""
    # Direct filename match
    if filename in by_username_pk:
        return by_username_pk[filename]
    # Try by pk from kb_entry
    pk = kb_entry.get('pk')
    if pk and str(pk) in by_pk:
        return by_pk[str(pk)]
    # Try extracting pk from filename (pattern: username_pk.mp4)
    match = re.search(r'_(\d{10,})\.mp4$', filename)
    if match:
        pk_str = match.group(1)
        if pk_str in by_pk:
            return by_pk[pk_str]
    return None


def generate_markdown(filename, kb_entry, classification, metadata, video_props):
    """Generate markdown content for a single video."""
    # Gather data from all sources
    category = kb_entry.get('category', classification.get('category', 'Uncategorized') if classification else 'Uncategorized')
    subcategory = kb_entry.get('subcategory', classification.get('subcategory', '') if classification else '')

    # Username and full name
    username = kb_entry.get('username') or (classification or {}).get('username') or (metadata or {}).get('username') or 'unknown'
    full_name = (metadata or {}).get('full_name', '')

    # Description / title
    description = (classification or {}).get('description', '')
    caption = (metadata or {}).get('caption_text', '')
    title = description or caption or f"Video by @{username}"
    # Truncate title if too long for heading
    if len(title) > 120:
        title = title[:117] + "..."

    # Date
    taken_at = (metadata or {}).get('taken_at', 'N/A')
    if taken_at and taken_at != 'N/A':
        try:
            dt = datetime.fromisoformat(taken_at)
            taken_at = dt.strftime('%B %d, %Y')
        except (ValueError, TypeError):
            pass

    # Duration
    duration_raw = (video_props or {}).get('duration')
    duration = format_duration(duration_raw)

    # Likes
    like_count = (metadata or {}).get('like_count', 'N/A')
    if isinstance(like_count, (int, float)):
        like_count = f"{int(like_count):,}"

    # Tags
    tags = (classification or {}).get('tags', kb_entry.get('classification_tags', []))
    tags_str = ", ".join(tags) if tags else "N/A"

    # Source line
    source = f"@{username}"
    if full_name:
        source += f" ({full_name})"

    # Build markdown
    lines = []
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"**Source:** {source}  ")
    lines.append(f"**Date:** {taken_at}  ")
    lines.append(f"**Duration:** {duration}  ")
    lines.append(f"**Category:** {category}" + (f" > {subcategory}" if subcategory else ""))
    lines.append(f"  ")
    lines.append(f"**Likes:** {like_count}  ")
    lines.append(f"**Tags:** {tags_str}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Transcript
    lines.append("## Transcript")
    lines.append("")
    lines.append(format_transcript(kb_entry.get('transcript')))
    lines.append("")

    # Visual description
    lines.append("## What's Shown on Screen")
    lines.append("")
    lines.append(format_visual_description(kb_entry.get('visual_description')))
    lines.append("")

    # Links & Resources
    links = kb_entry.get('links_and_resources', [])
    lines.append("## Links & Resources")
    lines.append("")
    if links:
        lines.append("| Resource | Description | Timestamp |")
        lines.append("|----------|-------------|-----------|")
        for link in links:
            url = link.get('url', '')
            desc = link.get('description', '')
            ts = link.get('timestamp', '')
            lines.append(f"| {url} | {desc} | {ts} |")
    else:
        lines.append("_No links or resources mentioned._")
    lines.append("")

    # Key Takeaways
    takeaways = kb_entry.get('key_takeaways', [])
    lines.append("## Key Takeaways")
    lines.append("")
    if takeaways:
        for t in takeaways:
            lines.append(f"- {t}")
    else:
        lines.append("_No key takeaways extracted._")
    lines.append("")

    # Topics
    topics = kb_entry.get('topics', [])
    lines.append("## Topics")
    lines.append("")
    if topics:
        lines.append(" ".join(f"`{t}`" for t in topics))
    else:
        lines.append("_No topics identified._")
    lines.append("")

    return "\n".join(lines), category


def generate_index(all_entries):
    """Generate INDEX.md with table of contents grouped by category."""
    lines = []
    lines.append("# Knowledge Base Index")
    lines.append("")
    lines.append(f"_Generated on {datetime.now().strftime('%B %d, %Y')} | {len(all_entries)} videos total_")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Group by category
    by_category = {}
    for entry in all_entries:
        cat = entry['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(entry)

    # Table of contents
    lines.append("## Categories")
    lines.append("")
    for cat in sorted(by_category.keys()):
        count = len(by_category[cat])
        anchor = cat.lower().replace(' ', '-').replace('&', '').replace('--', '-').strip('-')
        lines.append(f"- [{cat}](#{anchor}) ({count})")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Each category section
    for cat in sorted(by_category.keys()):
        entries = by_category[cat]
        lines.append(f"## {cat}")
        lines.append("")
        lines.append("| # | Title | Author | Duration | Likes |")
        lines.append("|---|-------|--------|----------|-------|")
        for i, e in enumerate(sorted(entries, key=lambda x: x['title']), 1):
            rel_path = f"{sanitize_dirname(cat)}/{e['md_filename']}"
            title_short = e['title'][:60] + "..." if len(e['title']) > 60 else e['title']
            # Escape pipes in title
            title_short = title_short.replace('|', '\\|')
            lines.append(f"| {i} | [{title_short}]({rel_path}) | @{e['username']} | {e['duration']} | {e['likes']} |")
        lines.append("")

    return "\n".join(lines)


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    videos_dir = os.path.join(base_dir, "videos")
    output_dir = os.path.join(base_dir, "knowledge_base")

    print("Loading data files...")

    with open(os.path.join(videos_dir, "knowledge_base.json")) as f:
        kb1 = json.load(f)
    print(f"  knowledge_base.json: {len(kb1)} entries")

    with open(os.path.join(videos_dir, "knowledge_base_batch2.json")) as f:
        kb2 = json.load(f)
    print(f"  knowledge_base_batch2.json: {len(kb2)} entries")

    with open(os.path.join(videos_dir, "classifications.json")) as f:
        classifications = json.load(f)
    print(f"  classifications.json: {len(classifications)} entries")

    with open(os.path.join(videos_dir, "metadata.json")) as f:
        metadata_list = json.load(f)
    print(f"  metadata.json: {len(metadata_list)} entries")

    with open(os.path.join(videos_dir, "video_properties.json")) as f:
        video_props = json.load(f)
    print(f"  video_properties.json: {len(video_props)} entries")

    # Merge knowledge bases
    knowledge_base = {}
    knowledge_base.update(kb1)
    knowledge_base.update(kb2)
    print(f"\nMerged knowledge base: {len(knowledge_base)} videos")

    # Build metadata index
    by_pk, by_username_pk = build_metadata_index(metadata_list)
    print(f"Metadata indexed: {len(by_pk)} by pk, {len(by_username_pk)} by filename")

    # Process each video
    os.makedirs(output_dir, exist_ok=True)
    index_entries = []
    generated = 0
    skipped = 0

    for filename, kb_entry in knowledge_base.items():
        classification = classifications.get(filename)
        meta = find_metadata(filename, kb_entry, by_pk, by_username_pk)
        props = video_props.get(filename)

        # Generate markdown
        md_content, category = generate_markdown(filename, kb_entry, classification, meta, props)

        # Create category directory
        cat_dir = os.path.join(output_dir, sanitize_dirname(category))
        os.makedirs(cat_dir, exist_ok=True)

        # Determine markdown filename
        username = kb_entry.get('username') or (classification or {}).get('username') or (meta or {}).get('username') or 'unknown'
        # Use the video filename stem as the md filename for uniqueness
        stem = filename.replace('.mp4', '')
        md_filename = f"{stem}.md"

        # Write file
        filepath = os.path.join(cat_dir, md_filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(md_content)
        generated += 1

        # Collect for index
        description = (classification or {}).get('description', '')
        caption = (meta or {}).get('caption_text', '')
        title = description or caption or f"Video by @{username}"
        if len(title) > 120:
            title = title[:117] + "..."

        duration_raw = (props or {}).get('duration')
        like_count = (meta or {}).get('like_count', 'N/A')
        if isinstance(like_count, (int, float)):
            like_count = f"{int(like_count):,}"

        index_entries.append({
            'category': category,
            'title': title,
            'username': username,
            'duration': format_duration(duration_raw),
            'likes': like_count,
            'md_filename': md_filename,
        })

        if generated % 10 == 0:
            print(f"  Generated {generated} files...")

    print(f"\nGenerated {generated} markdown files")

    # Generate INDEX.md
    index_content = generate_index(index_entries)
    index_path = os.path.join(output_dir, "INDEX.md")
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_content)
    print(f"Generated INDEX.md with {len(index_entries)} entries")

    # Summary
    categories = set(e['category'] for e in index_entries)
    print(f"\nCategories ({len(categories)}):")
    for cat in sorted(categories):
        count = sum(1 for e in index_entries if e['category'] == cat)
        print(f"  {cat}: {count} videos")

    print(f"\nDone! Files written to: {output_dir}")


if __name__ == "__main__":
    main()
