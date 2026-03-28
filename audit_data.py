#!/usr/bin/env python3
"""
Data Quality Audit & Auto-Fix Script for Dopamine Video Pipeline
================================================================
Checks all JSON data files for quality issues, prints a detailed report,
auto-fixes what is safe to fix, and lists items needing manual review.
"""

import json
import os
import sys
from collections import Counter
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).resolve().parent
VIDEOS = BASE / "videos"

# ── helpers ──────────────────────────────────────────────────────────────────

def load_json(name):
    path = VIDEOS / name
    with open(path) as f:
        return json.load(f)

def save_json(name, data):
    path = VIDEOS / name
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def header(title):
    print(f"\n{'='*72}")
    print(f"  {title}")
    print(f"{'='*72}")

def subheader(title):
    print(f"\n--- {title} ---")

def issue(msg, level="ISSUE"):
    print(f"  [{level}] {msg}")

def fixed(msg):
    print(f"  [FIXED] {msg}")

def manual(msg):
    print(f"  [MANUAL] {msg}")

# ── state ────────────────────────────────────────────────────────────────────

fixes_applied = 0
issues_found = 0
manual_review = []

def count_issue():
    global issues_found
    issues_found += 1

def count_fix():
    global fixes_applied
    fixes_applied += 1

def add_manual(item):
    manual_review.append(item)

# ── load data ────────────────────────────────────────────────────────────────

classifications = load_json("classifications.json")
knowledge_base = load_json("knowledge_base.json")
analysis = load_json("analysis.json")
verifications = load_json("verifications.json")
catalog = load_json("catalog.json")
links_v2 = load_json("links_v2.json")

disk_files = set(os.listdir(VIDEOS / "user_saved"))
classified_dir = VIDEOS / "classified"
classified_files = {}  # filename -> directory category
for cat in os.listdir(classified_dir):
    cat_path = classified_dir / cat
    if cat_path.is_dir():
        for f in os.listdir(cat_path):
            classified_files[f] = cat

# ═════════════════════════════════════════════════════════════════════════════
# 1. CLASSIFICATIONS.JSON
# ═════════════════════════════════════════════════════════════════════════════

header("1. classifications.json")

# 1a. Empty categories
subheader("1a. Empty / blank categories (unclassified videos)")
empty_cat_files = [k for k, v in classifications.items()
                   if not v.get("category", "").strip()]
print(f"  Found {len(empty_cat_files)} videos with empty category")
for f in sorted(empty_cat_files)[:10]:
    issue(f"{f}")
    count_issue()
if len(empty_cat_files) > 10:
    issue(f"  ... and {len(empty_cat_files) - 10} more")

# 1b. Duplicate / overlapping categories
subheader("1b. Duplicate / overlapping categories")
cat_counter = Counter(v.get("category", "") for v in classifications.values())
merge_map = {
    "Comedy": "Comedy & Humor",
    "Entertainment": "Anime & Entertainment",
    "Kids & Parenting": "Parenting",
    "Lifestyle": "Travel & Lifestyle",
}
for old_cat, new_cat in merge_map.items():
    if old_cat in cat_counter:
        issue(f'"{old_cat}" ({cat_counter[old_cat]}) should merge into "{new_cat}" ({cat_counter[new_cat]})')
        count_issue()

# AUTO-FIX: merge duplicate categories in classifications.json
for fname, entry in classifications.items():
    cat = entry.get("category", "")
    if cat in merge_map:
        old = cat
        entry["category"] = merge_map[cat]
        fixed(f'{fname}: category "{old}" -> "{merge_map[old]}"')
        count_fix()
save_json("classifications.json", classifications)

# 1c. Classified directory vs JSON category name mismatch (UI-UX vs UI/UX)
subheader("1c. Classified directory vs JSON category naming")
dir_json_mismatches = []
for fname, dir_cat in classified_files.items():
    json_cat = classifications.get(fname, {}).get("category", "")
    if json_cat and dir_cat != json_cat and dir_cat != "Uncategorized":
        # Normalize for known filesystem issue (/ -> -)
        if dir_cat.replace("-", "/") == json_cat:
            dir_json_mismatches.append((fname, dir_cat, json_cat))
if dir_json_mismatches:
    issue(f'{len(dir_json_mismatches)} files have dir name "UI-UX Design" vs JSON "UI/UX Design" (filesystem limitation, cosmetic only)')
    count_issue()

# 1d. Files in classified/Uncategorized that have empty category in JSON
subheader("1d. Uncategorized files needing classification")
uncategorized_dir = classified_dir / "Uncategorized"
if uncategorized_dir.is_dir():
    uncat_files = os.listdir(uncategorized_dir)
    print(f"  {len(uncat_files)} files in classified/Uncategorized/")
    for f in sorted(uncat_files)[:5]:
        add_manual(f"Classify video: {f}")
    if len(uncat_files) > 5:
        add_manual(f"... and {len(uncat_files) - 5} more uncategorized videos need classification")

# ═════════════════════════════════════════════════════════════════════════════
# 2. KNOWLEDGE_BASE.JSON
# ═════════════════════════════════════════════════════════════════════════════

header("2. knowledge_base.json")

# 2a. Empty / near-empty transcripts
subheader("2a. Empty or near-empty transcripts")
empty_transcripts = []
for fname, entry in knowledge_base.items():
    t = entry.get("transcript")
    if t is None:
        empty_transcripts.append((fname, "null"))
    elif isinstance(t, str) and len(t.strip()) <= 5:
        empty_transcripts.append((fname, repr(t.strip())))
print(f"  Found {len(empty_transcripts)} entries with empty/near-empty transcripts")
for fname, val in empty_transcripts:
    issue(f"{fname}: transcript={val}")
    count_issue()
    add_manual(f"Re-transcribe video: {fname}")

# 2b. Null fields
subheader("2b. Null field values")
null_fields = []
for fname, entry in knowledge_base.items():
    for field, val in entry.items():
        if val is None:
            null_fields.append((fname, field))
print(f"  Found {len(null_fields)} null field occurrences")
for fname, field in null_fields:
    issue(f"{fname}: field '{field}' is null")
    count_issue()

# AUTO-FIX: set null username to empty string (extractable from filename)
for fname, entry in knowledge_base.items():
    if entry.get("username") is None:
        # Try to extract username from filename pattern: username_pk.mp4
        parts = fname.rsplit("_", 1)
        if len(parts) == 2 and parts[1].replace(".mp4", "").isdigit():
            entry["username"] = parts[0]
            fixed(f"{fname}: set username to '{parts[0]}' (extracted from filename)")
            count_fix()
        else:
            entry["username"] = ""
            fixed(f"{fname}: set null username to empty string")
            count_fix()

# 2c. Inconsistent fields across entries
subheader("2c. Inconsistent fields across entries")
field_counts = Counter()
for entry in knowledge_base.values():
    for field in entry.keys():
        field_counts[field] += 1
total = len(knowledge_base)
core_fields = ["category", "subcategory", "username", "transcript",
               "visual_description", "links_and_resources", "key_takeaways", "topics"]
optional_fields_present = {}
for field, count in sorted(field_counts.items(), key=lambda x: -x[1]):
    if count < total:
        print(f"  Field '{field}': present in {count}/{total} entries")
        if field not in core_fields:
            optional_fields_present[field] = count

# 2d. Entries missing subcategory/username
missing_subcat = [k for k, v in knowledge_base.items() if "subcategory" not in v]
missing_user = [k for k, v in knowledge_base.items() if "username" not in v]
if missing_subcat:
    issue(f"{len(missing_subcat)} entries missing 'subcategory' field")
    count_issue()
if missing_user:
    issue(f"{len(missing_user)} entries missing 'username' field")
    count_issue()

# AUTO-FIX: add missing subcategory from classifications.json
for fname in missing_subcat:
    if fname in classifications:
        subcat = classifications[fname].get("subcategory", "")
        knowledge_base[fname]["subcategory"] = subcat
        fixed(f"{fname}: added subcategory='{subcat}' from classifications.json")
        count_fix()

# AUTO-FIX: add missing username from classifications.json or filename
for fname in missing_user:
    if fname in classifications and classifications[fname].get("username"):
        knowledge_base[fname]["username"] = classifications[fname]["username"]
        fixed(f"{fname}: added username from classifications.json")
        count_fix()
    else:
        parts = fname.rsplit("_", 1)
        if len(parts) == 2 and parts[1].replace(".mp4", "").isdigit():
            knowledge_base[fname]["username"] = parts[0]
            fixed(f"{fname}: set username to '{parts[0]}' (from filename)")
            count_fix()

# AUTO-FIX: remove stray 'filename' and 'pk' fields that only exist on some entries
# These are duplicated from other files; normalize by removing them
stray_fields = ["filename", "pk"]
stray_removed = 0
for fname, entry in knowledge_base.items():
    for sf in stray_fields:
        if sf in entry:
            del entry[sf]
            stray_removed += 1
if stray_removed:
    fixed(f"Removed {stray_removed} stray field(s) ('filename'/'pk') from knowledge_base entries for consistency")
    count_fix()

save_json("knowledge_base.json", knowledge_base)

# ═════════════════════════════════════════════════════════════════════════════
# 3. ANALYSIS.JSON
# ═════════════════════════════════════════════════════════════════════════════

header("3. analysis.json")

# 3a. 0 actionable items marked highly_useful
subheader("3a. Contradictions: 0 actionable items + highly_useful")
contradictions_a = []
for fname, entry in analysis.items():
    items = entry.get("actionable_items", [])
    pred = entry.get("usefulness_prediction", "")
    if len(items) == 0 and pred == "highly_useful":
        contradictions_a.append(fname)
if contradictions_a:
    for f in contradictions_a:
        issue(f"{f}")
        count_issue()
else:
    print("  None found.")

# 3b. not_useful but high implementability_score (>0 means actionable items exist)
subheader("3b. Contradictions: not_useful but positive implementability + actionable items")
contradictions_b = []
for fname, entry in analysis.items():
    pred = entry.get("usefulness_prediction", "")
    impl = entry.get("implementability_score", 0)
    items = entry.get("actionable_items", [])
    if pred == "not_useful" and impl > 0 and len(items) > 0:
        contradictions_b.append((fname, impl, len(items)))
for fname, impl, n_items in contradictions_b:
    issue(f"{fname}: prediction=not_useful but impl_score={impl}, items={n_items}")
    count_issue()
    add_manual(f"Review usefulness_prediction for {fname} (has {n_items} actionable items but marked not_useful)")

# AUTO-FIX: for entries with actionable items and implementability > 5 marked not_useful,
# downgrade to somewhat_useful (conservative fix)
for fname, impl, n_items in contradictions_b:
    if impl > 5:
        analysis[fname]["usefulness_prediction"] = "somewhat_useful"
        fixed(f'{fname}: changed not_useful -> somewhat_useful (impl={impl}, items={n_items})')
        count_fix()

# 3c. 0 actionable items but implementability_score > 5
subheader("3c. Contradictions: 0 items but implementability_score > 5")
for fname, entry in analysis.items():
    items = entry.get("actionable_items", [])
    impl = entry.get("implementability_score", 0)
    if len(items) == 0 and impl > 5:
        issue(f"{fname}: 0 items but impl_score={impl}")
        count_issue()

save_json("analysis.json", analysis)

# ═════════════════════════════════════════════════════════════════════════════
# 4. VERIFICATIONS.JSON
# ═════════════════════════════════════════════════════════════════════════════

header("4. verifications.json")

# 4a. Low confidence with definitive scores
subheader("4a. Low confidence (<5) entries")
low_conf = []
for fname, entry in verifications.items():
    conf = entry.get("confidence", 10)
    score = entry.get("overall_score", "")
    if conf < 5:
        low_conf.append((fname, conf, score))
        issue(f"{fname}: confidence={conf}, score={score}")
        count_issue()
print(f"  Total low confidence entries: {len(low_conf)}")

# 4b. Zero confidence entries (verification errors)
subheader("4b. Zero-confidence entries (verification failures)")
zero_conf = [(f, c, s) for f, c, s in low_conf if c == 0]
for fname, conf, score in zero_conf:
    summary = verifications[fname].get("summary", "")
    issue(f"{fname}: {summary}")
    add_manual(f"Re-verify video: {fname} (verification failed completely)")

# AUTO-FIX: for confidence=0 entries, set overall_score to "verification_failed" to be explicit
for fname, conf, score in zero_conf:
    if verifications[fname].get("overall_score") != "verification_failed":
        verifications[fname]["overall_score"] = "verification_failed"
        verifications[fname]["summary"] = verifications[fname].get("summary", "") + " [AUTO: marked as verification_failed due to confidence=0]"
        fixed(f'{fname}: set overall_score to "verification_failed"')
        count_fix()

# 4c. Confidence distribution
subheader("4c. Confidence distribution")
conf_dist = Counter(v.get("confidence", -1) for v in verifications.values())
for conf_val in sorted(conf_dist.keys()):
    print(f"  confidence={conf_val}: {conf_dist[conf_val]} entries")

save_json("verifications.json", verifications)

# ═════════════════════════════════════════════════════════════════════════════
# 5. CATALOG.JSON
# ═════════════════════════════════════════════════════════════════════════════

header("5. catalog.json")

# 5a. Entries with all-empty metadata (the 65 unclassified ones)
subheader("5a. Entries with empty core metadata")
empty_meta = []
for entry in catalog:
    if not entry.get("category", "").strip() and not entry.get("description", "").strip():
        empty_meta.append(entry["filename"])
print(f"  Found {len(empty_meta)} entries with empty category + description")
for f in sorted(empty_meta)[:5]:
    issue(f"{f}")
    count_issue()
if len(empty_meta) > 5:
    issue(f"  ... and {len(empty_meta) - 5} more")

# 5b. Inconsistent data types (duration_seconds: int vs float, file_size_mb: int vs float)
subheader("5b. Inconsistent data types")
type_issues = {}
for entry in catalog:
    for field in ("duration_seconds", "file_size_mb"):
        val = entry.get(field)
        t = type(val).__name__
        type_issues.setdefault(field, Counter())[t] += 1
for field, types in type_issues.items():
    if len(types) > 1:
        issue(f"'{field}' has mixed types: {dict(types)}")
        count_issue()

# AUTO-FIX: normalize int -> float for duration_seconds and file_size_mb
catalog_fixes = 0
for entry in catalog:
    for field in ("duration_seconds", "file_size_mb"):
        if isinstance(entry.get(field), int):
            entry[field] = float(entry[field])
            catalog_fixes += 1
if catalog_fixes:
    fixed(f"Converted {catalog_fixes} int values to float for duration_seconds/file_size_mb")
    count_fix()

# 5c. Empty instagram_user where it could be extracted from filename
subheader("5c. Missing instagram_user (extractable from filename)")
user_fixed = 0
for entry in catalog:
    if not entry.get("instagram_user", "").strip():
        fname = entry["filename"]
        parts = fname.rsplit("_", 1)
        if len(parts) == 2 and parts[1].replace(".mp4", "").isdigit():
            entry["instagram_user"] = parts[0]
            user_fixed += 1
if user_fixed:
    fixed(f"Extracted instagram_user from filename for {user_fixed} entries")
    count_fix()

# 5d. Empty taken_at
subheader("5d. Missing taken_at timestamps")
missing_taken = [e["filename"] for e in catalog if not e.get("taken_at", "").strip()]
if missing_taken:
    issue(f"{len(missing_taken)} entries have empty taken_at")
    count_issue()
    for f in missing_taken:
        add_manual(f"Find taken_at timestamp for: {f}")

# 5e. Sync categories from (now-fixed) classifications.json
subheader("5e. Syncing categories from classifications.json")
cat_synced = 0
for entry in catalog:
    fname = entry["filename"]
    if fname in classifications:
        cls_cat = classifications[fname].get("category", "")
        if cls_cat and entry.get("category", "") != cls_cat:
            entry["category"] = cls_cat
            cat_synced += 1
        cls_sub = classifications[fname].get("subcategory", "")
        if cls_sub and entry.get("subcategory", "") != cls_sub:
            entry["subcategory"] = cls_sub
if cat_synced:
    fixed(f"Synced {cat_synced} catalog categories from classifications.json (includes merge fixes)")
    count_fix()

save_json("catalog.json", catalog)

# ═════════════════════════════════════════════════════════════════════════════
# 6. LINKS_V2.JSON
# ═════════════════════════════════════════════════════════════════════════════

header("6. links_v2.json")

# 6a. Suspicious URLs
subheader("6a. Suspicious / clearly wrong URLs")
bad_patterns = ["localhost", "example.com", "127.0.0.1", "0.0.0.0",
                "example.org", "test.test"]
suspicious_urls = []
for fname, entry in links_v2.items():
    for link in entry.get("links", []):
        url = link.get("url", "")
        for pat in bad_patterns:
            if pat in url.lower():
                suspicious_urls.append((fname, url, pat))
                break
        # Check for youtube example URLs
        if "youtube.com/watch?v=example" in url.lower():
            suspicious_urls.append((fname, url, "youtube example"))
        # Check for testing/staging URLs
        if "testing--" in url and "getlazy.ai" in url:
            suspicious_urls.append((fname, url, "testing/staging URL"))

for fname, url, reason in suspicious_urls:
    issue(f"{fname}: {url} ({reason})")
    count_issue()
    add_manual(f"Fix or remove bad URL in {fname}: {url}")

# AUTO-FIX: remove clearly invalid example URLs
for fname, entry in links_v2.items():
    original_len = len(entry.get("links", []))
    entry["links"] = [
        link for link in entry.get("links", [])
        if "youtube.com/watch?v=example" not in link.get("url", "").lower()
    ]
    removed = original_len - len(entry["links"])
    if removed:
        fixed(f"{fname}: removed {removed} example YouTube URL(s)")
        count_fix()

# 6b. Inconsistent timestamp types (str vs int vs float)
subheader("6b. Inconsistent timestamp types in links")
ts_types = Counter()
ts_fixable = 0
for fname, entry in links_v2.items():
    for link in entry.get("links", []):
        ts = link.get("timestamp")
        ts_types[type(ts).__name__] += 1
if len(ts_types) > 1:
    issue(f"Mixed timestamp types: {dict(ts_types)}")
    count_issue()

# AUTO-FIX: normalize all timestamps to strings
for fname, entry in links_v2.items():
    for link in entry.get("links", []):
        ts = link.get("timestamp")
        if isinstance(ts, (int, float)):
            minutes = int(ts) // 60
            seconds = int(ts) % 60
            link["timestamp"] = f"{minutes}:{seconds:02d}"
            ts_fixable += 1
if ts_fixable:
    fixed(f"Converted {ts_fixable} numeric timestamps to string format (M:SS)")
    count_fix()

save_json("links_v2.json", links_v2)

# ═════════════════════════════════════════════════════════════════════════════
# 7. CROSS-REFERENCE CHECKS
# ═════════════════════════════════════════════════════════════════════════════

header("7. Cross-reference checks")

classifications_set = set(classifications.keys())
catalog_set = set(e["filename"] for e in catalog)
kb_set = set(knowledge_base.keys())
analysis_set = set(analysis.keys())
verif_set = set(verifications.keys())
links_set = set(links_v2.keys())

# 7a. Disk vs classifications
subheader("7a. Disk files vs classifications.json")
diff = disk_files - classifications_set
if diff:
    issue(f"{len(diff)} files on disk but NOT in classifications.json")
    count_issue()
else:
    print("  All disk files are in classifications.json. OK.")

diff = classifications_set - disk_files
if diff:
    issue(f"{len(diff)} entries in classifications.json but NOT on disk")
    count_issue()
else:
    print("  All classification entries have files on disk. OK.")

# 7b. Disk vs catalog
subheader("7b. Disk files vs catalog.json")
diff = disk_files - catalog_set
if diff:
    issue(f"{len(diff)} files on disk but NOT in catalog")
    count_issue()
else:
    print("  All disk files are in catalog. OK.")

# 7c. Knowledge base entries not in analysis (pipeline gap)
subheader("7c. Knowledge base entries missing from analysis.json (pipeline gap)")
kb_not_analysis = kb_set - analysis_set
if kb_not_analysis:
    issue(f"{len(kb_not_analysis)} entries in knowledge_base but NOT in analysis")
    count_issue()
    for f in sorted(kb_not_analysis):
        issue(f"  {f}")
        add_manual(f"Run analysis pipeline for: {f}")
else:
    print("  All KB entries have analysis. OK.")

# 7d. Analysis entries not in verifications
subheader("7d. Analysis entries missing from verifications.json")
analysis_not_verif = analysis_set - verif_set
if analysis_not_verif:
    issue(f"{len(analysis_not_verif)} entries in analysis but NOT in verifications")
    count_issue()
    for f in sorted(analysis_not_verif)[:10]:
        issue(f"  {f}")
        add_manual(f"Run verification pipeline for: {f}")
else:
    print("  All analysis entries are verified. OK.")

# 7e. KB and links_v2 should match
subheader("7e. Knowledge base vs links_v2.json")
if kb_set == links_set:
    print("  knowledge_base and links_v2 are in sync. OK.")
else:
    diff1 = kb_set - links_set
    diff2 = links_set - kb_set
    if diff1:
        issue(f"{len(diff1)} in KB but not in links_v2")
        count_issue()
    if diff2:
        issue(f"{len(diff2)} in links_v2 but not in KB")
        count_issue()

# 7f. Classified directory symlinks matching (after category merges)
subheader("7f. Classified directory symlink integrity")
broken_symlinks = 0
wrong_target = 0
for cat in os.listdir(classified_dir):
    cat_path = classified_dir / cat
    if cat_path.is_dir():
        for f in os.listdir(cat_path):
            fpath = cat_path / f
            if os.path.islink(fpath):
                target = os.readlink(fpath)
                if not os.path.exists(fpath):
                    broken_symlinks += 1
                    issue(f"Broken symlink: {fpath}")
                    count_issue()
if broken_symlinks:
    issue(f"Total broken symlinks: {broken_symlinks}")
else:
    print("  No broken symlinks found. OK.")

# Check for category merge issues in classified dir (symlinks in wrong category after merge)
subheader("7g. Classified directory categories needing update after merges")
symlinks_to_move = []
for fname, entry in classifications.items():
    json_cat = entry.get("category", "")
    if fname in classified_files:
        dir_cat = classified_files[fname]
        # Normalize filesystem-safe name
        fs_json_cat = json_cat.replace("/", "-")
        if dir_cat != json_cat and dir_cat != fs_json_cat and dir_cat != "Uncategorized":
            # This file was in a category that got merged
            if dir_cat in merge_map:
                symlinks_to_move.append((fname, dir_cat, json_cat))

if symlinks_to_move:
    issue(f"{len(symlinks_to_move)} symlinks need to be moved to match merged categories")
    count_issue()

    # AUTO-FIX: move symlinks to correct category directories
    for fname, old_cat, new_cat in symlinks_to_move:
        old_path = classified_dir / old_cat / fname
        new_cat_dir = classified_dir / new_cat
        new_path = new_cat_dir / fname

        if os.path.islink(old_path):
            target = os.readlink(old_path)
            new_cat_dir.mkdir(parents=True, exist_ok=True)
            if not os.path.exists(new_path):
                os.symlink(target, new_path)
                os.unlink(old_path)
                fixed(f'Moved symlink {fname}: "{old_cat}" -> "{new_cat}"')
                count_fix()

    # Clean up empty old category directories
    for old_cat in merge_map.keys():
        old_dir = classified_dir / old_cat
        if old_dir.is_dir() and not os.listdir(old_dir):
            old_dir.rmdir()
            fixed(f'Removed empty directory: classified/{old_cat}')
            count_fix()
else:
    print("  No symlink moves needed. OK.")


# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════

header("AUDIT SUMMARY")
print(f"""
  Total issues found:    {issues_found}
  Auto-fixes applied:    {fixes_applied}
  Manual review needed:  {len(manual_review)}
""")

if manual_review:
    subheader("Items needing MANUAL REVIEW")
    seen = set()
    for i, item in enumerate(manual_review, 1):
        if item not in seen:
            print(f"  {i:3d}. {item}")
            seen.add(item)

print(f"\n{'='*72}")
print("  Audit complete. Fixed files have been saved.")
print(f"{'='*72}\n")
