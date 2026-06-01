/**
 * MarkdownAgent — port of generate_markdown.py
 *
 * Reads knowledge_base.json, classifications.json, metadata.json, video_properties.json.
 * Generates knowledge_base/{Category}/{filename}.md per video and knowledge_base/INDEX.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";
import type { MetadataEntry, VideoProperties } from "../types/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassificationEntry {
  category?: string;
  subcategory?: string;
  tags?: string[];
  description?: string;
  username?: string;
}

interface VisualItem {
  timestamp?: string;
  description?: string;
}

interface LinkEntry {
  url?: string;
  description?: string;
  timestamp?: string;
}

interface KnowledgeEntry {
  category?: string;
  subcategory?: string;
  username?: string;
  classification_tags?: string[];
  pk?: string | number;
  transcript?: string | string[];
  visual_description?: string | VisualItem[];
  links_and_resources?: LinkEntry[];
  key_takeaways?: string[];
  topics?: string[];
}

interface IndexEntry {
  category: string;
  title: string;
  username: string;
  duration: string;
  likes: string;
  md_filename: string;
}

// ---------------------------------------------------------------------------
// Helpers (mirrors Python functions exactly)
// ---------------------------------------------------------------------------

/** Convert a category name to a safe directory name. */
function sanitizeDirname(name: string): string {
  name = name.replace(/[^\w\s\-&]/g, "");
  name = name.trim().replace(/\s+/g, "_");
  return name;
}

/** Format duration in seconds to mm:ss or hh:mm:ss. */
function formatDuration(seconds: number | undefined | null): string {
  if (seconds == null) return "N/A";
  const s = Math.floor(seconds);
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Format transcript which can be a string or list. */
function formatTranscript(transcript: string | string[] | undefined | null): string {
  if (transcript == null) return "_No transcript available._";
  if (Array.isArray(transcript)) {
    const filtered = transcript.filter(Boolean);
    return filtered.length > 0
      ? filtered.map((line) => `> ${line}`).join("\n")
      : "_No transcript available._";
  }
  if (typeof transcript === "string") {
    return transcript.trim() ? transcript : "_No transcript available._";
  }
  return String(transcript);
}

/** Format visual description which can be a string or list of dicts. */
function formatVisualDescription(
  visual: string | VisualItem[] | undefined | null
): string {
  if (visual == null) return "_No visual description available._";
  if (typeof visual === "string") {
    return visual.trim() ? visual : "_No visual description available._";
  }
  if (Array.isArray(visual)) {
    const parts: string[] = [];
    for (const item of visual) {
      if (typeof item === "object" && item !== null) {
        const ts = item.timestamp ?? "";
        const desc = item.description ?? "";
        parts.push(`**[${ts}]** ${desc}`);
      } else {
        parts.push(String(item));
      }
    }
    return parts.length > 0
      ? parts.join("\n\n")
      : "_No visual description available._";
  }
  return String(visual);
}

// ---------------------------------------------------------------------------
// Metadata index builder
// ---------------------------------------------------------------------------

interface MetadataIndex {
  byPk: Map<string, MetadataEntry>;
  byUsernamePk: Map<string, MetadataEntry>;
}

function buildMetadataIndex(metadataList: MetadataEntry[]): MetadataIndex {
  const byPk = new Map<string, MetadataEntry>();
  const byUsernamePk = new Map<string, MetadataEntry>();
  for (const entry of metadataList) {
    const pk = String(entry.pk ?? "");
    const username = entry.username ?? "";
    if (pk) byPk.set(pk, entry);
    if (username && pk) {
      byUsernamePk.set(`${username}_${pk}.mp4`, entry);
    }
  }
  return { byPk, byUsernamePk };
}

function findMetadata(
  filename: string,
  kbEntry: KnowledgeEntry,
  index: MetadataIndex
): MetadataEntry | undefined {
  // Direct filename match
  if (index.byUsernamePk.has(filename)) return index.byUsernamePk.get(filename);
  // Try by pk from kb_entry
  const pk = kbEntry.pk;
  if (pk != null && index.byPk.has(String(pk))) return index.byPk.get(String(pk));
  // Try extracting pk from filename (pattern: username_pk.mp4)
  const match = filename.match(/_(\d{10,})\.mp4$/);
  if (match) {
    const pkStr = match[1];
    if (index.byPk.has(pkStr)) return index.byPk.get(pkStr);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Markdown generation for a single video
// ---------------------------------------------------------------------------

function generateMarkdown(
  filename: string,
  kbEntry: KnowledgeEntry,
  classification: ClassificationEntry | undefined,
  metadata: MetadataEntry | undefined,
  videoProps: VideoProperties | undefined
): { content: string; category: string } {
  // Gather data from all sources
  const category =
    kbEntry.category ??
    classification?.category ??
    "Uncategorized";
  const subcategory = kbEntry.subcategory ?? classification?.subcategory ?? "";

  // Username and full name
  const username =
    kbEntry.username ??
    classification?.username ??
    metadata?.username ??
    "unknown";
  const fullName = metadata?.full_name ?? "";

  // Description / title
  const description = classification?.description ?? "";
  const caption = metadata?.caption_text ?? "";
  let title = description || caption || `Video by @${username}`;
  if (title.length > 120) title = title.slice(0, 117) + "...";

  // Date
  let takenAt: string = metadata?.taken_at ?? "N/A";
  if (takenAt && takenAt !== "N/A") {
    try {
      const dt = new Date(takenAt);
      if (!isNaN(dt.getTime())) {
        takenAt = dt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    } catch {
      // keep original
    }
  }

  // Duration
  const duration = formatDuration(videoProps?.duration);

  // Likes
  let likesStr: string;
  const likeCount = metadata?.like_count;
  if (typeof likeCount === "number") {
    likesStr = likeCount.toLocaleString("en-US");
  } else {
    likesStr = "N/A";
  }

  // Tags
  const tags = classification?.tags ?? kbEntry.classification_tags ?? [];
  const tagsStr = tags.length > 0 ? tags.join(", ") : "N/A";

  // Source line
  let source = `@${username}`;
  if (fullName) source += ` (${fullName})`;

  // Build markdown
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Source:** ${source}  `);
  lines.push(`**Date:** ${takenAt}  `);
  lines.push(`**Duration:** ${duration}  `);
  lines.push(
    `**Category:** ${category}` + (subcategory ? ` > ${subcategory}` : "")
  );
  lines.push(`  `);
  lines.push(`**Likes:** ${likesStr}  `);
  lines.push(`**Tags:** ${tagsStr}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Transcript
  lines.push("## Transcript");
  lines.push("");
  lines.push(formatTranscript(kbEntry.transcript));
  lines.push("");

  // Visual description
  lines.push("## What's Shown on Screen");
  lines.push("");
  lines.push(formatVisualDescription(kbEntry.visual_description));
  lines.push("");

  // Links & Resources
  const links = kbEntry.links_and_resources ?? [];
  lines.push("## Links & Resources");
  lines.push("");
  if (links.length > 0) {
    lines.push("| Resource | Description | Timestamp |");
    lines.push("|----------|-------------|-----------|");
    // Escape '|' and strip newlines so cells don't break the Markdown table.
    // Coerce to string first: timestamps/urls may arrive as numbers or null.
    const escapeCell = (s: unknown): string =>
      String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    for (const link of links) {
      const url = escapeCell(link.url);
      const desc = escapeCell(link.description);
      const ts = escapeCell(link.timestamp);
      lines.push(`| ${url} | ${desc} | ${ts} |`);
    }
  } else {
    lines.push("_No links or resources mentioned._");
  }
  lines.push("");

  // Key Takeaways
  const takeaways = kbEntry.key_takeaways ?? [];
  lines.push("## Key Takeaways");
  lines.push("");
  if (takeaways.length > 0) {
    for (const t of takeaways) {
      lines.push(`- ${t}`);
    }
  } else {
    lines.push("_No key takeaways extracted._");
  }
  lines.push("");

  // Topics
  const topics = kbEntry.topics ?? [];
  lines.push("## Topics");
  lines.push("");
  if (topics.length > 0) {
    lines.push(topics.map((t) => `\`${t}\``).join(" "));
  } else {
    lines.push("_No topics identified._");
  }
  lines.push("");

  return { content: lines.join("\n"), category };
}

// ---------------------------------------------------------------------------
// INDEX.md generation
// ---------------------------------------------------------------------------

function generateIndex(allEntries: IndexEntry[]): string {
  const lines: string[] = [];
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  lines.push("# Knowledge Base Index");
  lines.push("");
  lines.push(
    `_Generated on ${dateStr} | ${allEntries.length} videos total_`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Group by category
  const byCategory = new Map<string, IndexEntry[]>();
  for (const entry of allEntries) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  // Table of contents
  lines.push("## Categories");
  lines.push("");
  const sortedCategories = [...byCategory.keys()].sort();
  for (const cat of sortedCategories) {
    const count = byCategory.get(cat)!.length;
    // Match the GitHub anchor algorithm: lowercase, strip chars that are not
    // word-chars/spaces/hyphens (including literal '/' in e.g. "UI/UX Design"),
    // convert spaces to hyphens, collapse runs of hyphens.
    const anchor = cat
      .toLowerCase()
      .replace(/[^\w\s\-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-{2,}/g, "-");
    lines.push(`- [${cat}](#${anchor}) (${count})`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Each category section
  for (const cat of sortedCategories) {
    const entries = byCategory.get(cat)!;
    lines.push(`## ${cat}`);
    lines.push("");
    lines.push("| # | Title | Author | Duration | Likes |");
    lines.push("|---|-------|--------|----------|-------|");
    const sorted = [...entries].sort((a, b) => a.title.localeCompare(b.title));
    for (const [i, e] of sorted.entries()) {
      const relPath = `${sanitizeDirname(cat)}/${e.md_filename}`;
      let titleShort = e.title.length > 60 ? e.title.slice(0, 60) + "..." : e.title;
      // Escape pipes in title
      titleShort = titleShort.replace(/\|/g, "\\|");
      lines.push(
        `| ${i + 1} | [${titleShort}](${relPath}) | @${e.username} | ${e.duration} | ${e.likes} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runMarkdownAgent(): Promise<void> {
  console.log("\n=== MarkdownAgent ===");
  console.log("Loading data files...");

  // Load knowledge base (single merged file)
  const knowledgeBase = await loadState<Record<string, KnowledgeEntry>>(
    CONFIG.STATE.KNOWLEDGE_BASE, {}
  );
  console.log(`  knowledge_base.json: ${Object.keys(knowledgeBase).length} entries`);

  const classifications = await loadState<Record<string, ClassificationEntry>>(
    CONFIG.STATE.CLASSIFICATIONS,
    {}
  );
  console.log(`  classifications.json: ${Object.keys(classifications).length} entries`);

  const metadataList = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
  console.log(`  metadata.json: ${metadataList.length} entries`);

  const videoProps = await loadState<Record<string, VideoProperties>>(
    CONFIG.STATE.PROPERTIES,
    {}
  );
  console.log(`  video_properties.json: ${Object.keys(videoProps).length} entries`);

  // Build metadata index
  const metaIndex = buildMetadataIndex(metadataList);
  console.log(
    `Metadata indexed: ${metaIndex.byPk.size} by pk, ${metaIndex.byUsernamePk.size} by filename`
  );

  // Process each video
  const outputDir = CONFIG.OUTPUT.KNOWLEDGE_BASE;
  await fs.mkdir(outputDir, { recursive: true });

  const indexEntries: IndexEntry[] = [];
  let generated = 0;

  for (const [filename, kbEntry] of Object.entries(knowledgeBase)) {
    const classification = classifications[filename];
    const meta = findMetadata(filename, kbEntry, metaIndex);
    const props = videoProps[filename];

    // Generate markdown
    const { content: mdContent, category } = generateMarkdown(
      filename,
      kbEntry,
      classification,
      meta,
      props
    );

    // Create category directory
    const catDir = path.join(outputDir, sanitizeDirname(category));
    await fs.mkdir(catDir, { recursive: true });

    // Determine markdown filename — use video filename stem for uniqueness.
    // Use a regex anchored to the end to avoid removing a '.mp4' that appears
    // inside a username (e.g. 'the.mp4.user_12345.mp4').
    const stem = filename.replace(/\.mp4$/, "");
    const mdFilename = `${stem}.md`;

    // Write file
    const filepath = path.join(catDir, mdFilename);
    await fs.writeFile(filepath, mdContent, "utf8");
    generated++;

    // Collect for index
    const username =
      kbEntry.username ??
      classification?.username ??
      meta?.username ??
      "unknown";

    const description = classification?.description ?? "";
    const caption = meta?.caption_text ?? "";
    let title = description || caption || `Video by @${username}`;
    if (title.length > 120) title = title.slice(0, 117) + "...";

    const durationRaw = props?.duration;
    let likesStr: string;
    const likeCount = meta?.like_count;
    if (typeof likeCount === "number") {
      likesStr = likeCount.toLocaleString("en-US");
    } else {
      likesStr = "N/A";
    }

    indexEntries.push({
      category,
      title,
      username,
      duration: formatDuration(durationRaw),
      likes: likesStr,
      md_filename: mdFilename,
    });

    if (generated % 10 === 0) {
      console.log(`  Generated ${generated} files...`);
    }
  }

  console.log(`\nGenerated ${generated} markdown files`);

  // Generate INDEX.md
  const indexContent = generateIndex(indexEntries);
  const indexPath = path.join(outputDir, "INDEX.md");
  await fs.writeFile(indexPath, indexContent, "utf8");
  console.log(`Generated INDEX.md with ${indexEntries.length} entries`);

  // Summary
  const categories = new Set(indexEntries.map((e) => e.category));
  console.log(`\nCategories (${categories.size}):`);
  for (const cat of [...categories].sort()) {
    const count = indexEntries.filter((e) => e.category === cat).length;
    console.log(`  ${cat}: ${count} videos`);
  }

  console.log(`\nDone! Files written to: ${outputDir}`);
}
