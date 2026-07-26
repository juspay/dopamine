// Data contracts — single source of truth shared between the data builder
// (src/dashboard/data-builder.ts emits these shapes) and the app.

// Surfacing bucket — mirrors src/dashboard/quality.ts. `thin` learnings are
// the unprocessed/empty tail (demoted, hidden by default); `featured` maps to a
// project or is verified + highly useful.
export type Tier = "featured" | "standard" | "thin";

// Actionability triage tier (mirrors src/schemas/triage.ts). Only apply-now /
// evaluate-later feed the apply-loop; reference stays searchable; skip is enjoyment.
// "untriaged" is the data-builder sentinel for a video with no triage verdict yet
// (kept distinct from a real reference-only verdict).
export type ActionabilityTier = "apply-now" | "evaluate-later" | "reference-only" | "skip" | "untriaged";

// Why a thin video is thin (mirrors src/dashboard/data-builder.ts). Null unless tier==='thin'.
export type ThinReason = "classification-failed" | "extraction-empty" | "not-extracted" | "low-signal";

export interface IndexRecord {
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
  appliesTo: string[];
  quality: number;
  tier: Tier;
  actionability: ActionabilityTier;
  thinReason: ThinReason | null;
}

export interface ActionableItem {
  name: string;
  type: string;
  description: string;
  url: string;
  installCommand: string;
  code: string;
  urlStatus: string;
  verification: string;
}

export interface LinkItem {
  name?: string;
  url: string;
  type?: string;
  description?: string;
  timestamp?: string;
}

export interface ItemResult {
  itemName: string;
  researchSummary: string;
  implementationResult: string;
  isUrlLive: string;
  notes: string;
}

export interface VideoDetail extends IndexRecord {
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

export interface CategoryFacet {
  name: string;
  count: number;
  color: string;
  bg: string;
}

export interface Facets {
  categories: CategoryFacet[];
  creators: { name: string; fullName: string; count: number }[];
  tags: { name: string; count: number }[];
  topics: { name: string; count: number }[];
  projects: { name: string; count: number }[];
  actionability: { name: string; count: number }[];
}

export interface ToolRecord {
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

export interface Meta {
  generatedAt: string;
  totalVideos: number;
  totalCategories: number;
  totalDurationSec: number;
}

// Per-project action brief (mirror of src/schemas/brief.ts public shape).
export interface BriefAction {
  title: string;
  detail: string;
  basedOn: string[];
  /** Drawn from a single learning — a hunch, not a corroborated recommendation.
   *  Absent on briefs generated before the flag existed; read via isExploratory. */
  exploratory?: boolean;
}
export type Briefs = Record<string, { actions: BriefAction[]; sourceCount?: number }>;

/** Tolerant of briefs written before `exploratory` was stamped. */
export const isExploratory = (a: BriefAction): boolean => a.exploratory ?? a.basedOn.length < 2;

export interface IndexFile {
  meta: Meta;
  videos: IndexRecord[];
}
