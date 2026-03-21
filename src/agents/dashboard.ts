/**
 * DashboardAgent — port of build_dashboard_v2.py
 *
 * Generates dashboard/index.html with ALL data embedded as JS variables.
 * Has Videos tab + Knowledge Base tab.
 *
 * CRITICAL: Uses &quot; (not escaped quotes) for HTML attribute values inside
 * JS strings to avoid the classList.toggle bug.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";
import type { CatalogRecord } from "./catalog.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KnowledgeEntry {
  category?: string;
  subcategory?: string;
  username?: string;
  classification_tags?: string[];
  transcript?: string | string[];
  visual_description?: string | Array<{ timestamp?: string; description?: string }>;
  links_and_resources?: Array<{ url?: string; description?: string; timestamp?: string }>;
  key_takeaways?: string[];
  topics?: string[];
}

/** Shape embedded in the dashboard HTML as KNOWLEDGE array entries. */
interface KbDashboardEntry {
  filename: string;
  basename: string;
  category: string;
  subcategory: string;
  username: string;
  transcript: string;
  visual_description: string;
  links_and_resources: Array<{ url?: string; description?: string; timestamp?: string }>;
  key_takeaways: string[];
  topics: string[];
  tags: string[];
  duration: number;
  description: string;
  caption: string;
  full_name: string;
  taken_at: string;
  like_count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeJsonForEmbed(jsonStr: string): string {
  // The JSON is embedded directly inside a <script> tag. We need to escape
  // </script> sequences that could break the HTML parser.
  return jsonStr.replace(/<\/script/gi, "<\\/script");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runDashboardAgent(): Promise<void> {
  console.log("\n=== DashboardAgent ===");
  console.log("Loading data...");

  const videosDir = path.dirname(CONFIG.STATE.METADATA);

  // Load knowledge base files
  const kb1 = await loadState<Record<string, KnowledgeEntry>>(
    path.join(videosDir, "knowledge_base.json"),
    {}
  );
  const kb2 = await loadState<Record<string, KnowledgeEntry>>(
    path.join(videosDir, "knowledge_base_batch2.json"),
    {}
  );

  // Merge knowledge bases
  const knowledge: Record<string, KnowledgeEntry> = { ...kb1, ...kb2 };
  console.log(
    `Knowledge base: ${Object.keys(kb1).length} + ${Object.keys(kb2).length} = ${Object.keys(knowledge).length} entries`
  );

  // Load catalog
  const catalog = await loadState<CatalogRecord[]>(CONFIG.STATE.CATALOG, []);
  console.log(`Catalog: ${catalog.length} videos`);

  // Build knowledge base entries enriched with catalog metadata
  const kbEntries: KbDashboardEntry[] = [];

  for (const [filename, kbData] of Object.entries(knowledge)) {
    // Find matching catalog entry
    const catEntry = catalog.find((c) => c.filename === filename);

    // Normalize transcript to string
    let transcript = kbData.transcript ?? "";
    if (Array.isArray(transcript)) {
      transcript = transcript.map(String).join("\n");
    }

    // Normalize visual_description to string
    let visDesc: string;
    const rawVisDesc = kbData.visual_description ?? "";
    if (Array.isArray(rawVisDesc)) {
      const parts: string[] = [];
      for (const item of rawVisDesc) {
        if (typeof item === "object" && item !== null) {
          const ts = item.timestamp ?? "";
          const desc = item.description ?? "";
          parts.push(ts ? `[${ts}] ${desc}` : desc);
        } else {
          parts.push(String(item));
        }
      }
      visDesc = parts.join("\n");
    } else {
      visDesc = String(rawVisDesc);
    }

    // Normalize links
    let links = kbData.links_and_resources ?? [];
    if (!Array.isArray(links)) links = [];

    const entry: KbDashboardEntry = {
      filename,
      basename: filename.includes(".")
        ? filename.slice(0, filename.lastIndexOf("."))
        : filename,
      category: kbData.category ?? "Unknown",
      subcategory: kbData.subcategory ?? "",
      username:
        kbData.username ?? catEntry?.instagram_user ?? "",
      transcript: transcript as string,
      visual_description: visDesc,
      links_and_resources: links,
      key_takeaways: kbData.key_takeaways ?? [],
      topics: kbData.topics ?? [],
      tags: kbData.classification_tags ?? [],
      duration: catEntry?.duration_seconds ?? 0,
      description: catEntry?.description ?? "",
      caption: catEntry?.caption ?? "",
      full_name: "",
      taken_at: catEntry?.taken_at ?? "",
      like_count: catEntry?.like_count ?? 0,
    };
    kbEntries.push(entry);
  }

  kbEntries.sort((a, b) => (b.taken_at || "").localeCompare(a.taken_at || ""));
  console.log(`Knowledge base entries prepared: ${kbEntries.length}`);

  // Get categories for KB
  const kbCategories = [...new Set(kbEntries.map((e) => e.category))].sort();
  console.log(`KB categories: ${kbCategories}`);

  // Serialize data for embedding
  const catalogJsonStr = escapeJsonForEmbed(JSON.stringify(catalog, null, 0));
  const kbJsonStr = escapeJsonForEmbed(JSON.stringify(kbEntries, null, 0));

  // Build the HTML
  const html = buildHtml(catalogJsonStr, kbJsonStr);

  // Write output
  const dashboardDir = path.dirname(CONFIG.OUTPUT.DASHBOARD);
  await fs.mkdir(dashboardDir, { recursive: true });
  await fs.writeFile(CONFIG.OUTPUT.DASHBOARD, html, "utf8");

  console.log("Dashboard updated successfully!");
  console.log(`Output: ${CONFIG.OUTPUT.DASHBOARD} (${html.length} bytes)`);
}

// ---------------------------------------------------------------------------
// HTML builder — mirrors build_dashboard_v2.py:build_html()
// ---------------------------------------------------------------------------

function buildHtml(catalogJsonStr: string, kbJson: string): string {
  // CRITICAL: In all onclick handlers, use &quot; for attribute value quotes
  // to avoid the classList.toggle bug where escaped quotes inside JS strings
  // break the HTML parser.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Video Dashboard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0f0f13; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

/* Tab Navigation */
.tab-nav { background: #12121a; display: flex; border-bottom: 2px solid #2a2a3a; }
.tab-btn { padding: 14px 32px; font-size: 1em; font-weight: 600; color: #888; background: transparent; border: none; cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.tab-btn:hover { color: #bbb; }
.tab-btn.active { color: #7c6aef; border-bottom-color: #7c6aef; }
.tab-content { display: none; }
.tab-content.active { display: block; }

/* Stats Bar */
.stats-bar { background: #1a1a24; padding: 16px 24px; display: flex; gap: 32px; align-items: center; border-bottom: 1px solid #2a2a3a; flex-wrap: wrap; }
.stat { text-align: center; }
.stat-value { font-size: 1.6em; font-weight: 700; color: #7c6aef; }
.stat-label { font-size: 0.75em; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

/* Controls */
.controls { background: #141420; padding: 16px 24px; border-bottom: 1px solid #2a2a3a; position: sticky; top: 0; z-index: 100; }
.search-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.search-box { flex: 1; min-width: 200px; padding: 10px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 0.95em; outline: none; transition: border-color 0.2s; }
.search-box:focus { border-color: #7c6aef; }
.sort-select { padding: 10px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 0.95em; cursor: pointer; outline: none; }
.category-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.cat-pill { padding: 6px 14px; border-radius: 20px; font-size: 0.8em; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; user-select: none; opacity: 0.6; }
.cat-pill:hover { opacity: 0.85; }
.cat-pill.active { opacity: 1; border-color: #fff3; box-shadow: 0 0 8px #0004; }
.cat-pill .count { margin-left: 4px; opacity: 0.7; }

/* Grid */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 24px; }
@media (max-width: 640px) { .grid { grid-template-columns: 1fr; padding: 12px; gap: 12px; } }

/* Card */
.card { background: #1a1a24; border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
.card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px #0006; }
.card.expanded { grid-column: 1 / -1; max-width: 800px; }
.thumb-wrap { position: relative; width: 100%; padding-top: 56.25%; background: #111; overflow: hidden; }
.thumb-wrap img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
.thumb-wrap .duration { position: absolute; bottom: 8px; right: 8px; background: #000b; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: 600; }
.thumb-wrap .cat-badge { position: absolute; top: 8px; left: 8px; padding: 3px 10px; border-radius: 6px; font-size: 0.7em; font-weight: 600; }
.card-body { padding: 12px 16px; }
.card-body .username { font-weight: 600; font-size: 0.95em; margin-bottom: 4px; }
.card-body .desc { font-size: 0.82em; color: #999; line-height: 1.4; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card.expanded .card-body .desc { -webkit-line-clamp: unset; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; }
.tag { background: #2a2a3a; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; color: #aaa; }
.card-meta { display: flex; gap: 12px; font-size: 0.75em; color: #666; margin-top: 8px; }

/* Video player */
.video-container { display: none; padding: 0; }
.card.expanded .video-container { display: block; }
.card.expanded .thumb-wrap { display: none; }
.video-container video { width: 100%; max-height: 70vh; background: #000; }

/* No results */
.no-results { text-align: center; padding: 60px 20px; color: #555; font-size: 1.1em; }

/* Animations */
.card { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* ==================== Knowledge Base Styles ==================== */
.kb-controls { background: #141420; padding: 16px 24px; border-bottom: 1px solid #2a2a3a; position: sticky; top: 0; z-index: 100; }
.kb-search-box { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 1em; outline: none; transition: border-color 0.2s; margin-bottom: 12px; }
.kb-search-box:focus { border-color: #7c6aef; }
.kb-search-hint { font-size: 0.75em; color: #555; margin-bottom: 12px; }

.kb-section-toggle { display: flex; gap: 8px; margin-bottom: 12px; }
.kb-section-btn { padding: 8px 20px; border-radius: 8px; font-size: 0.85em; font-weight: 600; cursor: pointer; border: 1px solid #2a2a3a; background: #1a1a24; color: #888; transition: all 0.2s; }
.kb-section-btn.active { background: #7c6aef; color: #fff; border-color: #7c6aef; }

.kb-list { padding: 16px 24px; }
.kb-entry { background: #1a1a24; border-radius: 12px; margin-bottom: 16px; overflow: hidden; animation: fadeIn 0.3s ease; }
.kb-entry-header { display: flex; gap: 16px; padding: 16px; cursor: pointer; align-items: center; }
.kb-entry-header:hover { background: #1e1e2a; }
.kb-entry-thumb { width: 120px; height: 68px; border-radius: 8px; object-fit: cover; background: #111; flex-shrink: 0; }
.kb-entry-info { flex: 1; min-width: 0; }
.kb-entry-info .username { font-weight: 600; font-size: 0.95em; margin-bottom: 2px; }
.kb-entry-info .meta { font-size: 0.8em; color: #666; margin-bottom: 4px; }
.kb-entry-info .cat-badge-inline { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.7em; font-weight: 600; margin-right: 8px; }
.kb-entry-info .topic-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.kb-entry-info .topic-pill { background: #2a2a3a; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; color: #aaa; }
.kb-entry-toggle { color: #7c6aef; font-size: 1.2em; padding: 0 8px; flex-shrink: 0; transition: transform 0.2s; }
.kb-entry.open .kb-entry-toggle { transform: rotate(180deg); }

.kb-entry-detail { display: none; padding: 0 16px 16px; }
.kb-entry.open .kb-entry-detail { display: block; }

.kb-section { margin-bottom: 16px; }
.kb-section-title { font-size: 0.85em; font-weight: 700; color: #7c6aef; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #2a2a3a; cursor: pointer; user-select: none; }
.kb-section-title:hover { color: #9d8ff5; }
.kb-section-body { font-size: 0.85em; color: #bbb; line-height: 1.6; }
.kb-section-body.collapsed { display: none; }

.kb-section-body pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0; }

/* Key takeaways */
.kb-takeaways { list-style: none; padding: 0; }
.kb-takeaways li { padding: 6px 0; padding-left: 20px; position: relative; }
.kb-takeaways li::before { content: "\\2022"; color: #7c6aef; font-size: 1.2em; position: absolute; left: 4px; top: 5px; }

/* Links table */
.kb-links-table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
.kb-links-table th { text-align: left; padding: 8px; color: #888; border-bottom: 1px solid #2a2a3a; font-weight: 600; }
.kb-links-table td { padding: 8px; border-bottom: 1px solid #1a1a24; }
.kb-links-table a { color: #7c9aef; text-decoration: none; }
.kb-links-table a:hover { text-decoration: underline; }
.kb-links-table .ts { color: #666; font-size: 0.9em; }

/* Links Directory */
.links-directory { padding: 16px 24px; }
.links-dir-group { margin-bottom: 24px; }
.links-dir-group h3 { font-size: 1em; font-weight: 700; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #2a2a3a; }
.links-dir-item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #1a1a2a; font-size: 0.85em; align-items: baseline; }
.links-dir-item a { color: #7c9aef; text-decoration: none; min-width: 0; word-break: break-all; }
.links-dir-item a:hover { text-decoration: underline; }
.links-dir-item .from { color: #666; font-size: 0.85em; white-space: nowrap; }

/* Search highlight */
mark { background: #7c6aef44; color: #e0e0e0; padding: 1px 2px; border-radius: 2px; }

.kb-match-context { font-size: 0.8em; color: #888; margin-top: 4px; padding: 4px 8px; background: #15151f; border-radius: 4px; }
.kb-match-context mark { background: #7c6aef55; }
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
function catColor(name) {
  var m = { "AI & Machine Learning":"#e8d5f5","Tech & Coding":"#d5e8f5","Business & Marketing":"#d5f5e0","Creative & Media":"#f5e8d5","Health & Wellness":"#f5d5d5","Education & Learning":"#f5f5d5","Lifestyle":"#f0d5f5","Other":"#ddd" };
  return m[name] || "#ccc";
}
function catBg(name) {
  var m = { "AI & Machine Learning":"#2d1f3d","Tech & Coding":"#1f2d3d","Business & Marketing":"#1f3d2d","Creative & Media":"#3d2d1f","Health & Wellness":"#3d1f1f","Education & Learning":"#3d3d1f","Lifestyle":"#351f3d","Other":"#333" };
  return m[name] || "#333";
}
function fmtDuration(s) {
  if (!s) return "0:00";
  s = Math.round(s);
  var m = Math.floor(s / 60);
  var sec = s % 60;
  return m + ":" + (sec < 10 ? "0" : "") + sec;
}
function escHtml(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function escAttr(s) { return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// ==================== TAB SWITCHING ====================
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.toggle("active", b.dataset.tab === tab); });
  document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.toggle("active", c.id === "tab-" + tab); });
}

// ==================== VIDEOS TAB (original logic) ====================
var CATALOG = ${catalogJsonStr};

// Stats
var totalSec = CATALOG.reduce(function(a, v) { return a + (v.duration_seconds || 0); }, 0);
var catSet = new Set(CATALOG.map(function(v) { return v.category; }));
document.getElementById("totalVideos").textContent = CATALOG.length;
document.getElementById("totalCategories").textContent = catSet.size;
var hrs = Math.floor(totalSec / 3600);
var mins = Math.floor((totalSec % 3600) / 60);
document.getElementById("totalDuration").textContent = (hrs ? hrs + "h " : "") + mins + "m";

// Category counts & pills (Videos tab)
var catCounts = {};
CATALOG.forEach(function(v) { catCounts[v.category] = (catCounts[v.category] || 0) + 1; });
var categories = Object.keys(catCounts).sort();

var activeCats = new Set();
var catBar = document.getElementById("categoryBar");
categories.forEach(function(cat) {
  var pill = document.createElement("span");
  pill.className = "cat-pill active";
  pill.style.background = catBg(cat);
  pill.style.color = catColor(cat);
  pill.innerHTML = cat + '<span class="count">' + catCounts[cat] + '</span>';
  pill.dataset.cat = cat;
  pill.addEventListener("click", function() {
    if (activeCats.size === 0) {
      activeCats.add(cat);
    } else if (activeCats.has(cat)) {
      activeCats.delete(cat);
    } else {
      activeCats.add(cat);
    }
    updatePills();
    render();
  });
  catBar.appendChild(pill);
});

function updatePills() {
  catBar.querySelectorAll(".cat-pill").forEach(function(p) {
    var c = p.dataset.cat;
    p.classList.toggle("active", activeCats.size === 0 || activeCats.has(c));
  });
}

var expandedFile = null;

function render() {
  var query = document.getElementById("searchBox").value.toLowerCase();
  var sort = document.getElementById("sortSelect").value;

  var items = CATALOG.filter(function(v) {
    if (activeCats.size > 0 && !activeCats.has(v.category)) return false;
    if (query) {
      var haystack = [v.instagram_user, v.description, v.caption, v.category, v.subcategory].concat(v.tags || []).join(" ").toLowerCase();
      return haystack.includes(query);
    }
    return true;
  });

  if (sort === "date") items.sort(function(a, b) { return (b.taken_at || "").localeCompare(a.taken_at || ""); });
  else if (sort === "date-asc") items.sort(function(a, b) { return (a.taken_at || "").localeCompare(b.taken_at || ""); });
  else if (sort === "duration") items.sort(function(a, b) { return (b.duration_seconds || 0) - (a.duration_seconds || 0); });
  else if (sort === "duration-asc") items.sort(function(a, b) { return (a.duration_seconds || 0) - (b.duration_seconds || 0); });
  else if (sort === "category") items.sort(function(a, b) { return a.category.localeCompare(b.category); });

  var grid = document.getElementById("grid");
  var noResults = document.getElementById("noResults");

  if (items.length === 0) {
    grid.innerHTML = "";
    noResults.style.display = "block";
    return;
  }
  noResults.style.display = "none";

  grid.innerHTML = items.map(function(v) {
    var isExpanded = expandedFile === v.filename;
    var basename = v.filename.replace(/\\.mp4$/, "");
    var thumbPath = "../videos/thumbnails/" + basename + ".jpg";
    var videoPath = "../videos/user_saved/" + v.filename;
    var tagsHtml = (v.tags || []).slice(0, 5).map(function(t) { return '<span class="tag">' + escHtml(t) + '</span>'; }).join("");
    var dateStr = v.taken_at ? new Date(v.taken_at).toLocaleDateString() : "";

    return '<div class="card' + (isExpanded ? ' expanded' : '') + '" data-file="' + escAttr(v.filename) + '">' +
      '<div class="thumb-wrap">' +
        '<img src="' + escAttr(thumbPath) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">' +
        '<span class="duration">' + fmtDuration(v.duration_seconds) + '</span>' +
        '<span class="cat-badge" style="background:' + catBg(v.category) + ';color:' + catColor(v.category) + '">' + escHtml(v.category) + '</span>' +
      '</div>' +
      (isExpanded ? '<div class="video-container" style="display:block"><video controls autoplay src="' + escAttr(videoPath) + '"></video></div>' : '') +
      '<div class="card-body">' +
        '<div class="username">@' + escHtml(v.instagram_user) + '</div>' +
        '<div class="desc">' + escHtml(v.description || v.caption || "") + '</div>' +
        '<div class="tags">' + tagsHtml + '</div>' +
        '<div class="card-meta">' +
          (dateStr ? '<span>' + dateStr + '</span>' : '') +
          (v.like_count ? '<span>' + v.like_count + ' likes</span>' : '') +
          '<span>' + fmtDuration(v.duration_seconds) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join("");

  grid.querySelectorAll(".card").forEach(function(card) {
    card.addEventListener("click", function(e) {
      if (e.target.tagName === "VIDEO") return;
      var file = card.dataset.file;
      expandedFile = expandedFile === file ? null : file;
      render();
    });
  });
}

document.getElementById("searchBox").addEventListener("input", render);
document.getElementById("sortSelect").addEventListener("change", render);
render();

// ==================== KNOWLEDGE BASE TAB ====================
var KNOWLEDGE = ${kbJson};

// KB Stats
document.getElementById("kbTotalVideos").textContent = KNOWLEDGE.length;
var allKbLinks = KNOWLEDGE.reduce(function(a, v) { return a.concat(v.links_and_resources || []); }, []);
document.getElementById("kbTotalLinks").textContent = allKbLinks.length;
var allTakeaways = KNOWLEDGE.reduce(function(a, v) { return a + (v.key_takeaways || []).length; }, 0);
document.getElementById("kbTotalTakeaways").textContent = allTakeaways;

// KB category pills
var kbCatCounts = {};
KNOWLEDGE.forEach(function(v) { kbCatCounts[v.category] = (kbCatCounts[v.category] || 0) + 1; });
var kbCategories = Object.keys(kbCatCounts).sort();
var kbActiveCats = new Set();
var kbCatBar = document.getElementById("kbCategoryBar");

kbCategories.forEach(function(cat) {
  var pill = document.createElement("span");
  pill.className = "cat-pill active";
  pill.style.background = catBg(cat);
  pill.style.color = catColor(cat);
  pill.innerHTML = cat + '<span class="count">' + kbCatCounts[cat] + '</span>';
  pill.dataset.cat = cat;
  pill.addEventListener("click", function() {
    if (kbActiveCats.size === 0) {
      kbActiveCats.add(cat);
    } else if (kbActiveCats.has(cat)) {
      kbActiveCats.delete(cat);
    } else {
      kbActiveCats.add(cat);
    }
    kbCatBar.querySelectorAll(".cat-pill").forEach(function(p) {
      var c = p.dataset.cat;
      p.classList.toggle("active", kbActiveCats.size === 0 || kbActiveCats.has(c));
    });
    renderKb();
  });
  kbCatBar.appendChild(pill);
});

var kbSection = "entries";
function switchKbSection(section) {
  kbSection = section;
  document.querySelectorAll(".kb-section-btn").forEach(function(b) { b.classList.toggle("active", b.dataset.section === section); });
  document.getElementById("kbEntries").style.display = section === "entries" ? "block" : "none";
  document.getElementById("kbLinksDir").style.display = section === "links" ? "block" : "none";
  renderKb();
}

function highlightText(text, query) {
  if (!query || !text) return escHtml(text || "");
  var escaped = escHtml(text);
  var qEsc = query.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\$&');
  var re = new RegExp('(' + qEsc + ')', 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function getMatchContext(text, query, maxLen) {
  if (!query || !text) return "";
  var lower = text.toLowerCase();
  var idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return "";
  var start = Math.max(0, idx - 60);
  var end = Math.min(text.length, idx + query.length + 60);
  var snippet = (start > 0 ? "..." : "") + text.substring(start, end) + (end < text.length ? "..." : "");
  return highlightText(snippet, query);
}

var kbOpenEntries = new Set();

function renderKb() {
  var query = document.getElementById("kbSearchBox").value.toLowerCase().trim();

  var items = KNOWLEDGE.filter(function(v) {
    if (kbActiveCats.size > 0 && !kbActiveCats.has(v.category)) return false;
    if (query) {
      var haystack = [
        v.username, v.description, v.caption, v.category, v.subcategory,
        v.transcript, v.visual_description
      ].concat(v.key_takeaways || [])
       .concat(v.topics || [])
       .concat(v.tags || [])
       .concat((v.links_and_resources || []).map(function(l) { return (l.url || "") + " " + (l.description || ""); }))
       .join(" ").toLowerCase();
      return haystack.includes(query);
    }
    return true;
  });

  var noResults = document.getElementById("kbNoResults");

  if (kbSection === "entries") {
    var container = document.getElementById("kbEntries");
    if (items.length === 0) {
      container.innerHTML = "";
      noResults.style.display = "block";
      return;
    }
    noResults.style.display = "none";

    container.innerHTML = items.map(function(v) {
      var thumbPath = "../videos/thumbnails/" + v.basename + ".jpg";
      var isOpen = kbOpenEntries.has(v.filename);
      var topicPills = (v.topics || []).map(function(t) { return '<span class="topic-pill">' + escHtml(t) + '</span>'; }).join("");

      // Match context for search
      var matchCtx = "";
      if (query) {
        var sources = [
          { label: "Transcript", text: v.transcript },
          { label: "Visual Description", text: v.visual_description },
          { label: "Takeaways", text: (v.key_takeaways || []).join(" ") },
          { label: "Links", text: (v.links_and_resources || []).map(function(l) { return l.url + " " + (l.description || ""); }).join(" ") }
        ];
        for (var si = 0; si < sources.length; si++) {
          var src = sources[si];
          if (src.text && src.text.toLowerCase().includes(query)) {
            matchCtx = '<div class="kb-match-context"><strong>' + src.label + ':</strong> ' + getMatchContext(src.text, query, 120) + '</div>';
            break;
          }
        }
      }

      // Links table
      var linksHtml = "";
      if (v.links_and_resources && v.links_and_resources.length > 0) {
        linksHtml = '<table class="kb-links-table"><thead><tr><th>Resource</th><th>Description</th><th>Time</th></tr></thead><tbody>' +
          v.links_and_resources.map(function(l) {
            var url = l.url || "";
            var isUrl = url.startsWith("http");
            var linkCell = isUrl ? '<a href="' + escAttr(url) + '" target="_blank" rel="noopener">' + escHtml(url) + '</a>' : escHtml(url);
            return '<tr><td>' + linkCell + '</td><td>' + escHtml(l.description || "") + '</td><td class="ts">' + escHtml(l.timestamp || "") + '</td></tr>';
          }).join("") +
          '</tbody></table>';
      } else {
        linksHtml = '<div style="color:#555;font-style:italic">No links extracted</div>';
      }

      // Key takeaways
      var takeawaysHtml = "";
      if (v.key_takeaways && v.key_takeaways.length > 0) {
        takeawaysHtml = '<ul class="kb-takeaways">' +
          v.key_takeaways.map(function(t) { return '<li>' + (query ? highlightText(t, query) : escHtml(t)) + '</li>'; }).join("") +
          '</ul>';
      } else {
        takeawaysHtml = '<div style="color:#555;font-style:italic">No takeaways extracted</div>';
      }

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
    }).join("");
  } else {
    // Links Directory
    renderLinksDirectory(items, query);
  }
}

function renderLinksDirectory(items, query) {
  var container = document.getElementById("kbLinksDir");
  var noResults = document.getElementById("kbNoResults");

  // Aggregate all links grouped by category
  var linksByCategory = {};
  items.forEach(function(v) {
    (v.links_and_resources || []).forEach(function(l) {
      if (!l.url) return;
      if (query && !(l.url + " " + (l.description || "")).toLowerCase().includes(query)) return;
      var cat = v.category;
      if (!linksByCategory[cat]) linksByCategory[cat] = [];
      linksByCategory[cat].push({
        url: l.url,
        description: l.description || "",
        timestamp: l.timestamp || "",
        fromVideo: v.username || v.filename
      });
    });
  });

  var cats = Object.keys(linksByCategory).sort();
  if (cats.length === 0) {
    container.innerHTML = "";
    noResults.style.display = "block";
    return;
  }
  noResults.style.display = "none";

  container.innerHTML = cats.map(function(cat) {
    var links = linksByCategory[cat];
    return '<div class="links-dir-group">' +
      '<h3 style="color:' + catColor(cat) + '">' + escHtml(cat) + ' (' + links.length + ' links)</h3>' +
      links.map(function(l) {
        var isUrl = l.url.startsWith("http");
        var linkEl = isUrl ? '<a href="' + escAttr(l.url) + '" target="_blank" rel="noopener">' + (query ? highlightText(l.url, query) : escHtml(l.url)) + '</a>' : '<span>' + (query ? highlightText(l.url, query) : escHtml(l.url)) + '</span>';
        return '<div class="links-dir-item">' +
          linkEl +
          (l.description ? '<span>' + (query ? highlightText(l.description, query) : escHtml(l.description)) + '</span>' : '') +
          '<span class="from">from @' + escHtml(l.fromVideo) + '</span>' +
        '</div>';
      }).join("") +
    '</div>';
  }).join("");
}

function toggleKbEntry(header) {
  var entry = header.parentElement;
  var file = entry.dataset.file;
  if (kbOpenEntries.has(file)) {
    kbOpenEntries.delete(file);
    entry.classList.remove("open");
  } else {
    kbOpenEntries.add(file);
    entry.classList.add("open");
  }
}

document.getElementById("kbSearchBox").addEventListener("input", renderKb);
renderKb();
</script>
</body>
</html>`;
}
