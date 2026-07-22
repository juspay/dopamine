// Data contracts — single source of truth shared between the data builder
// (src/dashboard/data-builder.ts emits these shapes) and the app.

// Surfacing bucket — mirrors src/dashboard/quality.ts. `thin` learnings are
// the unprocessed/empty tail (demoted, hidden by default); `featured` maps to a
// project or is verified + highly useful.
export type Tier = "featured" | "standard" | "thin";

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
}
export type Briefs = Record<string, { actions: BriefAction[] }>;

export interface IndexFile {
  meta: Meta;
  videos: IndexRecord[];
}
