/**
 * DashboardAgent — port of build_dashboard_v2.py
 *
 * Generates dashboard/index.html with ALL data embedded as JS variables.
 * Has Videos tab + Knowledge Base tab + Verification tab.
 *
 * CRITICAL: Uses &quot; (not escaped quotes) for HTML attribute values inside
 * JS strings to avoid the classList.toggle bug.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";
import type { CatalogRecord } from "./catalog.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VerificationItemResult {
  item_name: string;
  research_summary: string;
  implementation_result: string;
  is_url_live: string;
  notes: string;
}

interface VerificationEntry {
  filename: string;
  verified_at: string;
  overall_score: string;
  summary: string;
  item_results: VerificationItemResult[];
  confidence: number;
  error?: string;
}

interface AnalysisEntry {
  filename: string;
  category: string;
  actionable_items: Array<{
    type: string;
    name: string;
    description: string;
    install_command: string;
    code: string;
    url: string;
    verification_steps: string[];
  }>;
  implementability_score: number;
  usefulness_prediction: string;
}

/** Combined verification dashboard entry. */
interface VerifDashboardEntry {
  filename: string;
  basename: string;
  username: string;
  category: string;
  overall_score: string;
  confidence: number;
  summary: string;
  verified_at: string;
  item_results: VerificationItemResult[];
  implementability_score: number;
  usefulness_prediction: string;
  actionable_items?: ActionableItemForUi[];
}

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
  low_content?: boolean;
}

/** Shape embedded in the dashboard HTML as KNOWLEDGE array entries. */
interface ActionableItemForUi {
  item_name: string;
  item_type?: string;
  description?: string;
  url?: string;
  install_command?: string;
  code?: string;
  verification_steps?: string;
}

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
  low_content: boolean;
  // Verification metadata
  verification_status?: string;
  verification_score?: string;
  verification_summary?: string;
  actionable_items_count?: number;
  implementability_score?: number;
  // Actionable items from analysis stage
  actionable_items?: ActionableItemForUi[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeJsonForEmbed(jsonStr: string): string {
  // The JSON is embedded directly inside a <script> tag. We need to escape
  // sequences that could break the HTML parser or enable injection:
  // 1. </script> — closes the script tag prematurely
  // 2. <!-- — opens an HTML comment that can hide/alter content
  return jsonStr
    .replace(/<\/script/gi, "<\\/script")
    .replace(/<!--/g, "<\\!--");
}

/**
 * Compress JSON data to base64-encoded gzip for embedding in HTML.
 * The browser-side decompression uses the built-in DecompressionStream API.
 * Returns a base64 string and the original byte size for logging.
 */
function compressForEmbed(jsonStr: string): { base64: string; originalBytes: number; compressedBytes: number } {
  const originalBytes = Buffer.byteLength(jsonStr, "utf8");
  const gzipped = gzipSync(Buffer.from(jsonStr, "utf8"), { level: 9 });
  const base64 = gzipped.toString("base64");
  return { base64, originalBytes, compressedBytes: gzipped.length };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runDashboardAgent(): Promise<void> {
  console.log("\n=== DashboardAgent ===");
  console.log("Loading data...");

  // Load knowledge base (single merged file)
  const knowledge = await loadState<Record<string, KnowledgeEntry>>(
    CONFIG.STATE.KNOWLEDGE_BASE,
    {}
  );
  console.log(`Knowledge base: ${Object.keys(knowledge).length} entries`);

  // Load catalog
  const catalog = await loadState<CatalogRecord[]>(CONFIG.STATE.CATALOG, []);
  console.log(`Catalog: ${catalog.length} videos`);

  // Build a Map for O(1) catalog lookups instead of O(n) find() per KB entry
  const catalogByFilename = new Map(catalog.map((c) => [c.filename, c]));

  // Pre-load verifications + analysis to enrich KB entries
  const verificationsForKb = await loadState<Record<string, VerificationEntry>>(
    CONFIG.STATE.VERIFICATIONS, {}
  );
  const analysisForKb = await loadState<Record<string, AnalysisEntry>>(
    CONFIG.STATE.ANALYSIS, {}
  );

  // Build knowledge base entries enriched with catalog metadata
  const kbEntries: KbDashboardEntry[] = [];

  for (const [filename, kbData] of Object.entries(knowledge)) {
    // O(1) lookup instead of O(n) find
    const catEntry = catalogByFilename.get(filename);

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

    const verEntry = verificationsForKb[filename];
    const anEntry = analysisForKb[filename];
    const actionableForUi: ActionableItemForUi[] | undefined = anEntry?.actionable_items
      ? (anEntry.actionable_items as Array<Record<string, unknown>>).map((a) => {
          const vs = a.verification_steps;
          const verificationStepsStr = Array.isArray(vs)
            ? vs.map(String).filter(Boolean).join("\n")
            : (typeof vs === "string" ? vs : "");
          return {
            item_name: String(a.name ?? a.item_name ?? ""),
            item_type: (a.type ?? a.item_type) as string | undefined,
            description: a.description as string | undefined,
            url: a.url as string | undefined,
            install_command: a.install_command as string | undefined,
            code: a.code as string | undefined,
            verification_steps: verificationStepsStr || undefined,
          };
        }).filter((a) => a.item_name)
      : undefined;

    const entry: KbDashboardEntry = {
      filename,
      basename: filename.includes(".")
        ? filename.slice(0, filename.lastIndexOf("."))
        : filename,
      category: kbData.category ?? "Unknown",
      subcategory: kbData.subcategory ?? "",
      username:
        kbData.username || catEntry?.instagram_user || "",
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
      low_content: kbData.low_content === true,
      verification_status: verEntry?.overall_score,
      verification_score: verEntry?.overall_score,
      verification_summary: verEntry?.summary,
      actionable_items_count: anEntry?.actionable_items?.length ?? 0,
      implementability_score: anEntry?.implementability_score,
      actionable_items: actionableForUi,
    };
    kbEntries.push(entry);
  }

  kbEntries.sort((a, b) => (b.taken_at || "").localeCompare(a.taken_at || ""));
  console.log(`Knowledge base entries prepared: ${kbEntries.length}`);

  // Get categories for KB
  const kbCategories = [...new Set(kbEntries.map((e) => e.category))].sort();
  console.log(`KB categories: ${kbCategories}`);

  // Reuse already-loaded verifications + analysis
  const verifications = verificationsForKb;
  const analysis = analysisForKb;
  console.log(`Verifications: ${Object.keys(verifications).length}, Analysis: ${Object.keys(analysis).length}`);

  // Build combined verification dashboard entries
  const verifEntries: VerifDashboardEntry[] = [];
  for (const [filename, ver] of Object.entries(verifications)) {
    if (ver.error) continue;
    const an = analysis[filename];
    const catEntry = catalogByFilename.get(filename);
    const actionableForUi: ActionableItemForUi[] | undefined = an?.actionable_items
      ? (an.actionable_items as Array<Record<string, unknown>>).map((a) => {
          const vs = a.verification_steps;
          const verificationStepsStr = Array.isArray(vs)
            ? vs.map(String).filter(Boolean).join("\n")
            : (typeof vs === "string" ? vs : "");
          return {
            item_name: String(a.name ?? a.item_name ?? ""),
            item_type: (a.type ?? a.item_type) as string | undefined,
            description: a.description as string | undefined,
            url: a.url as string | undefined,
            install_command: a.install_command as string | undefined,
            code: a.code as string | undefined,
            verification_steps: verificationStepsStr || undefined,
          };
        }).filter((a) => a.item_name)
      : undefined;
    verifEntries.push({
      filename,
      basename: filename.includes(".") ? filename.slice(0, filename.lastIndexOf(".")) : filename,
      username: catEntry?.instagram_user ?? "",
      category: an?.category ?? catEntry?.category ?? "Unknown",
      overall_score: ver.overall_score,
      confidence: ver.confidence,
      summary: ver.summary,
      verified_at: ver.verified_at,
      item_results: ver.item_results ?? [],
      implementability_score: an?.implementability_score ?? 0,
      usefulness_prediction: an?.usefulness_prediction ?? "unknown",
      actionable_items: actionableForUi,
    });
  }
  // Default sort: confidence descending
  verifEntries.sort((a, b) => b.confidence - a.confidence);
  console.log(`Verification entries prepared: ${verifEntries.length}`);

  // Serialize data for embedding -- compress with gzip to reduce HTML size
  const catalogJson = JSON.stringify(catalog, null, 0);
  const kbJson = JSON.stringify(kbEntries, null, 0);
  const verifJson = JSON.stringify(verifEntries, null, 0);

  const catalogComp = compressForEmbed(catalogJson);
  const kbComp = compressForEmbed(kbJson);
  const verifComp = compressForEmbed(verifJson);

  const totalOriginal = catalogComp.originalBytes + kbComp.originalBytes + verifComp.originalBytes;
  const totalCompressed = catalogComp.compressedBytes + kbComp.compressedBytes + verifComp.compressedBytes;
  console.log(`Data compression: ${(totalOriginal / 1024).toFixed(0)}KB -> ${(totalCompressed / 1024).toFixed(0)}KB (${Math.round((1 - totalCompressed / totalOriginal) * 100)}% reduction)`);

  // Build the HTML with compressed data
  const html = buildHtml(catalogComp.base64, kbComp.base64, verifComp.base64);

  // Write output
  const dashboardDir = path.dirname(CONFIG.OUTPUT.DASHBOARD);
  await fs.mkdir(dashboardDir, { recursive: true });
  await fs.writeFile(CONFIG.OUTPUT.DASHBOARD, html, "utf8");

  console.log("Dashboard updated successfully!");
  console.log(`Output: ${CONFIG.OUTPUT.DASHBOARD} (${(html.length / 1024).toFixed(0)}KB, down from ~900KB uncompressed)`);
}

// ---------------------------------------------------------------------------
// HTML builder — mirrors build_dashboard_v2.py:build_html()
// ---------------------------------------------------------------------------

function buildHtml(catalogJsonStr: string, kbJson: string, verifJson: string): string {
  // CRITICAL: In all onclick handlers, use &quot; for attribute value quotes
  // to avoid the classList.toggle bug where escaped quotes inside JS strings
  // break the HTML parser.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dopamine — Dashboard</title>
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
.category-bar { display: flex; gap: 6px; flex-wrap: wrap; max-height: 80px; overflow-y: auto; padding: 2px 0; }
.cat-pill { padding: 5px 12px; border-radius: 20px; font-size: 0.75em; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; user-select: none; opacity: 0.6; white-space: nowrap; }
.cat-pill:hover { opacity: 0.85; }
.cat-pill.active { opacity: 1; border-color: #fff3; box-shadow: 0 0 8px #0004; }
.cat-pill .count { margin-left: 4px; opacity: 0.7; }

/* Grid */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; padding: 24px; max-width: 1800px; margin: 0 auto; }
@media (max-width: 640px) { .grid { grid-template-columns: 1fr; padding: 12px; gap: 12px; } }

/* Card */
.card { background: #1a1a24; border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
.card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px #0006; }
.card.expanded { grid-column: 1 / -1; max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 0; }
@media (max-width: 900px) { .card.expanded { grid-template-columns: 1fr; } }
.thumb-wrap { position: relative; width: 100%; padding-top: 56.25%; background: linear-gradient(135deg, #1a1a28 0%, #14141e 100%); overflow: hidden; }
.thumb-wrap::before { content: "▶"; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #2a2a3a; font-size: 2.5em; pointer-events: none; }
.thumb-wrap img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
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
.video-container video { width: 100%; max-height: 60vh; background: #000; display: block; }
.card.expanded .card-body { max-height: 60vh; overflow-y: auto; padding: 20px 24px; }
.card.expanded .card-body::-webkit-scrollbar { width: 8px; }
.card.expanded .card-body::-webkit-scrollbar-track { background: transparent; }
.card.expanded .card-body::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
.card.expanded .card-body .username { font-size: 1.1em; margin-bottom: 8px; }
.card.expanded .card-body .desc { font-size: 0.92em; line-height: 1.55; color: #b8b8c4; margin-bottom: 16px; }
.card.expanded .card-meta { font-size: 0.85em; padding-top: 12px; border-top: 1px solid #2a2a3a; }

/* Expanded card affordances -- text is selectable; explicit close button */
.card.expanded .card-body { user-select: text; -webkit-user-select: text; cursor: text; }
.card.expanded .card-body .desc, .card.expanded .card-body .username { cursor: text; }
.card-close { display: none; position: absolute; top: 10px; right: 10px; z-index: 5; background: #2a2a3a; color: #ddd; border: 1px solid #3a3a4a; border-radius: 50%; width: 32px; height: 32px; font-size: 1em; line-height: 30px; text-align: center; cursor: pointer; padding: 0; transition: background 0.2s; }
.card-close:hover { background: #7c6aef; color: #fff; }
.card.expanded .card-close { display: block; }
.card.expanded { position: relative; }

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

.kb-section-toggle { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.kb-section-btn { padding: 8px 20px; border-radius: 8px; font-size: 0.85em; font-weight: 600; cursor: pointer; border: 1px solid #2a2a3a; background: #1a1a24; color: #888; transition: all 0.2s; }
.kb-section-btn.active { background: #7c6aef; color: #fff; border-color: #7c6aef; }
.kb-sort-select { margin-left: auto; padding: 8px 14px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 0.85em; cursor: pointer; outline: none; }
.kb-entry-info .date { color: #777; font-size: 0.78em; margin-left: 6px; }
.low-content-badge { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 10px; font-size: 0.65em; font-weight: 700; letter-spacing: 0.5px; background: #3a2a1a; color: #c97b2a; border: 1px solid #5a3d20; }
.kb-hide-low-content { display: flex; align-items: center; gap: 6px; font-size: 0.8em; color: #888; cursor: pointer; user-select: none; }
.kb-hide-low-content input { cursor: pointer; }

.kb-list { padding: 16px 24px; max-width: 1200px; margin: 0 auto; }
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

/* Actionable items */
.actionable-item { background: #14141e; border-left: 3px solid #7c6aef; padding: 10px 14px; margin-bottom: 10px; border-radius: 4px; }
.actionable-item .ai-name { font-weight: 600; color: #e0e0e8; margin-bottom: 4px; font-size: 0.95em; }
.actionable-item .ai-type { font-size: 0.7em; padding: 2px 8px; background: #2a2a3a; border-radius: 4px; color: #a8a8b8; margin-left: 6px; font-weight: 500; }
.actionable-item .ai-desc { font-size: 0.88em; color: #b0b0bc; line-height: 1.5; margin-bottom: 6px; }
.actionable-item .ai-url { font-size: 0.85em; margin-bottom: 8px; word-break: break-all; }
.actionable-item .ai-url a { color: #9d8ff5; }
.actionable-item .ai-label { font-size: 0.72em; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; margin-bottom: 4px; font-weight: 600; }
.actionable-item .ai-cmd, .actionable-item .ai-code { background: #0a0a12; padding: 8px 12px; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', Consolas, monospace; font-size: 0.85em; color: #c8c8d4; overflow-x: auto; white-space: pre; line-height: 1.5; }
.actionable-item .ai-cmd { color: #4ade80; }
.actionable-item .ai-verify { font-size: 0.88em; color: #b8b8c4; line-height: 1.5; }
.action-count { background: #2a2a3a; color: #b8a4ff; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: 600; margin-left: 8px; }
.verif-summary-text { color: #c8c8d4; line-height: 1.6; padding: 4px 0; font-size: 0.92em; }


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

/* ==================== Verification Tab Styles ==================== */
.verif-controls { background: #141420; padding: 16px 24px; border-bottom: 1px solid #2a2a3a; position: sticky; top: 0; z-index: 100; }
.verif-filter-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.verif-filter-btn { padding: 8px 16px; border-radius: 20px; font-size: 0.8em; font-weight: 600; cursor: pointer; border: 2px solid transparent; background: #1a1a24; color: #888; transition: all 0.2s; }
.verif-filter-btn:hover { opacity: 0.85; }
.verif-filter-btn.active { opacity: 1; }
.verif-filter-btn[data-status="all"].active { border-color: #7c6aef; color: #7c6aef; }
.verif-filter-btn[data-status="verified_useful"].active { border-color: #4CAF50; color: #4CAF50; }
.verif-filter-btn[data-status="partially_verified"].active { border-color: #FFC107; color: #FFC107; }
.verif-filter-btn[data-status="not_verified"].active { border-color: #F44336; color: #F44336; }
.verif-filter-btn[data-status="outdated"].active { border-color: #9E9E9E; color: #9E9E9E; }
.verif-sort-row { display: flex; gap: 12px; align-items: center; }
.verif-sort-select { padding: 10px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 0.95em; cursor: pointer; outline: none; }
.verif-search-box { flex: 1; min-width: 200px; padding: 10px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1a1a24; color: #e0e0e0; font-size: 0.95em; outline: none; transition: border-color 0.2s; }
.verif-search-box:focus { border-color: #7c6aef; }

.verif-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; padding: 24px; max-width: 1800px; margin: 0 auto; }
@media (max-width: 640px) { .verif-grid { grid-template-columns: 1fr; padding: 12px; gap: 12px; } }

.verif-card { background: #1a1a24; border-radius: 12px; overflow: hidden; border-left: 4px solid #555; transition: transform 0.2s, box-shadow 0.2s; animation: fadeIn 0.3s ease; }
.verif-card.open { grid-column: 1 / -1; max-width: 1400px; margin: 0 auto; }
.verif-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px #0005; }
.verif-card.status-verified_useful { border-left-color: #4CAF50; }
.verif-card.status-partially_verified { border-left-color: #FFC107; }
.verif-card.status-not_verified { border-left-color: #F44336; }
.verif-card.status-outdated { border-left-color: #9E9E9E; }

.verif-card-header { display: flex; gap: 12px; padding: 14px 16px; cursor: pointer; align-items: center; }
.verif-card-header:hover { background: #1e1e2a; }
.verif-card-thumb { width: 100px; height: 56px; border-radius: 6px; object-fit: cover; background: #111; flex-shrink: 0; }
.verif-card-info { flex: 1; min-width: 0; }
.verif-card-info .username { font-weight: 600; font-size: 1em; margin-bottom: 4px; color: #e0e0e0; }
.verif-card-info .category-line { font-size: 0.85em; color: #aaa; margin-bottom: 6px; }
.verif-card-info .verif-badges { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.verif-badge { padding: 2px 10px; border-radius: 10px; font-size: 0.7em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.verif-badge.verified_useful { background: #4CAF5022; color: #4CAF50; }
.verif-badge.partially_verified { background: #FFC10722; color: #FFC107; }
.verif-badge.not_verified { background: #F4433622; color: #F44336; }
.verif-badge.outdated { background: #9E9E9E22; color: #9E9E9E; }

.confidence-badge { font-size: 0.82em; color: #d8d8e8; font-weight: 600; background: #2a2a3a; padding: 2px 8px; border-radius: 6px; }

.verif-card-toggle { color: #7c6aef; font-size: 1.1em; padding: 0 8px; flex-shrink: 0; transition: transform 0.2s; }
.verif-card.open .verif-card-toggle { transform: rotate(180deg); }

.verif-card-summary { padding: 0 16px 14px; font-size: 0.92em; color: #c0c0cc; line-height: 1.6; }

.verif-card-detail { display: none; padding: 0 16px 16px; }
.verif-card.open .verif-card-detail { display: block; }

.verif-items-table { width: 100%; border-collapse: collapse; font-size: 0.92em; margin-top: 8px; }
.verif-items-table th { text-align: left; padding: 10px; color: #b0b0c0; border-bottom: 1px solid #2a2a3a; font-weight: 600; font-size: 0.95em; }
.verif-items-table td { padding: 10px; border-bottom: 1px solid #1a1a2a; vertical-align: top; color: #c8c8d4; line-height: 1.5; }
.verif-items-table .item-name { font-weight: 600; color: #e0e0e0; }
.verif-items-table .research-summary { font-size: 0.92em; color: #a0a0b0; line-height: 1.55; max-width: 380px; }
.verif-items-table .item-notes { font-size: 0.92em; color: #999; line-height: 1.5; max-width: 280px; }
.verif-items-table .impl-badge { padding: 3px 10px; border-radius: 8px; font-size: 0.88em; font-weight: 600; }
.impl-success { background: #4CAF5022; color: #4CAF50; }
.impl-skipped { background: #FFC10722; color: #FFC107; }
.impl-failed { background: #F4433622; color: #F44336; }

.url-live-yes { color: #4CAF50; }
.url-live-no { color: #F44336; }
.url-live-na { color: #666; }
</style>
</head>
<body>

<!-- Tab Navigation -->
<div class="tab-nav">
  <a href="/" class="tab-btn" style="text-decoration:none;color:#888;display:flex;align-items:center;">← Overview</a>
  <button class="tab-btn active" data-tab="videos" onclick="switchTab('videos')">Videos</button>
  <button class="tab-btn" data-tab="knowledge" onclick="switchTab('knowledge')">Knowledge Base</button>
  <button class="tab-btn" data-tab="verification" onclick="switchTab('verification')">Verification</button>
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
    <label class="kb-hide-low-content" title="Hide entries where Gemini could not extract meaningful content">
      <input type="checkbox" id="kbHideLowContent" checked>
      Hide low-content
    </label>
    <select class="kb-sort-select" id="kbSortSelect">
      <option value="date">Sort: Date (newest)</option>
      <option value="date-asc">Sort: Date (oldest)</option>
      <option value="username">Sort: Username (A-Z)</option>
      <option value="category">Sort: Category (A-Z)</option>
      <option value="takeaways">Sort: Most takeaways</option>
    </select>
  </div>
  <div class="category-bar" id="kbCategoryBar"></div>
</div>

<div id="kbEntries" class="kb-list"></div>
<div id="kbLinksDir" class="links-directory" style="display:none;"></div>
<div class="no-results" id="kbNoResults" style="display:none;">No knowledge base entries match your search.</div>

</div>

<!-- ==================== VERIFICATION TAB ==================== -->
<div class="tab-content" id="tab-verification">

<div class="stats-bar">
  <div class="stat"><div class="stat-value" id="verifTotal">0</div><div class="stat-label">Verified Videos</div></div>
  <div class="stat"><div class="stat-value" style="color:#4CAF50" id="verifUseful">0</div><div class="stat-label">Verified Useful</div></div>
  <div class="stat"><div class="stat-value" style="color:#FFC107" id="verifPartial">0</div><div class="stat-label">Partially Verified</div></div>
  <div class="stat"><div class="stat-value" style="color:#F44336" id="verifNot">0</div><div class="stat-label">Not Verified</div></div>
  <div class="stat"><div class="stat-value" style="color:#9E9E9E" id="verifOutdated">0</div><div class="stat-label">Outdated</div></div>
</div>

<div class="verif-controls">
  <div class="verif-filter-row">
    <button class="verif-filter-btn active" data-status="all" onclick="setVerifFilter(&quot;all&quot;)">All</button>
    <button class="verif-filter-btn" data-status="verified_useful" onclick="setVerifFilter(&quot;verified_useful&quot;)">Verified Useful</button>
    <button class="verif-filter-btn" data-status="partially_verified" onclick="setVerifFilter(&quot;partially_verified&quot;)">Partially Verified</button>
    <button class="verif-filter-btn" data-status="not_verified" onclick="setVerifFilter(&quot;not_verified&quot;)">Not Verified</button>
    <button class="verif-filter-btn" data-status="outdated" onclick="setVerifFilter(&quot;outdated&quot;)">Outdated</button>
  </div>
  <div class="verif-sort-row">
    <input class="verif-search-box" id="verifSearchBox" type="text" placeholder="Search by username, category, summary...">
    <select class="verif-sort-select" id="verifSortSelect">
      <option value="confidence-desc">Sort: Confidence (highest)</option>
      <option value="confidence-asc">Sort: Confidence (lowest)</option>
      <option value="status">Sort: Status</option>
      <option value="category">Sort: Category (A-Z)</option>
      <option value="date">Sort: Verified Date (newest)</option>
    </select>
  </div>
</div>

<div class="verif-grid" id="verifGrid"></div>
<div class="no-results" id="verifNoResults" style="display:none;">No verification results match your filters.</div>

</div>

<script>
(async function() {
// ==================== GZIP DECOMPRESSION LOADER ====================
// Data is embedded as base64-encoded gzip to reduce dashboard size by ~60-70%.
// Uses the browser-native DecompressionStream API (Chrome 80+, Firefox 113+, Safari 16.4+).
async function _decompress(b64) {
  var bytes = Uint8Array.from(atob(b64), function(c) { return c.charCodeAt(0); });
  var ds = new DecompressionStream("gzip");
  var writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  var reader = ds.readable.getReader();
  var chunks = [];
  while (true) {
    var r = await reader.read();
    if (r.done) break;
    chunks.push(r.value);
  }
  var totalLen = chunks.reduce(function(a, c) { return a + c.length; }, 0);
  var merged = new Uint8Array(totalLen);
  var offset = 0;
  for (var i = 0; i < chunks.length; i++) {
    merged.set(chunks[i], offset);
    offset += chunks[i].length;
  }
  return JSON.parse(new TextDecoder().decode(merged));
}

// ==================== SHARED UTILITIES ====================
function catColor(name) {
  var m = {
    "Tech & Coding":"#d5e8f5",
    "AI & Machine Learning":"#e8d5f5",
    "UI/UX Design":"#f5d5e8",
    "Business & Marketing":"#d5f5e0",
    "Education":"#f5f5d5",
    "Finance":"#d5f5f0",
    "Interior Design & Home":"#f5e8d5",
    "Food & Cooking":"#f5d5d5",
    "Travel & Lifestyle":"#f0d5f5",
    "Fitness & Health":"#e0f5d5",
    "Entertainment & Comedy":"#f5e8e0",
    "Other":"#ddd"
  };
  return m[name] || "#ccc";
}
function catBg(name) {
  var m = {
    "Tech & Coding":"#1f2d3d",
    "AI & Machine Learning":"#2d1f3d",
    "UI/UX Design":"#3d1f2d",
    "Business & Marketing":"#1f3d2d",
    "Education":"#3d3d1f",
    "Finance":"#1f3d3a",
    "Interior Design & Home":"#3d2d1f",
    "Food & Cooking":"#3d1f1f",
    "Travel & Lifestyle":"#351f3d",
    "Fitness & Health":"#2a3d1f",
    "Entertainment & Comedy":"#3d2e25",
    "Other":"#333"
  };
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
var CATALOG = await _decompress("${catalogJsonStr}");

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
      (isExpanded ? '<button class="card-close" type="button" title="Close" aria-label="Close">&times;</button>' : '') +
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
      // Ignore interactions inside the video player
      if (e.target.tagName === "VIDEO") return;
      // Don't collapse if the user is selecting text -- they want to copy
      if (window.getSelection && window.getSelection().toString().length > 0) return;
      var isExpanded = card.classList.contains("expanded");
      // Explicit close button always toggles
      if (e.target.closest(".card-close")) {
        expandedFile = null;
        render();
        return;
      }
      // When expanded, clicks inside the body or video area must not collapse
      // (they're for reading/selecting/copying text). Only the thumb-wrap (hidden
      // when expanded) or the close button collapses.
      if (isExpanded && e.target.closest(".card-body, .video-container")) return;
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
var KNOWLEDGE = await _decompress("${kbJson}");

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
  var sortEl = document.getElementById("kbSortSelect");
  var sort = sortEl ? sortEl.value : "date";
  var hideLowEl = document.getElementById("kbHideLowContent");
  var hideLow = hideLowEl ? hideLowEl.checked : true;

  var items = KNOWLEDGE.filter(function(v) {
    if (hideLow && v.low_content) return false;
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

  // Sort items -- default is newest first
  if (sort === "date") items.sort(function(a, b) { return (b.taken_at || "").localeCompare(a.taken_at || ""); });
  else if (sort === "date-asc") items.sort(function(a, b) { return (a.taken_at || "").localeCompare(b.taken_at || ""); });
  else if (sort === "username") items.sort(function(a, b) { return (a.username || "").localeCompare(b.username || ""); });
  else if (sort === "category") items.sort(function(a, b) { return (a.category || "").localeCompare(b.category || ""); });
  else if (sort === "takeaways") items.sort(function(a, b) { return (b.key_takeaways || []).length - (a.key_takeaways || []).length; });

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
      var dateStr = v.taken_at ? new Date(v.taken_at).toLocaleDateString() : "";

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
      } else if (v.low_content) {
        takeawaysHtml = '<div style="color:#777;font-style:italic">This video has minimal extractable content (entertainment/lifestyle reel with no spoken content or actionable visuals). Gemini\u2019s frame-based analysis could not produce meaningful takeaways.</div>';
      } else {
        takeawaysHtml = '<div style="color:#555;font-style:italic">No takeaways extracted</div>';
      }

      // Verification status badge
      var verifBadge = "";
      if (v.verification_status) {
        verifBadge = '<span class="verif-badge ' + escAttr(v.verification_status) + '" style="margin-left:8px;font-size:0.72em;padding:2px 8px;">' + escHtml(verifStatusLabel(v.verification_status)) + '</span>';
      }

      // Actionable items section
      var actionableHtml = "";
      if (v.actionable_items && v.actionable_items.length > 0) {
        actionableHtml = '<div class="kb-section">' +
          '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Actionable Items (' + v.actionable_items.length + ')</div>' +
          '<div class="kb-section-body">' +
          v.actionable_items.map(function(a) {
            var html = '<div class="actionable-item">' +
              '<div class="ai-name">' + escHtml(a.item_name) + (a.item_type ? ' <span class="ai-type">' + escHtml(a.item_type) + '</span>' : '') + '</div>';
            if (a.description) html += '<div class="ai-desc">' + escHtml(a.description) + '</div>';
            if (a.url) html += '<div class="ai-url"><a href="' + escAttr(a.url) + '" target="_blank" rel="noopener">' + escHtml(a.url) + '</a></div>';
            if (a.install_command) html += '<div class="ai-label">Install:</div><pre class="ai-cmd">' + escHtml(a.install_command) + '</pre>';
            if (a.code) html += '<div class="ai-label">Code:</div><pre class="ai-code">' + escHtml(a.code) + '</pre>';
            if (a.verification_steps) html += '<div class="ai-label">Verification:</div><div class="ai-verify">' + escHtml(a.verification_steps).replace(/\\n/g, "<br>") + '</div>';
            html += '</div>';
            return html;
          }).join("") +
          '</div>' +
        '</div>';
      }

      // Verification summary section (if available)
      var verifSummaryHtml = "";
      if (v.verification_summary) {
        verifSummaryHtml = '<div class="kb-section">' +
          '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Verification Summary</div>' +
          '<div class="kb-section-body"><div class="verif-summary-text">' + escHtml(v.verification_summary) + '</div></div>' +
        '</div>';
      }

      return '<div class="kb-entry' + (isOpen ? ' open' : '') + '" data-file="' + escAttr(v.filename) + '">' +
        '<div class="kb-entry-header" onclick="toggleKbEntry(this)">' +
          '<img class="kb-entry-thumb" src="' + escAttr(thumbPath) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">' +
          '<div class="kb-entry-info">' +
            '<div class="username">@' + escHtml(v.username || "unknown") + (v.full_name ? ' <span style="color:#666;font-weight:400">(' + escHtml(v.full_name) + ')</span>' : '') + verifBadge + '</div>' +
            '<div class="meta">' +
              '<span class="cat-badge-inline" style="background:' + catBg(v.category) + ';color:' + catColor(v.category) + '">' + escHtml(v.category) + '</span>' +
              escHtml(v.subcategory || "") +
              (v.duration ? ' &middot; ' + fmtDuration(v.duration) : '') +
              (dateStr ? '<span class="date">&middot; ' + escHtml(dateStr) + '</span>' : '') +
              (v.actionable_items_count ? ' <span class="action-count" title="Actionable items">' + v.actionable_items_count + ' actions</span>' : '') +
              (v.low_content ? '<span class="low-content-badge" title="Gemini could not extract meaningful content from this video">LOW CONTENT</span>' : '') +
            '</div>' +
            '<div class="topic-pills">' + topicPills + '</div>' +
            matchCtx +
          '</div>' +
          '<div class="kb-entry-toggle">&#9660;</div>' +
        '</div>' +
        '<div class="kb-entry-detail">' +
          verifSummaryHtml +
          '<div class="kb-section">' +
            '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Key Takeaways</div>' +
            '<div class="kb-section-body">' + takeawaysHtml + '</div>' +
          '</div>' +
          actionableHtml +
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
  // Don't toggle if the user is selecting text -- they want to copy
  if (window.getSelection && window.getSelection().toString().length > 0) return;
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
document.getElementById("kbSortSelect").addEventListener("change", renderKb);
document.getElementById("kbHideLowContent").addEventListener("change", renderKb);
renderKb();

// ==================== VERIFICATION TAB ====================
var VERIFICATIONS = await _decompress("${verifJson}");

// Verification Stats
var verifCounts = { verified_useful: 0, partially_verified: 0, not_verified: 0, outdated: 0 };
VERIFICATIONS.forEach(function(v) {
  if (verifCounts.hasOwnProperty(v.overall_score)) verifCounts[v.overall_score]++;
});
document.getElementById("verifTotal").textContent = VERIFICATIONS.length;
document.getElementById("verifUseful").textContent = verifCounts.verified_useful;
document.getElementById("verifPartial").textContent = verifCounts.partially_verified;
document.getElementById("verifNot").textContent = verifCounts.not_verified;
document.getElementById("verifOutdated").textContent = verifCounts.outdated;

var verifFilter = "all";
var verifOpenCards = new Set();

function setVerifFilter(status) {
  verifFilter = status;
  document.querySelectorAll(".verif-filter-btn").forEach(function(b) {
    b.classList.toggle("active", b.dataset.status === status);
  });
  renderVerif();
}

function verifStatusLabel(s) {
  var labels = { verified_useful: "Verified Useful", partially_verified: "Partially Verified", not_verified: "Not Verified", outdated: "Outdated" };
  return labels[s] || s;
}

function verifStatusOrder(s) {
  var order = { verified_useful: 0, partially_verified: 1, not_verified: 2, outdated: 3 };
  return order.hasOwnProperty(s) ? order[s] : 4;
}

function implBadgeClass(result) {
  if (result === "success") return "impl-success";
  if (result === "failed") return "impl-failed";
  return "impl-skipped";
}

function urlLiveClass(status) {
  if (status === "yes") return "url-live-yes";
  if (status === "no") return "url-live-no";
  return "url-live-na";
}

function urlLiveLabel(status) {
  if (status === "yes") return "Live";
  if (status === "no") return "Dead";
  return "N/A";
}

function renderVerif() {
  var query = document.getElementById("verifSearchBox").value.toLowerCase().trim();
  var sort = document.getElementById("verifSortSelect").value;

  var items = VERIFICATIONS.filter(function(v) {
    if (verifFilter !== "all" && v.overall_score !== verifFilter) return false;
    if (query) {
      var haystack = [v.username, v.category, v.summary, v.overall_score].join(" ").toLowerCase();
      return haystack.includes(query);
    }
    return true;
  });

  // Sort
  if (sort === "confidence-desc") items.sort(function(a, b) { return b.confidence - a.confidence; });
  else if (sort === "confidence-asc") items.sort(function(a, b) { return a.confidence - b.confidence; });
  else if (sort === "status") items.sort(function(a, b) { return verifStatusOrder(a.overall_score) - verifStatusOrder(b.overall_score); });
  else if (sort === "category") items.sort(function(a, b) { return a.category.localeCompare(b.category); });
  else if (sort === "date") items.sort(function(a, b) { return (b.verified_at || "").localeCompare(a.verified_at || ""); });

  var grid = document.getElementById("verifGrid");
  var noResults = document.getElementById("verifNoResults");

  if (items.length === 0) {
    grid.innerHTML = "";
    noResults.style.display = "block";
    return;
  }
  noResults.style.display = "none";

  grid.innerHTML = items.map(function(v) {
    var thumbPath = "../videos/thumbnails/" + v.basename + ".jpg";
    var isOpen = verifOpenCards.has(v.filename);

    // Build item results table
    var itemsTableHtml = "";
    if (v.item_results && v.item_results.length > 0) {
      itemsTableHtml = '<table class="verif-items-table">' +
        '<thead><tr><th style="width:22%">Item</th><th style="width:30%">Research</th><th>Impl</th><th>URL</th><th>Notes</th></tr></thead><tbody>' +
        v.item_results.map(function(ir) {
          return '<tr>' +
            '<td><div class="item-name">' + escHtml(ir.item_name) + '</div></td>' +
            '<td><div class="research-summary">' + escHtml(ir.research_summary || "—") + '</div></td>' +
            '<td><span class="impl-badge ' + implBadgeClass(ir.implementation_result) + '">' + escHtml(ir.implementation_result) + '</span></td>' +
            '<td><span class="' + urlLiveClass(ir.is_url_live) + '">' + urlLiveLabel(ir.is_url_live) + '</span></td>' +
            '<td><div class="item-notes">' + escHtml(ir.notes || "") + '</div></td>' +
          '</tr>';
        }).join("") +
        '</tbody></table>';
    }

    var dateStr = v.verified_at ? new Date(v.verified_at).toLocaleDateString() : "";

    return '<div class="verif-card status-' + v.overall_score + (isOpen ? ' open' : '') + '" data-file="' + escAttr(v.filename) + '">' +
      '<div class="verif-card-header" onclick="toggleVerifCard(this)">' +
        '<img class="verif-card-thumb" src="' + escAttr(thumbPath) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">' +
        '<div class="verif-card-info">' +
          '<div class="username">@' + escHtml(v.username || "unknown") + '</div>' +
          '<div class="category-line">' +
            '<span class="cat-badge-inline" style="background:' + catBg(v.category) + ';color:' + catColor(v.category) + '">' + escHtml(v.category) + '</span>' +
            (dateStr ? ' &middot; ' + dateStr : '') +
          '</div>' +
          '<div class="verif-badges">' +
            '<span class="verif-badge ' + v.overall_score + '">' + verifStatusLabel(v.overall_score) + '</span>' +
            '<span class="confidence-badge">' + v.confidence + '/10 confidence</span>' +
          '</div>' +
        '</div>' +
        '<div class="verif-card-toggle">&#9660;</div>' +
      '</div>' +
      '<div class="verif-card-summary">' + escHtml(v.summary) + '</div>' +
      '<div class="verif-card-detail">' +
        '<div class="kb-section">' +
          '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Item Verification Results</div>' +
          '<div class="kb-section-body">' + (itemsTableHtml || '<div style="color:#555;font-style:italic">No item results</div>') + '</div>' +
        '</div>' +
        ((v.actionable_items && v.actionable_items.length > 0) ?
          ('<div class="kb-section">' +
            '<div class="kb-section-title" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(&quot;collapsed&quot;)">Actionable Items (' + v.actionable_items.length + ')</div>' +
            '<div class="kb-section-body">' +
            v.actionable_items.map(function(a) {
              var html = '<div class="actionable-item">' +
                '<div class="ai-name">' + escHtml(a.item_name) + (a.item_type ? ' <span class="ai-type">' + escHtml(a.item_type) + '</span>' : '') + '</div>';
              if (a.description) html += '<div class="ai-desc">' + escHtml(a.description) + '</div>';
              if (a.url) html += '<div class="ai-url"><a href="' + escAttr(a.url) + '" target="_blank" rel="noopener">' + escHtml(a.url) + '</a></div>';
              if (a.install_command) html += '<div class="ai-label">Install:</div><pre class="ai-cmd">' + escHtml(a.install_command) + '</pre>';
              if (a.code) html += '<div class="ai-label">Code:</div><pre class="ai-code">' + escHtml(a.code) + '</pre>';
              if (a.verification_steps) html += '<div class="ai-label">Verification:</div><div class="ai-verify">' + escHtml(a.verification_steps).replace(/\\n/g, "<br>") + '</div>';
              return html + '</div>';
            }).join("") +
            '</div>' +
          '</div>') : '') +
      '</div>' +
    '</div>';
  }).join("");
}

function toggleVerifCard(header) {
  // Don't toggle if the user is selecting text -- they want to copy
  if (window.getSelection && window.getSelection().toString().length > 0) return;
  var card = header.parentElement;
  var file = card.dataset.file;
  if (verifOpenCards.has(file)) {
    verifOpenCards.delete(file);
    card.classList.remove("open");
  } else {
    verifOpenCards.add(file);
    card.classList.add("open");
  }
}

document.getElementById("verifSearchBox").addEventListener("input", renderVerif);
document.getElementById("verifSortSelect").addEventListener("change", renderVerif);
renderVerif();

// Hoist onclick-referenced functions to global scope
window.switchTab = switchTab;
window.switchKbSection = switchKbSection;
window.toggleKbEntry = toggleKbEntry;
window.toggleVerifCard = toggleVerifCard;
window.setVerifFilter = setVerifFilter;
})(); // end async IIFE
</script>
</body>
</html>`;
}
