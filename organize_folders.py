#!/usr/bin/env python3
"""Organize videos into category folders using symlinks."""

import json
import os
from collections import Counter

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    classifications_path = os.path.join(base_dir, "videos", "classifications.json")
    classified_dir = os.path.join(base_dir, "videos", "classified")

    with open(classifications_path, "r") as f:
        classifications = json.load(f)

    # Count videos per category
    category_counts = Counter()

    for filename, info in classifications.items():
        category = info.get("category", "Uncategorized")
        # Sanitize category name for use as directory name
        safe_category = category.replace("/", "-").replace("\\", "-")
        category_dir = os.path.join(classified_dir, safe_category)
        os.makedirs(category_dir, exist_ok=True)

        symlink_path = os.path.join(category_dir, filename)
        # Relative target: from videos/classified/{category}/ back to videos/user_saved/
        target = os.path.join("..", "..", "user_saved", filename)

        if os.path.islink(symlink_path):
            os.remove(symlink_path)

        os.symlink(target, symlink_path)
        category_counts[safe_category] += 1

    # Print summary
    print("Videos organized by category:")
    print("-" * 40)
    for category, count in sorted(category_counts.items()):
        print(f"  {category}: {count}")
    print("-" * 40)
    print(f"  Total: {sum(category_counts.values())}")


if __name__ == "__main__":
    main()
