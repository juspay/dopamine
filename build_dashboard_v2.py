#!/usr/bin/env python3
"""Build dashboard v2 with Knowledge Base tab."""

import sys
sys.stdout.reconfigure(line_buffering=True)

import json
import re
import html

def main():
    print("Loading data...")

    # Read existing dashboard
    with open("dashboard/index.html", "r") as f:
        existing_html = f.read()

    # Read knowledge base files
    with open("videos/knowledge_base.json", "r") as f:
        kb1 = json.load(f)
    with open("videos/knowledge_base_batch2.json", "r") as f:
        kb2 = json.load(f)

    # Merge knowledge bases
    knowledge = {}
    knowledge.update(kb1)
    knowledge.update(kb2)
    print(f"Knowledge base: {len(kb1)} + {len(kb2)} = {len(knowledge)} entries")

    # Extract CATALOG from existing HTML
    m = re.search(r'const CATALOG = (\[.*?\]);\s*\n', existing_html, re.DOTALL)
    if not m:
        print("ERROR: Could not find CATALOG in existing HTML")
        sys.exit(1)
    catalog_json_str = m.group(1)
    catalog = json.loads(catalog_json_str)
    print(f"Catalog: {len(catalog)} videos")

    # Build knowledge base entries enriched with catalog metadata
    kb_entries = []
    for filename, kb_data in knowledge.items():
        # Find matching catalog entry
        cat_entry = None
        for c in catalog:
            if c["filename"] == filename:
                cat_entry = c
                break

        # Normalize transcript to string
        transcript = kb_data.get("transcript", "")
        if isinstance(transcript, list):
            transcript = "\n".join(str(t) for t in transcript)

        # Normalize visual_description to string
        vis_desc = kb_data.get("visual_description", "")
        if isinstance(vis_desc, list):
            parts = []
            for item in vis_desc:
                if isinstance(item, dict):
                    ts = item.get("timestamp", "")
                    desc = item.get("description", "")
                    parts.append(f"[{ts}] {desc}" if ts else desc)
                else:
                    parts.append(str(item))
            vis_desc = "\n".join(parts)

        # Normalize links
        links = kb_data.get("links_and_resources", [])
        if not isinstance(links, list):
            links = []

        entry = {
            "filename": filename,
            "basename": filename.rsplit(".", 1)[0] if "." in filename else filename,
            "category": kb_data.get("category", "Unknown"),
            "subcategory": kb_data.get("subcategory", ""),
            "username": kb_data.get("username") or (cat_entry.get("username", "") if cat_entry else ""),
            "transcript": transcript,
            "visual_description": vis_desc,
            "links_and_resources": links,
            "key_takeaways": kb_data.get("key_takeaways", []),
            "topics": kb_data.get("topics", []),
            "tags": kb_data.get("classification_tags", []),
            # From catalog if available
            "duration": cat_entry.get("duration", 0) if cat_entry else 0,
            "description": cat_entry.get("description", "") if cat_entry else "",
            "caption": cat_entry.get("caption", "") if cat_entry else "",
            "full_name": cat_entry.get("full_name", "") if cat_entry else "",
            "taken_at": cat_entry.get("taken_at", "") if cat_entry else "",
            "like_count": cat_entry.get("like_count", 0) if cat_entry else 0,
        }
        kb_entries.append(entry)

    kb_entries.sort(key=lambda x: x.get("taken_at") or "", reverse=True)
    print(f"Knowledge base entries prepared: {len(kb_entries)}")

    # Get categories for KB
    kb_categories = sorted(set(e["category"] for e in kb_entries))
    print(f"KB categories: {kb_categories}")

    # Serialize KB data for embedding
    kb_json = json.dumps(kb_entries, ensure_ascii=False)

    # Build the new HTML
    new_html = build_html(catalog_json_str, kb_json, existing_html)

    with open("dashboard/index.html", "w") as f:
        f.write(new_html)

    print("Dashboard updated successfully!")
    print(f"Output: dashboard/index.html ({len(new_html)} bytes)")


def build_html(catalog_json_str, kb_json, existing_html):
    """Build the complete HTML with both tabs."""

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Video Dashboard</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ background: #0f0f13; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}

/* Tab Navigation */
.tab-nav {{ background: #12121a; display: flex; border-bottom: 2px solid #2a2a3a; }}
.tab-btn {{ padding: 14px 32px; font-size: 1em; font-weight: 600; color: #888; background: transparent; border: none; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s; }}
.tab-btn:hover {{ color: #bbb; }}
.tab-btn.active {{ color: #7c6aef; border-bottom-color: #7c6aef; }}
.tab-content {{ display: none; }}
.tab-content.active {{ display: block; }}

/* Stats Bar */
.stats-bar {{ background: #1a1a24; padding: 16px 24px; display: flex; gap: 32px; align-items: center; border-bottom: 1px solid #2a2a3a; flex-wrap: wrap; }}
.stat {{ text-align: center; }}
.stat-value {{ font-size: 1.6em; font-weight: 700; color: #7c6aef; }}
.stat-label {{ font-size: 0.75em; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }}

/* Controls */
.controls {{ background: #141420; padding: 16px 24px; border-bottom: 1px solid #2a2a3a; position: sticky; top: 0; z-index: 100; }}
.search-row {{ display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }}
.search-box {{ flex: 1; min-width: 200px; padding: 10px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 0.95em; outline: none; transition: border-color 0.2s; }}
.search-box:focus {{ border-color: #7c6aef; }}
.sort-select {{ padding: 10px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 0.95em; cursor: pointer; outline: none; }}
.category-bar {{ display: flex; gap: 8px; flex-wrap: wrap; }}
.cat-pill {{ padding: 6px 14px; border-radius: 20px; font-size: 0.8em; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; user-select: none; opacity: 0.6; }}
.cat-pill:hover {{ opacity: 0.85; }}
.cat-pill.active {{ opacity: 1; border-color: #fff3; box-shadow: 0 0 8px #0004; }}
.cat-pill .count {{ margin-left: 4px; opacity: 0.7; }}

/* Grid */
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 24px; }}
@media (max-width: 640px) {{ .grid {{ grid-template-columns: 1fr; padding: 12px; gap: 12px; }} }}

/* Card */
.card {{ background: #1a1a24; border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }}
.card:hover {{ transform: translateY(-4px); box-shadow: 0 8px 24px #0006; }}
.card.expanded {{ grid-column: 1 / -1; max-width: 800px; }}
.thumb-wrap {{ position: relative; width: 100%; padding-top: 56.25%; background: #111; overflow: hidden; }}
.thumb-wrap img {{ position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }}
.thumb-wrap .duration {{ position: absolute; bottom: 8px; right: 8px; background: #000b; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: 600; }}
.thumb-wrap .cat-badge {{ position: absolute; top: 8px; left: 8px; padding: 3px 10px; border-radius: 6px; font-size: 0.7em; font-weight: 600; }}
.card-body {{ padding: 12px 16px; }}
.card-body .username {{ font-weight: 600; font-size: 0.95em; margin-bottom: 4px; }}
.card-body .desc {{ font-size: 0.82em; color: #999; line-height: 1.4; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }}
.card.expanded .card-body .desc {{ -webkit-line-clamp: unset; }}
.tags {{ display: flex; flex-wrap: wrap; gap: 4px; }}
.tag {{ background: #2a2a3a; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; color: #aaa; }}
.card-meta {{ display: flex; gap: 12px; font-size: 0.75em; color: #666; margin-top: 8px; }}

/* Video player */
.video-container {{ display: none; padding: 0; }}
.card.expanded .video-container {{ display: block; }}
.card.expanded .thumb-wrap {{ display: none; }}
.video-container video {{ width: 100%; max-height: 70vh; background: #000; }}

/* No results */
.no-results {{ text-align: center; padding: 60px 20px; color: #555; font-size: 1.1em; }}

/* Animations */
.card {{ animation: fadeIn 0.3s ease; }}
@keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(10px); }} to {{ opacity: 1; transform: translateY(0); }} }}

/* ==================== Knowledge Base Styles ==================== */
.kb-controls {{ background: #141420; padding: 16px 24px; border-bottom: 1px solid #2a2a3a; position: sticky; top: 0; z-index: 100; }}
.kb-search-box {{ width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 1em; outline: none; transition: border-color 0.2s; margin-bottom: 12px; }}
.kb-search-box:focus {{ border-color: #7c6aef; }}
.kb-search-hint {{ font-size: 0.75em; color: #555; margin-bottom: 12px; }}

.kb-section-toggle {{ display: flex; gap: 8px; margin-bottom: 12px; }}
.kb-section-btn {{ padding: 8px 20px; border-radius: 8px; font-size: 0.85em; font-weight: 600; cursor: pointer; border: 1px solid #2a2a3a; background: #1a1a24; color: #888; transition: all 0.2s; }}
.kb-section-btn.active {{ background: #7c6aef; color: #fff; border-color: #7c6aef; }}

.kb-list {{ padding: 16px 24px; }}
.kb-entry {{ background: #1a1a24; border-radius: 12px; margin-bottom: 16px; overflow: hidden; animation: fadeIn 0.3s ease; }}
.kb-entry-header {{ display: flex; gap: 16px; padding: 16px; cursor: pointer; align-items: center; }}
.kb-entry-header:hover {{ background: #1e1e2a; }}
.kb-entry-thumb {{ width: 120px; height: 68px; border-radius: 8px; object-fit: cover; background: #111; flex-shrink: 0; }}
.kb-entry-info {{ flex: 1; min-width: 0; }}
.kb-entry-info .username {{ font-weight: 600; font-size: 0.95em; margin-bottom: 2px; }}
.kb-entry-info .meta {{ font-size: 0.8em; color: #666; margin-bottom: 4px; }}
.kb-entry-info .cat-badge-inline {{ display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.7em; font-weight: 600; margin-right: 8px; }}
.kb-entry-info .topic-pills {{ display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }}
.kb-entry-info .topic-pill {{ background: #2a2a3a; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; color: #aaa; }}
.kb-entry-toggle {{ color: #7c6aef; font-size: 1.2em; padding: 0 8px; flex-shrink: 0; transition: transform 0.2s; }}
.kb-entry.open .kb-entry-toggle {{ transform: rotate(180deg); }}

.kb-entry-detail {{ display: none; padding: 0 16px 16px; }}
.kb-entry.open .kb-entry-detail {{ display: block; }}

.kb-section {{ margin-bottom: 16px; }}
.kb-section-title {{ font-size: 0.85em; font-weight: 700; color: #7c6aef; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #2a2a3a; cursor: pointer; user-select: none; }}
.kb-section-title:hover {{ color: #9d8ff5; }}
.kb-section-body {{ font-size: 0.85em; color: #bbb; line-height: 1.6; }}
.kb-section-body.collapsed {{ display: none; }}

.kb-section-body pre {{ white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0; }}

/* Key takeaways */
.kb-takeaways {{ list-style: none; padding: 0; }}
.kb-takeaways li {{ padding: 6px 0; padding-left: 20px; position: relative; }}
.kb-takeaways li::before {{ content: "\\2022"; color: #7c6aef; font-size: 1.2em; position: absolute; left: 4px; top: 5px; }}

/* Links table */
.kb-links-table {{ width: 100%; border-collapse: collapse; font-size: 0.85em; }}
.kb-links-table th {{ text-align: left; padding: 8px; color: #888; border-bottom: 1px solid #2a2a3a; font-weight: 600; }}
.kb-links-table td {{ padding: 8px; border-bottom: 1px solid #1a1a24; }}
.kb-links-table a {{ color: #7c9aef; text-decoration: none; }}
.kb-links-table a:hover {{ text-decoration: underline; }}
.kb-links-table .ts {{ color: #666; font-size: 0.9em; }}

/* Links Directory */
.links-directory {{ padding: 16px 24px; }}
.links-dir-group {{ margin-bottom: 24px; }}
.links-dir-group h3 {{ font-size: 1em; font-weight: 700; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #2a2a3a; }}
.links-dir-item {{ display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #1a1a2a; font-size: 0.85em; align-items: baseline; }}
.links-dir-item a {{ color: #7c9aef; text-decoration: none; min-width: 0; word-break: break-all; }}
.links-dir-item a:hover {{ text-decoration: underline; }}
.links-dir-item .from {{ color: #666; font-size: 0.85em; white-space: nowrap; }}

/* Search highlight */
mark {{ background: #7c6aef44; color: #e0e0e0; padding: 1px 2px; border-radius: 2px; }}

.kb-match-context {{ font-size: 0.8em; color: #888; margin-top: 4px; padding: 4px 8px; background: #15151f; border-radius: 4px; }}
.kb-match-context mark {{ background: #7c6aef55; }}
</style>
</head>
<body>

<!-- Tab Navigation -->
<div class="tab-nav">
  <button class="tab-btn active" data-tab="videos" onclick="switchTab('videos')">Videos</button>
  <button class="tab-btn" data-tab="knowledge" onclick="switchTab('knowledge')">Knowledge Base</button>
</div>

<!-- ==================== VIDEOS TAB ==================== -->
<div class="tab-content active" id="tab-videos">

<div class="stats-bar" id="statsBar">
  <div class="stat"><div class="stat-value" id="totalVideos">0</div><div class="stat-label">Videos</div></div>
  <div class="stat"><div class="stat-value" id="totalCategories">0</div><div class="stat-label">Categories</div></div>
  <div class="stat"><div class="stat-value" id="totalDuration">0</div><div class="stat-label">Total Duration</div></div>
</div>

<div class="controls">
  <div class="search-row">
    <input class="search-box" id="searchBox" type="text" placeholder="Search tags, description, username, caption...">
    <select class="sort-select" id="sortSelect">
      <option value="date">Sort: Date (newest)</option>
      <option value="date-asc">Sort: Date (oldest)</option>
      <option value="duration">Sort: Duration (longest)</option>
      <option value="duration-asc">Sort: Duration (shortest)</option>
      <option value="category">Sort: Category (A-Z)</option>
    </select>
  </div>
  <div class="category-bar" id="categoryBar"></div>
</div>

<div class="grid" id="grid"></div>
<div class="no-results" id="noResults" style="display:none;">No videos match your filters.</div>

</div>

<!-- ==================== KNOWLEDGE BASE TAB ==================== -->
<div class="tab-content" id="tab-knowledge">

<div class="stats-bar">
  <div class="stat"><div class="stat-value" id="kbTotalVideos">0</div><div class="stat-label">Videos with Knowledge</div></div>
  <div class="stat"><div class="stat-value" id="kbTotalLinks">0</div><div class="stat-label">Links Extracted</div></div>
  <div class="stat"><div class="stat-value" id="kbTotalTakeaways">0</div><div class="stat-label">Key Takeaways</div></div>
</div>

<div class="kb-controls">
  <input class="kb-search-box" id="kbSearchBox" type="text" placeholder="Search transcripts, descriptions, links, takeaways, topics...">
  <div class="kb-search-hint">Full-text search across all knowledge base content. Try searching for tools, concepts, or techniques.</div>
  <div class="kb-section-toggle">
    <button class="kb-section-btn active" data-section="entries" onclick="switchKbSection('entries')">Video Entries</button>
    <button class="kb-section-btn" data-section="links" onclick="switchKbSection('links')">Links Directory</button>
  </div>
  <div class="category-bar" id="kbCategoryBar"></div>
</div>

<div id="kbEntries" class="kb-list"></div>
<div id="kbLinksDir" class="links-directory" style="display:none;"></div>
<div class="no-results" id="kbNoResults" style="display:none;">No knowledge base entries match your search.</div>

</div>

<script>
// ==================== SHARED UTILITIES ====================
function catColor(name) {{
  const m = {{ "AI & Machine Learning":"#e8d5f5","Tech & Coding":"#d5e8f5","Business & Marketing":"#d5f5e0","Creative & Media":"#f5e8d5","Health & Wellness":"#f5d5d5","Education & Learning":"#f5f5d5","Lifestyle":"#f0d5f5","Other":"#ddd" }};
  return m[name] || "#ccc";
}}
function catBg(name) {{
  const m = {{ "AI & Machine Learning":"#2d1f3d","Tech & Coding":"#1f2d3d","Business & Marketing":"#1f3d2d","Creative & Media":"#3d2d1f","Health & Wellness":"#3d1f1f","Education & Learning":"#3d3d1f","Lifestyle":"#351f3d","Other":"#333" }};
  return m[name] || "#333";
}}
function fmtDuration(s) {{
  if (!s) return "0:00";
  s = Math.round(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + ":" + (sec < 10 ? "0" : "") + sec;
}}
function escHtml(s) {{ const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }}
function escAttr(s) {{ return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }}

// ==================== TAB SWITCHING ====================
function switchTab(tab) {{
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.id === "tab-" + tab));
}}

// ==================== VIDEOS TAB (original logic) ====================
const CATALOG = {catalog_json_str};

// Stats
const totalSec = CATALOG.reduce((a, v) => a + (v.duration || 0), 0);
const catSet = new Set(CATALOG.map(v => v.category));
document.getElementById("totalVideos").textContent = CATALOG.length;
document.getElementById("totalCategories").textContent = catSet.size;
const hrs = Math.floor(totalSec / 3600);
const mins = Math.floor((totalSec % 3600) / 60);
document.getElementById("totalDuration").textContent = (hrs ? hrs + "h " : "") + mins + "m";

// Category counts & pills (Videos tab)
const catCounts = {{}};
CATALOG.forEach(v => {{ catCounts[v.category] = (catCounts[v.category] || 0) + 1; }});
const categories = Object.keys(catCounts).sort();

const activeCats = new Set();
const catBar = document.getElementById("categoryBar");
categories.forEach(cat => {{
  const pill = document.createElement("span");
  pill.className = "cat-pill active";
  pill.style.background = catBg(cat);
  pill.style.color = catColor(cat);
  pill.innerHTML = cat + '<span class="count">' + catCounts[cat] + '</span>';
  pill.dataset.cat = cat;
  pill.addEventListener("click", () => {{
    if (activeCats.size === 0) {{
      activeCats.add(cat);
    }} else if (activeCats.has(cat)) {{
      activeCats.delete(cat);
    }} else {{
      activeCats.add(cat);
    }}
    updatePills();
    render();
  }});
  catBar.appendChild(pill);
}});

function updatePills() {{
  catBar.querySelectorAll(".cat-pill").forEach(p => {{
    const c = p.dataset.cat;
    p.classList.toggle("active", activeCats.size === 0 || activeCats.has(c));
  }});
}}

let expandedFile = null;

function render() {{
  const query = document.getElementById("searchBox").value.toLowerCase();
  const sort = document.getElementById("sortSelect").value;

  let items = CATALOG.filter(v => {{
    if (activeCats.size > 0 && !activeCats.has(v.category)) return false;
    if (query) {{
      const haystack = [v.username, v.description, v.caption, v.full_name, v.category, v.subcategory, ...(v.tags || [])].join(" ").toLowerCase();
      return haystack.includes(query);
    }}
    return true;
  }});

  if (sort === "date") items.sort((a, b) => (b.taken_at || "").localeCompare(a.taken_at || ""));
  else if (sort === "date-asc") items.sort((a, b) => (a.taken_at || "").localeCompare(b.taken_at || ""));
  else if (sort === "duration") items.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  else if (sort === "duration-asc") items.sort((a, b) => (a.duration || 0) - (b.duration || 0));
  else if (sort === "category") items.sort((a, b) => a.category.localeCompare(b.category));

  const grid = document.getElementById("grid");
  const noResults = document.getElementById("noResults");

  if (items.length === 0) {{
    grid.innerHTML = "";
    noResults.style.display = "block";
    return;
  }}
  noResults.style.display = "none";

  grid.innerHTML = items.map(v => {{
    const isExpanded = expandedFile === v.filename;
    const thumbPath = "../videos/thumbnails/" + v.basename + ".jpg";
    const videoPath = "../videos/user_saved/" + v.filename;
    const tagsHtml = (v.tags || []).slice(0, 5).map(t => '<span class="tag">' + escHtml(t) + '</span>').join("");
    const dateStr = v.taken_at ? new Date(v.taken_at).toLocaleDateString() : "";

    return '<div class="card' + (isExpanded ? ' expanded' : '') + '" data-file="' + escAttr(v.filename) + '">' +
      '<div class="thumb-wrap">' +
        '<img src="' + escAttr(thumbPath) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">' +
        '<span class="duration">' + fmtDuration(v.duration) + '</span>' +
        '<span class="cat-badge" style="background:' + catBg(v.category) + ';color:' + catColor(v.category) + '">' + escHtml(v.category) + '</span>' +
      '</div>' +
      (isExpanded ? '<div class="video-container" style="display:block"><video controls autoplay src="' + escAttr(videoPath) + '"></video></div>' : '') +
      '<div class="card-body">' +
        '<div class="username">@' + escHtml(v.username) + (v.full_name ? ' <span style="color:#666;font-weight:400">(' + escHtml(v.full_name) + ')</span>' : '') + '</div>' +
        '<div class="desc">' + escHtml(v.description || v.caption || "") + '</div>' +
        '<div class="tags">' + tagsHtml + '</div>' +
        '<div class="card-meta">' +
          (dateStr ? '<span>' + dateStr + '</span>' : '') +
          (v.like_count ? '<span>' + v.like_count + ' likes</span>' : '') +
          '<span>' + fmtDuration(v.duration) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }}).join("");

  grid.querySelectorAll(".card").forEach(card => {{
    card.addEventListener("click", (e) => {{
      if (e.target.tagName === "VIDEO") return;
      const file = card.dataset.file;
      expandedFile = expandedFile === file ? null : file;
      render();
    }});
  }});
}}

document.getElementById("searchBox").addEventListener("input", render);
document.getElementById("sortSelect").addEventListener("change", render);
render();

// ==================== KNOWLEDGE BASE TAB ====================
const KNOWLEDGE = {kb_json};

// KB Stats
document.getElementById("kbTotalVideos").textContent = KNOWLEDGE.length;
const allKbLinks = KNOWLEDGE.reduce((a, v) => a.concat(v.links_and_resources || []), []);
document.getElementById("kbTotalLinks").textContent = allKbLinks.length;
const allTakeaways = KNOWLEDGE.reduce((a, v) => a + (v.key_takeaways || []).length, 0);
document.getElementById("kbTotalTakeaways").textContent = allTakeaways;

// KB category pills
const kbCatCounts = {{}};
KNOWLEDGE.forEach(v => {{ kbCatCounts[v.category] = (kbCatCounts[v.category] || 0) + 1; }});
const kbCategories = Object.keys(kbCatCounts).sort();
const kbActiveCats = new Set();
const kbCatBar = document.getElementById("kbCategoryBar");

kbCategories.forEach(cat => {{
  const pill = document.createElement("span");
  pill.className = "cat-pill active";
  pill.style.background = catBg(cat);
  pill.style.color = catColor(cat);
  pill.innerHTML = cat + '<span class="count">' + kbCatCounts[cat] + '</span>';
  pill.dataset.cat = cat;
  pill.addEventListener("click", () => {{
    if (kbActiveCats.size === 0) {{
      kbActiveCats.add(cat);
    }} else if (kbActiveCats.has(cat)) {{
      kbActiveCats.delete(cat);
    }} else {{
      kbActiveCats.add(cat);
    }}
    kbCatBar.querySelectorAll(".cat-pill").forEach(p => {{
      const c = p.dataset.cat;
      p.classList.toggle("active", kbActiveCats.size === 0 || kbActiveCats.has(c));
    }});
    renderKb();
  }});
  kbCatBar.appendChild(pill);
}});

let kbSection = "entries";
function switchKbSection(section) {{
  kbSection = section;
  document.querySelectorAll(".kb-section-btn").forEach(b => b.classList.toggle("active", b.dataset.section === section));
  document.getElementById("kbEntries").style.display = section === "entries" ? "block" : "none";
  document.getElementById("kbLinksDir").style.display = section === "links" ? "block" : "none";
  renderKb();
}}

function highlightText(text, query) {{
  if (!query || !text) return escHtml(text || "");
  const escaped = escHtml(text);
  const qEsc = query.replace(/[.*+?^${{}}()|[\\]\\\\]/g, '\\\\$&');
  const re = new RegExp('(' + qEsc + ')', 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}}

function getMatchContext(text, query, maxLen) {{
  if (!query || !text) return "";
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 60);
  let snippet = (start > 0 ? "..." : "") + text.substring(start, end) + (end < text.length ? "..." : "");
  return highlightText(snippet, query);
}}

let kbOpenEntries = new Set();

function renderKb() {{
  const query = document.getElementById("kbSearchBox").value.toLowerCase().trim();

  let items = KNOWLEDGE.filter(v => {{
    if (kbActiveCats.size > 0 && !kbActiveCats.has(v.category)) return false;
    if (query) {{
      const haystack = [
        v.username, v.description, v.caption, v.category, v.subcategory,
        v.transcript, v.visual_description,
        ...(v.key_takeaways || []),
        ...(v.topics || []),
        ...(v.tags || []),
        ...(v.links_and_resources || []).map(l => (l.url || "") + " " + (l.description || ""))
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    }}
    return true;
  }});

  const noResults = document.getElementById("kbNoResults");

  if (kbSection === "entries") {{
    const container = document.getElementById("kbEntries");
    if (items.length === 0) {{
      container.innerHTML = "";
      noResults.style.display = "block";
      return;
    }}
    noResults.style.display = "none";

    container.innerHTML = items.map(v => {{
      const thumbPath = "../videos/thumbnails/" + v.basename + ".jpg";
      const isOpen = kbOpenEntries.has(v.filename);
      const topicPills = (v.topics || []).map(t => '<span class="topic-pill">' + escHtml(t) + '</span>').join("");

      // Match context for search
      let matchCtx = "";
      if (query) {{
        const sources = [
          {{ label: "Transcript", text: v.transcript }},
          {{ label: "Visual Description", text: v.visual_description }},
          {{ label: "Takeaways", text: (v.key_takeaways || []).join(" ") }},
          {{ label: "Links", text: (v.links_and_resources || []).map(l => l.url + " " + (l.description || "")).join(" ") }}
        ];
        for (const src of sources) {{
          if (src.text && src.text.toLowerCase().includes(query)) {{
            matchCtx = '<div class="kb-match-context"><strong>' + src.label + ':</strong> ' + getMatchContext(src.text, query, 120) + '</div>';
            break;
          }}
        }}
      }}

      // Links table
      let linksHtml = "";
      if (v.links_and_resources && v.links_and_resources.length > 0) {{
        linksHtml = '<table class="kb-links-table"><thead><tr><th>Resource</th><th>Description</th><th>Time</th></tr></thead><tbody>' +
          v.links_and_resources.map(l => {{
            const url = l.url || "";
            const isUrl = url.startsWith("http");
            const linkCell = isUrl ? '<a href="' + escAttr(url) + '" target="_blank" rel="noopener">' + escHtml(url) + '</a>' : escHtml(url);
            return '<tr><td>' + linkCell + '</td><td>' + escHtml(l.description || "") + '</td><td class="ts">' + escHtml(l.timestamp || "") + '</td></tr>';
          }}).join("") +
          '</tbody></table>';
      }} else {{
        linksHtml = '<div style="color:#555;font-style:italic">No links extracted</div>';
      }}

      // Key takeaways
      let takeawaysHtml = "";
      if (v.key_takeaways && v.key_takeaways.length > 0) {{
        takeawaysHtml = '<ul class="kb-takeaways">' +
          v.key_takeaways.map(t => '<li>' + (query ? highlightText(t, query) : escHtml(t)) + '</li>').join("") +
          '</ul>';
      }} else {{
        takeawaysHtml = '<div style="color:#555;font-style:italic">No takeaways extracted</div>';
      }}

      return '<div class="kb-entry' + (isOpen ? ' open' : '') + '" data-file="' + escAttr(v.filename) + '">' +
        '<div class="kb-entry-header" onclick="toggleKbEntry(this)">' +
          '<img class="kb-entry-thumb" src="' + escAttr(thumbPath) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">' +
          '<div class="kb-entry-info">' +
            '<div class="username">@' + escHtml(v.username || "unknown") + (v.full_name ? ' <span style="color:#666;font-weight:400">(' + escHtml(v.full_name) + ')</span>' : '') + '</div>' +
            '<div class="meta">' +
              '<span class="cat-badge-inline" style="background:' + catBg(v.category) + ';color:' + catColor(v.category) + '">' + escHtml(v.category) + '</span>' +
              escHtml(v.subcategory || "") +
              (v.duration ? ' &middot; ' + fmtDuration(v.duration) : '') +
            '</div>' +
            '<div class="topic-pills">' + topicPills + '</div>' +
            matchCtx +
          '</div>' +
          '<div class="kb-entry-toggle">&#9660;</div>' +
        '</div>' +
        '<div class="kb-entry-detail">' +
          '<div class="kb-section">' +
            '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Key Takeaways</div>' +
            '<div class="kb-section-body">' + takeawaysHtml + '</div>' +
          '</div>' +
          '<div class="kb-section">' +
            '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Links &amp; Resources</div>' +
            '<div class="kb-section-body">' + linksHtml + '</div>' +
          '</div>' +
          '<div class="kb-section">' +
            '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Transcript</div>' +
            '<div class="kb-section-body collapsed"><pre>' + (query ? highlightText(v.transcript || "No transcript", query) : escHtml(v.transcript || "No transcript")) + '</pre></div>' +
          '</div>' +
          '<div class="kb-section">' +
            '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Visual Description</div>' +
            '<div class="kb-section-body collapsed"><pre>' + (query ? highlightText(v.visual_description || "No description", query) : escHtml(v.visual_description || "No description")) + '</pre></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }}).join("");
  }} else {{
    // Links Directory
    renderLinksDirectory(items, query);
  }}
}}

function renderLinksDirectory(items, query) {{
  const container = document.getElementById("kbLinksDir");
  const noResults = document.getElementById("kbNoResults");

  // Aggregate all links grouped by category
  const linksByCategory = {{}};
  items.forEach(v => {{
    (v.links_and_resources || []).forEach(l => {{
      if (!l.url) return;
      if (query && !(l.url + " " + (l.description || "")).toLowerCase().includes(query)) return;
      const cat = v.category;
      if (!linksByCategory[cat]) linksByCategory[cat] = [];
      linksByCategory[cat].push({{
        url: l.url,
        description: l.description || "",
        timestamp: l.timestamp || "",
        fromVideo: v.username || v.filename
      }});
    }});
  }});

  const cats = Object.keys(linksByCategory).sort();
  if (cats.length === 0) {{
    container.innerHTML = "";
    noResults.style.display = "block";
    return;
  }}
  noResults.style.display = "none";

  container.innerHTML = cats.map(cat => {{
    const links = linksByCategory[cat];
    return '<div class="links-dir-group">' +
      '<h3 style="color:' + catColor(cat) + '">' + escHtml(cat) + ' (' + links.length + ' links)</h3>' +
      links.map(l => {{
        const isUrl = l.url.startsWith("http");
        const linkEl = isUrl ? '<a href="' + escAttr(l.url) + '" target="_blank" rel="noopener">' + (query ? highlightText(l.url, query) : escHtml(l.url)) + '</a>' : '<span>' + (query ? highlightText(l.url, query) : escHtml(l.url)) + '</span>';
        return '<div class="links-dir-item">' +
          linkEl +
          (l.description ? '<span>' + (query ? highlightText(l.description, query) : escHtml(l.description)) + '</span>' : '') +
          '<span class="from">from @' + escHtml(l.fromVideo) + '</span>' +
        '</div>';
      }}).join("") +
    '</div>';
  }}).join("");
}}

function toggleKbEntry(header) {{
  const entry = header.parentElement;
  const file = entry.dataset.file;
  if (kbOpenEntries.has(file)) {{
    kbOpenEntries.delete(file);
    entry.classList.remove("open");
  }} else {{
    kbOpenEntries.add(file);
    entry.classList.add("open");
  }}
}}

document.getElementById("kbSearchBox").addEventListener("input", renderKb);
renderKb();
</script>
</body>
</html>'''


if __name__ == "__main__":
    main()
