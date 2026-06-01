/**
 * Data builder — Tasks 1.1-1.4
 *
 * Reads all video data files and emits static JSON to dashboard/data/:
 *   dashboard/data/index.json      — {meta, videos: IndexRecord[]}
 *   dashboard/data/video/<id>.json — VideoDetail (one per video)
 *   dashboard/data/facets.json     — Facets
 *   dashboard/data/tools.json      — ToolRecord[]
 *   dashboard/data/meta.json       — Meta
 *
 * Output types mirror web/src/lib/types.ts EXACTLY.
 * Cannot import from web/ since tsconfig rootDir=src.
 * If types change, update both files.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../pipeline/config.js";
import { loadState } from "../pipeline/state.js";
import { catColor, catBg } from "./colors.js";
import { computeRelated } from "./related.js";
import type { RelInput } from "./related.js";
import type { CatalogRecord } from "../agents/catalog.js";
import type { MetadataEntry, VideoProperties } from "../types/index.js";

// ---------------------------------------------------------------------------
// Output types (mirrors web/src/lib/types.ts — update both files together)
// ---------------------------------------------------------------------------

interface IndexRecord {
  id: string;
  title: string;
  username: string;
  fullName: string;
  category: string;
  subcategory: string;
  tags: string[];
  thumb: string;
  date: string;
  likes: number;
  durationSec: number;
  verification: string;
  confidence: number;
  implementability: number;
  usefulness: string;
  hasVideo: boolean;
}

interface ActionableItem {
  name: string;
  type: string;
  description: string;
  url: string;
  installCommand: string;
  code: string;
  urlStatus: string;
  verification: string;
}

interface LinkItem {
  name?: string;
  url: string;
  type?: string;
  description?: string;
  timestamp?: string;
}

interface ItemResult {
  itemName: string;
  researchSummary: string;
  implementationResult: string;
  isUrlLive: string;
  notes: string;
}

interface VideoDetail extends IndexRecord {
  code: string;
  pk: string | null;
  caption: string;
  hashtags: string[];
  transcript: string;
  visualDescription: string;
  keyTakeaways: string[];
  topics: string[];
  links: LinkItem[];
  actionableItems: ActionableItem[];
  verificationSummary: string;
  itemResults: ItemResult[];
  relatedIds: string[];
  videoPath: string | null;
  resolution: string;
  fileSizeMb: number;
}

interface CategoryFacet {
  name: string;
  count: number;
  color: string;
  bg: string;
}

interface Facets {
  categories: CategoryFacet[];
  creators: { name: string; fullName: string; count: number }[];
  tags: { name: string; count: number }[];
  topics: { name: string; count: number }[];
}

interface ToolRecord {
  name: string;
  type: string;
  url: string;
  urlStatus: string;
  videoId: string;
  videoTitle: string;
  username: string;
  category: string;
  verification: string;
  description: string;
}

interface Meta {
  generatedAt: string;
  totalVideos: number;
  totalCategories: number;
  totalDurationSec: number;
}

interface IndexFile {
  meta: Meta;
  videos: IndexRecord[];
}

// ---------------------------------------------------------------------------
// Raw data shapes (from video pipeline files)
// ---------------------------------------------------------------------------

interface ClassificationEntry {
  pk?: string | null;
  code?: string | null;
  username?: string | null;
  category?: string;
  subcategory?: string;
  tags?: string[];
  description?: string;
  language?: string;
  mood?: string;
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

interface AnalysisItemRaw {
  type?: string;
  name?: string;
  item_name?: string;
  description?: string;
  install_command?: string;
  code?: string;
  url?: string;
  verification_steps?: string[] | string;
}

interface AnalysisEntry {
  filename?: string;
  category?: string;
  actionable_items?: AnalysisItemRaw[];
  implementability_score?: number;
  usefulness_prediction?: string;
  error?: string;
}

interface ResearchItemRaw {
  item_name?: string;
  item_type?: string;
  url_status?: string;
  url_checked?: string;
  web_research?: string;
  claim_verification?: string;
  github_info?: string;
  alternatives?: string;
  last_checked?: string;
}

interface ResearchEntry {
  filename?: string;
  items?: ResearchItemRaw[];
  researched_at?: string;
}

interface VerificationItemResultRaw {
  item_name?: string;
  research_summary?: string;
  implementation_result?: string;
  is_url_live?: string;
  notes?: string;
}

interface VerificationEntry {
  filename?: string;
  verified_at?: string;
  overall_score?: string;
  summary?: string;
  item_results?: VerificationItemResultRaw[];
  confidence?: number;
  error?: string;
}

interface LinksV2Entry {
  links?: Array<{
    name?: string;
    url?: string;
    type?: string;
    description?: string;
    timestamp?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTranscript(raw: KnowledgeEntry["transcript"]): string {
  if (!raw) return "";
  const out = Array.isArray(raw) ? raw.map(String).join("\n") : String(raw);
  // Legacy corruption guard: some early extractions String()-ified an array of
  // objects into "[object Object]" lines and persisted that. Treat as empty.
  return out.includes("[object Object]") ? "" : out;
}

function normalizeVisualDescription(
  raw: KnowledgeEntry["visual_description"]
): string {
  if (!raw) return "";
  let out: string;
  if (Array.isArray(raw)) {
    out = raw
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const ts = item.timestamp ?? "";
          const desc = item.description ?? "";
          return ts ? `[${ts}] ${desc}` : desc;
        }
        return String(item);
      })
      .join("\n");
  } else {
    out = String(raw);
  }
  // Same "[object Object]" corruption guard as transcript.
  return out.includes("[object Object]") ? "" : out;
}

/**
 * Normalize a tool / actionable-item URL for display:
 *  - keep valid http(s) URLs as-is
 *  - upgrade bare domains ("notion.so", "calendly.com/x") to https://
 *  - drop free-text / non-URL strings ("N/A: macOS…", search instructions)
 */
function normalizeToolUrl(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.includes(" ") && /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/\S*)?$/i.test(s)) {
    return `https://${s}`;
  }
  return "";
}

/** Sanitize a filename stem for use as an id in URLs and filenames. */
function makeId(filename: string): string {
  const stem = filename.endsWith(".mp4") ? filename.slice(0, -4) : filename;
  return stem.replace(/[^A-Za-z0-9._-]/g, "_");
}

/**
 * Match a verification item_name to an analysis item.
 * Verif item_name is often "Analysis Name (type)" so we strip backticks
 * and check substring matches.
 */
function matchVerifItemToAnalysis(
  verifItemName: string,
  analysisItems: AnalysisItemRaw[]
): AnalysisItemRaw | undefined {
  const vn = verifItemName.toLowerCase();
  return analysisItems.find((ai) => {
    const an = String(ai.name ?? ai.item_name ?? "").toLowerCase();
    const anClean = an.replace(/`/g, "");
    return (
      vn.startsWith(an) ||
      vn.startsWith(anClean) ||
      vn.includes(an) ||
      (anClean.length > 0 && vn.includes(anClean))
    );
  });
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function buildDashboardData(): Promise<void> {
  console.log("\n=== Data Builder ===");

  const knowledge = await loadState<Record<string, KnowledgeEntry>>(
    CONFIG.STATE.KNOWLEDGE_BASE,
    {}
  );
  const catalog = await loadState<CatalogRecord[]>(CONFIG.STATE.CATALOG, []);
  const classifications = await loadState<Record<string, ClassificationEntry>>(
    CONFIG.STATE.CLASSIFICATIONS,
    {}
  );
  const metadata = await loadState<MetadataEntry[]>(CONFIG.STATE.METADATA, []);
  const analysis = await loadState<Record<string, AnalysisEntry>>(
    CONFIG.STATE.ANALYSIS,
    {}
  );
  const research = await loadState<Record<string, ResearchEntry>>(
    CONFIG.STATE.RESEARCH,
    {}
  );
  const verifications = await loadState<Record<string, VerificationEntry>>(
    CONFIG.STATE.VERIFICATIONS,
    {}
  );
  const linksV2 = await loadState<Record<string, LinksV2Entry>>(
    CONFIG.STATE.LINKS_V2,
    {}
  );
  const videoProperties = await loadState<Record<string, VideoProperties>>(
    CONFIG.STATE.PROPERTIES,
    {}
  );

  console.log(`Catalog: ${catalog.length}, KB: ${Object.keys(knowledge).length}`);
  console.log(
    `Analysis: ${Object.keys(analysis).length}, Verif: ${Object.keys(verifications).length}`
  );
  console.log(
    `Research: ${Object.keys(research).length}, Links: ${Object.keys(linksV2).length}`
  );

  // O(1) lookup maps
  const catalogByFilename = new Map(catalog.map((c) => [c.filename, c]));
  const metadataByPk = new Map(metadata.map((m) => [m.pk, m]));

  // Union of all known filenames
  const allFilenames = new Set<string>([
    ...catalog.map((c) => c.filename),
    ...Object.keys(classifications),
    ...Object.keys(knowledge),
  ]);
  console.log(`Total unique filenames: ${allFilenames.size}`);

  const videosDirBasename = path.basename(CONFIG.VIDEOS_DIR);

  // Build normalized video records
  type NormalizedVideo = VideoDetail & { _filename: string };
  const normalized: NormalizedVideo[] = [];

  for (const filename of allFilenames) {
    const catEntry = catalogByFilename.get(filename);
    const classEntry = classifications[filename];
    const kbEntry = knowledge[filename];
    const anEntry = analysis[filename];
    const verifEntry = verifications[filename];
    const resEntry = research[filename];
    const linksEntry = linksV2[filename];
    const props = videoProperties[filename];

    const id = makeId(filename);

    // pk: from classifications or parse filename pattern {username}_{pk}.mp4
    const pkFromClassification = classEntry?.pk ?? null;
    const pkFromFilename = ((): string | null => {
      const match = filename.match(/^.+_(\d+)\.mp4$/);
      return match ? match[1] : null;
    })();
    const pk = pkFromClassification ?? pkFromFilename;

    const code = classEntry?.code ?? null;
    const username =
      classEntry?.username ??
      kbEntry?.username ??
      catEntry?.instagram_user ??
      "";

    // Enrich with metadata full_name
    const metaEntry = pk ? metadataByPk.get(pk) : undefined;
    const fullName = metaEntry?.full_name ?? "";

    // Title = catalog.description || first key_takeaway || classification.description || "(untitled)"
    const title =
      catEntry?.description ||
      kbEntry?.key_takeaways?.[0] ||
      classEntry?.description ||
      "(untitled)";

    const category =
      classEntry?.category ??
      kbEntry?.category ??
      catEntry?.category ??
      "Other";
    const subcategory =
      classEntry?.subcategory ??
      kbEntry?.subcategory ??
      catEntry?.subcategory ??
      "";

    const tags: string[] = classEntry?.tags ?? catEntry?.tags ?? [];
    const date = catEntry?.taken_at ?? "";
    const likes = catEntry?.like_count ?? 0;
    const durationSec = catEntry?.duration_seconds ?? 0;

    // Thumbnail: use original filename stem (before any id sanitization)
    const stem = filename.endsWith(".mp4") ? filename.slice(0, -4) : filename;
    const thumb = `/videos/thumbnails/${stem}.jpg`;

    // Check if video file exists
    const videoFilePath = path.join(CONFIG.VIDEOS_DIR, filename);
    let hasVideo = false;
    let videoPath: string | null = null;
    try {
      await fs.access(videoFilePath);
      hasVideo = true;
      videoPath = `/videos/${videosDirBasename}/${encodeURIComponent(filename)}`;
    } catch {
      // file absent
    }

    // No verification record: distinguish "analysed but had no actionable items
    // to verify" (definitive → not_verifiable) from "never analysed" (→ unknown).
    const analysedNoItems =
      !!anEntry && (anEntry.actionable_items?.length ?? 0) === 0;
    const verification =
      verifEntry?.overall_score ?? (analysedNoItems ? "not_verifiable" : "unknown");
    const confidence = Math.round(verifEntry?.confidence ?? 0);
    const verificationSummary = verifEntry?.summary ?? "";
    const implementability = anEntry?.implementability_score ?? 0;
    const usefulness = anEntry?.usefulness_prediction ?? "unknown";

    const transcript = normalizeTranscript(kbEntry?.transcript);
    const visualDescription = normalizeVisualDescription(
      kbEntry?.visual_description
    );
    const keyTakeaways = kbEntry?.key_takeaways ?? [];
    const topics = kbEntry?.topics ?? [];

    const links: LinkItem[] = (linksEntry?.links ?? []).map((l) => ({
      name: l.name,
      url: l.url ?? "",
      type: l.type,
      description: l.description,
      timestamp: l.timestamp,
    }));

    // Merge analysis actionable items with research url_status + verif item_results
    const researchByItemName = new Map<string, ResearchItemRaw>();
    for (const ri of resEntry?.items ?? []) {
      if (ri.item_name) researchByItemName.set(ri.item_name, ri);
    }

    const verifItemResults = verifEntry?.item_results ?? [];
    const verifByItemName = new Map<string, VerificationItemResultRaw>();
    for (const vir of verifItemResults) {
      if (vir.item_name) verifByItemName.set(vir.item_name, vir);
    }

    const actionableItems: ActionableItem[] = [];
    for (const rawItem of anEntry?.actionable_items ?? []) {
      const name = String(rawItem.name ?? rawItem.item_name ?? "").trim();
      if (!name) continue;

      const researchMatch = researchByItemName.get(name);
      const urlStatus = researchMatch?.url_status ?? "";

      // Find matching verif item result using fuzzy name matching
      let verifItemMatch: VerificationItemResultRaw | undefined;
      for (const [vn, vir] of verifByItemName) {
        if (matchVerifItemToAnalysis(vn, [rawItem])) {
          verifItemMatch = vir;
          break;
        }
      }

      actionableItems.push({
        name,
        type: String(rawItem.type ?? ""),
        description: String(rawItem.description ?? ""),
        url: normalizeToolUrl(rawItem.url),
        installCommand: String(rawItem.install_command ?? ""),
        code: String(rawItem.code ?? ""),
        urlStatus,
        verification: verifItemMatch?.is_url_live ?? "",
      });
    }

    const itemResults: ItemResult[] = verifItemResults.map((vir) => ({
      itemName: vir.item_name ?? "",
      researchSummary: vir.research_summary ?? "",
      implementationResult: vir.implementation_result ?? "",
      isUrlLive: vir.is_url_live ?? "",
      notes: vir.notes ?? "",
    }));

    const caption = catEntry?.caption ?? "";
    const hashtags = catEntry?.hashtags ?? [];

    let resolution = catEntry?.resolution ?? "";
    if (!resolution && props) {
      resolution = `${props.width}x${props.height}`;
    }
    const fileSizeMb =
      catEntry?.file_size_mb ?? (props ? props.file_size / (1024 * 1024) : 0);

    normalized.push({
      _filename: filename,
      id,
      title,
      username,
      fullName,
      category,
      subcategory,
      tags,
      thumb,
      date,
      likes,
      durationSec,
      verification,
      confidence,
      implementability,
      usefulness,
      hasVideo,
      code: code ?? "",
      pk,
      caption,
      hashtags,
      transcript,
      visualDescription,
      keyTakeaways,
      topics,
      links,
      actionableItems,
      verificationSummary,
      itemResults,
      relatedIds: [],
      videoPath,
      resolution,
      fileSizeMb,
    });
  }

  // Sort by date descending (newest first)
  normalized.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Compute related IDs
  const relInputs: RelInput[] = normalized.map((v) => ({
    id: v.id,
    tags: v.tags,
    topics: v.topics,
    category: v.category,
    username: v.username,
    toolUrls: v.actionableItems
      .map((ai) => ai.url)
      .filter((u) => u.length > 0),
    date: v.date,
  }));
  const relatedMap = computeRelated(relInputs);
  for (const v of normalized) {
    v.relatedIds = relatedMap.get(v.id) ?? [];
  }

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------

  const dataDir = path.resolve("dashboard", "data");
  const videoDataDir = path.join(dataDir, "video");
  await fs.mkdir(videoDataDir, { recursive: true });

  // Meta
  const totalDurationSec = normalized.reduce(
    (s, v) => s + (v.durationSec ?? 0),
    0
  );
  const categories = new Set(normalized.map((v) => v.category));
  const meta: Meta = {
    generatedAt: new Date().toISOString(),
    totalVideos: normalized.length,
    totalCategories: categories.size,
    totalDurationSec,
  };

  // Index
  const indexRecords: IndexRecord[] = normalized.map((v) => ({
    id: v.id,
    title: v.title,
    username: v.username,
    fullName: v.fullName,
    category: v.category,
    subcategory: v.subcategory,
    tags: v.tags,
    thumb: v.thumb,
    date: v.date,
    likes: v.likes,
    durationSec: v.durationSec,
    verification: v.verification,
    confidence: v.confidence,
    implementability: v.implementability,
    usefulness: v.usefulness,
    hasVideo: v.hasVideo,
  }));

  const indexFile: IndexFile = { meta, videos: indexRecords };
  await fs.writeFile(
    path.join(dataDir, "index.json"),
    JSON.stringify(indexFile),
    "utf8"
  );

  // Per-video detail files (ensure unique IDs)
  const usedIds = new Map<string, number>();
  for (const v of normalized) {
    let safeId = v.id;
    const count = usedIds.get(safeId) ?? 0;
    if (count > 0) safeId = `${safeId}_${count}`;
    usedIds.set(v.id, count + 1);

    const detail: VideoDetail = {
      id: safeId,
      title: v.title,
      username: v.username,
      fullName: v.fullName,
      category: v.category,
      subcategory: v.subcategory,
      tags: v.tags,
      thumb: v.thumb,
      date: v.date,
      likes: v.likes,
      durationSec: v.durationSec,
      verification: v.verification,
      confidence: v.confidence,
      implementability: v.implementability,
      usefulness: v.usefulness,
      hasVideo: v.hasVideo,
      code: v.code,
      pk: v.pk,
      caption: v.caption,
      hashtags: v.hashtags,
      transcript: v.transcript,
      visualDescription: v.visualDescription,
      keyTakeaways: v.keyTakeaways,
      topics: v.topics,
      links: v.links,
      actionableItems: v.actionableItems,
      verificationSummary: v.verificationSummary,
      itemResults: v.itemResults,
      relatedIds: v.relatedIds,
      videoPath: v.videoPath,
      resolution: v.resolution,
      fileSizeMb: v.fileSizeMb,
    };

    await fs.writeFile(
      path.join(videoDataDir, `${safeId}.json`),
      JSON.stringify(detail),
      "utf8"
    );
  }

  // Facets
  const catCountMap = new Map<string, number>();
  for (const v of normalized) {
    catCountMap.set(v.category, (catCountMap.get(v.category) ?? 0) + 1);
  }
  const facetCategories: CategoryFacet[] = [...catCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      color: catColor(name),
      bg: catBg(name),
    }));

  const creatorMap = new Map<string, { fullName: string; count: number }>();
  for (const v of normalized) {
    if (!v.username) continue;
    const existing = creatorMap.get(v.username);
    if (existing) {
      existing.count += 1;
      if (!existing.fullName && v.fullName) existing.fullName = v.fullName;
    } else {
      creatorMap.set(v.username, { fullName: v.fullName, count: 1 });
    }
  }
  const facetCreators = [...creatorMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, { fullName, count }]) => ({ name, fullName, count }));

  const tagCountMap = new Map<string, number>();
  for (const v of normalized) {
    for (const tag of v.tags) {
      if (tag) tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1);
    }
  }
  const facetTags = [...tagCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const topicCountMap = new Map<string, number>();
  for (const v of normalized) {
    for (const topic of v.topics) {
      if (topic) topicCountMap.set(topic, (topicCountMap.get(topic) ?? 0) + 1);
    }
  }
  const facetTopics = [...topicCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const facets: Facets = {
    categories: facetCategories,
    creators: facetCreators,
    tags: facetTags,
    topics: facetTopics,
  };
  await fs.writeFile(
    path.join(dataDir, "facets.json"),
    JSON.stringify(facets),
    "utf8"
  );

  // Tools: flatten actionableItems with non-empty url from verified videos
  const goodVerifications = new Set(["verified_useful", "partially_verified"]);
  const urlStatusPriority: Record<string, number> = {
    live: 0,
    redirect: 1,
    error: 2,
    timeout: 3,
    dead: 4,
    no_url: 5,
    "": 6,
  };

  const toolMap = new Map<string, ToolRecord>();
  for (const v of normalized) {
    if (!goodVerifications.has(v.verification)) continue;
    for (const ai of v.actionableItems) {
      if (!ai.url) continue;
      const key = `${ai.name}|||${ai.url}`;
      const existing = toolMap.get(key);
      const existingPriority =
        urlStatusPriority[existing?.urlStatus ?? ""] ?? 99;
      const newPriority = urlStatusPriority[ai.urlStatus] ?? 99;
      if (!existing || newPriority < existingPriority) {
        toolMap.set(key, {
          name: ai.name,
          type: ai.type,
          url: ai.url,
          urlStatus: ai.urlStatus,
          videoId: v.id,
          videoTitle: v.title,
          username: v.username,
          category: v.category,
          verification: v.verification,
          description: ai.description,
        });
      }
    }
  }
  const tools: ToolRecord[] = [...toolMap.values()];
  await fs.writeFile(
    path.join(dataDir, "tools.json"),
    JSON.stringify(tools),
    "utf8"
  );

  // Meta (standalone)
  await fs.writeFile(
    path.join(dataDir, "meta.json"),
    JSON.stringify(meta),
    "utf8"
  );

  // Report
  const detailFiles = await fs.readdir(videoDataDir);
  console.log(`\n--- Build complete ---`);
  console.log(`index.json: ${normalized.length} videos`);
  console.log(`video/*.json: ${detailFiles.length} files`);
  console.log(`facets.categories: ${facets.categories.length}`);
  console.log(`tools.json: ${tools.length} entries`);
  console.log(`meta.totalCategories: ${meta.totalCategories}`);
  console.log(`meta.totalDurationSec: ${Math.round(meta.totalDurationSec)}`);
  console.log(`Output: ${dataDir}`);
}

// ---------------------------------------------------------------------------
// CLI entry — invoke when run directly via `node dist/dashboard/data-builder.js`
// ---------------------------------------------------------------------------
const isMain =
  process.argv[1] !== undefined &&
  (await import("node:url")).fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  buildDashboardData().catch((err) => {
    console.error("Data builder failed:", err);
    process.exit(1);
  });
}
