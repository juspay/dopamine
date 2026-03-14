#!/usr/bin/env python3
"""Build a self-contained HTML dashboard from video JSON data."""

import json
import os
import html

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VIDEOS_DIR = os.path.join(BASE_DIR, "videos")
OUTPUT = os.path.join(BASE_DIR, "dashboard", "index.html")


def load_json(name):
    with open(os.path.join(VIDEOS_DIR, name), "r") as f:
        return json.load(f)


def merge_data():
    classifications = load_json("classifications.json")
    properties = load_json("video_properties.json")
    metadata_list = load_json("metadata.json")

    # Index metadata by filename pattern (username_pk)
    meta_by_pk = {}
    for m in metadata_list:
        if m.get("pk"):
            meta_by_pk[str(m["pk"])] = m

    catalog = []
    for filename, cls in classifications.items():
        entry = {"filename": filename}
        basename = filename.rsplit(".", 1)[0]
        entry["basename"] = basename

        # Classification data
        entry["category"] = cls.get("category", "Uncategorized")
        entry["subcategory"] = cls.get("subcategory", "")
        entry["tags"] = cls.get("tags", [])
        entry["description"] = cls.get("description", "")
        entry["language"] = cls.get("language", "en")
        entry["mood"] = cls.get("mood", "")

        # Video properties
        props = properties.get(filename, {})
        entry["duration"] = props.get("duration", 0)
        entry["width"] = props.get("width", 0)
        entry["height"] = props.get("height", 0)
        entry["file_size"] = props.get("file_size", 0)
        entry["fps"] = props.get("fps", 0)

        # Metadata (username, caption, date, etc.)
        pk = cls.get("pk")
        username = cls.get("username")
        meta = None
        if pk and str(pk) in meta_by_pk:
            meta = meta_by_pk[str(pk)]
        if meta:
            entry["username"] = meta.get("username", username or "unknown")
            entry["full_name"] = meta.get("full_name", "")
            entry["caption"] = meta.get("caption_text", "")
            entry["taken_at"] = meta.get("taken_at", "")
            entry["like_count"] = meta.get("like_count", 0)
            entry["comment_count"] = meta.get("comment_count", 0)
        else:
            entry["username"] = username or "unknown"
            entry["full_name"] = ""
            entry["caption"] = ""
            entry["taken_at"] = ""
            entry["like_count"] = 0
            entry["comment_count"] = 0

        catalog.append(entry)

    # Sort by date descending (entries with dates first)
    catalog.sort(key=lambda x: x.get("taken_at", "") or "", reverse=True)
    return catalog


def build_html(catalog):
    catalog_json = json.dumps(catalog)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Video Dashboard</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ background: #0f0f13; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}

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
</style>
</head>
<body>

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

<script>
const CATALOG = {catalog_json};

// Color generation from category name
function catColor(name) {{
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  h = ((h % 360) + 360) % 360;
  return `hsl(${{h}}, 55%, 45%)`;
}}
function catBg(name) {{
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  h = ((h % 360) + 360) % 360;
  return `hsl(${{h}}, 55%, 20%)`;
}}

function fmtDuration(s) {{
  if (!s) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ":" + String(sec).padStart(2, "0");
}}

function fmtTotalDuration(s) {{
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}}

// Build category counts
const catCounts = {{}};
CATALOG.forEach(v => {{
  catCounts[v.category] = (catCounts[v.category] || 0) + 1;
}});
const categories = Object.keys(catCounts).sort();

// Stats
document.getElementById("totalVideos").textContent = CATALOG.length;
document.getElementById("totalCategories").textContent = categories.length;
document.getElementById("totalDuration").textContent = fmtTotalDuration(CATALOG.reduce((a, v) => a + (v.duration || 0), 0));

// Category pills
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
      // First click: select only this one
      activeCats.add(cat);
    }} else if (activeCats.has(cat)) {{
      activeCats.delete(cat);
      if (activeCats.size === 0) {{
        // All deselected: show all
      }}
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
    // Category filter
    if (activeCats.size > 0 && !activeCats.has(v.category)) return false;
    // Search filter
    if (query) {{
      const haystack = [v.username, v.description, v.caption, v.full_name, v.category, v.subcategory, ...(v.tags || [])].join(" ").toLowerCase();
      return haystack.includes(query);
    }}
    return true;
  }});

  // Sort
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
        '<img src="' + escAttr(thumbPath) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
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

  // Click handlers
  grid.querySelectorAll(".card").forEach(card => {{
    card.addEventListener("click", (e) => {{
      if (e.target.tagName === "VIDEO") return;
      const file = card.dataset.file;
      expandedFile = expandedFile === file ? null : file;
      render();
    }});
  }});
}}

function escHtml(s) {{ const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }}
function escAttr(s) {{ return s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }}

// Events
document.getElementById("searchBox").addEventListener("input", render);
document.getElementById("sortSelect").addEventListener("change", render);

render();
</script>
</body>
</html>"""


def main():
    catalog = merge_data()
    html_content = build_html(catalog)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        f.write(html_content)
    print(f"Dashboard built: {OUTPUT}")
    print(f"  {len(catalog)} videos, {len(set(v['category'] for v in catalog))} categories")


if __name__ == "__main__":
    main()
