// Generates a small, fully-synthetic demo dataset for the dashboard so the repo
// renders without any real (scraped) content. Run: node scripts/make-demo-data.mjs
// (build first — this imports the compiled quality scorer). Output shapes mirror
// src/dashboard/data-builder.ts (see web/src/lib/types.ts).
import fs from "node:fs/promises";
import path from "node:path";
// Reuse the real quality scorer so the demo's quality/tier are computed exactly
// like production, not hand-faked. Requires `npm run build` first.
import { qualityScore, tierOf } from "../dist/dashboard/quality.js";

// One synthetic project so the demo exercises project mapping (→ chips, facet).
const DEMO_PROJECT = "Notes Assistant";

const OUT = path.resolve("dashboard", "data");
const GENERATED_AT = "2026-06-20T00:00:00.000Z";

// Category palette copied from the real facet builder so chips look right.
const PALETTE = {
  "Tech & Coding": { color: "#d5e8f5", bg: "#1f2d3d" },
  "AI & Machine Learning": { color: "#e8d5f5", bg: "#2d1f3d" },
  "UI/UX Design": { color: "#f5d5e8", bg: "#3d1f2d" },
  "Business & Marketing": { color: "#d5f5e0", bg: "#1f3d2d" },
  Finance: { color: "#d5f5f0", bg: "#1f3d3a" },
  "Entertainment & Comedy": { color: "#f5e8e0", bg: "#3d2e25" },
};

// All content below is invented for demonstration only.
const SPECS = [
  {
    id: "demo_tech_terminal",
    username: "demo_devtips",
    fullName: "Demo Dev Tips",
    category: "Tech & Coding",
    subcategory: "Developer Tooling",
    title: "Three terminal tricks that speed up everyday shell work",
    tags: ["terminal", "productivity", "cli"],
    topics: ["shell", "developer experience"],
    durationSec: 42,
    likes: 1280,
    confidence: 4,
    implementability: 9,
    usefulness: "highly_useful",
    keyTakeaways: [
      "Use fuzzy history search to recall commands",
      "Alias common git flows",
      "Pipe to a pager for long output",
    ],
    tools: [
      {
        name: "fzf",
        type: "tool_install",
        url: "https://github.com/junegunn/fzf",
        description: "Command-line fuzzy finder used for history and file search.",
      },
    ],
  },
  {
    id: "demo_ai_rag",
    username: "demo_ai_lab",
    fullName: "Demo AI Lab",
    category: "AI & Machine Learning",
    subcategory: "LLM Applications",
    title: "A simple retrieval pattern for grounding an LLM in your own notes",
    tags: ["llm", "rag", "embeddings"],
    topics: ["retrieval augmented generation", "vector search"],
    durationSec: 65,
    likes: 3410,
    confidence: 5,
    implementability: 8,
    usefulness: "highly_useful",
    verification: "verified_useful",
    appliesTo: [DEMO_PROJECT],
    keyTakeaways: [
      "Chunk documents before embedding",
      "Store vectors with metadata",
      "Re-rank results before prompting",
    ],
    tools: [
      {
        name: "Example Vector DB",
        type: "tool_install",
        url: "https://example.com/vector-db",
        description: "An illustrative vector database for storing note embeddings.",
      },
    ],
  },
  {
    id: "demo_ux_grids",
    username: "demo_design",
    fullName: "Demo Design Studio",
    category: "UI/UX Design",
    subcategory: "Layout",
    title: "Designing responsive card grids that hold up on mobile",
    tags: ["layout", "responsive", "css-grid"],
    topics: ["responsive design", "component design"],
    durationSec: 51,
    likes: 980,
    confidence: 4,
    implementability: 7,
    usefulness: "useful",
    verification: "partially_verified",
    appliesTo: [DEMO_PROJECT],
    keyTakeaways: [
      "Define breakpoints from content, not devices",
      "Keep tap targets large",
      "Prefer auto-fit over fixed columns",
    ],
    tools: [],
  },
  {
    id: "demo_biz_funnel",
    username: "demo_growth",
    fullName: "Demo Growth Notes",
    category: "Business & Marketing",
    subcategory: "Growth",
    title: "Mapping a content funnel from first touch to signup",
    tags: ["marketing", "funnel", "growth"],
    topics: ["content marketing", "conversion"],
    durationSec: 58,
    likes: 640,
    confidence: 3,
    implementability: 6,
    usefulness: "useful",
    keyTakeaways: ["Match content to funnel stage", "Instrument each step", "Remove friction before adding channels"],
    tools: [],
  },
  {
    id: "demo_fin_index",
    username: "demo_finance",
    fullName: "Demo Finance 101",
    category: "Finance",
    subcategory: "Personal Finance",
    title: "Why low-cost index funds are a sensible default",
    tags: ["investing", "index-funds", "personal-finance"],
    topics: ["investing basics", "diversification"],
    durationSec: 73,
    likes: 2110,
    confidence: 4,
    implementability: 5,
    usefulness: "useful",
    keyTakeaways: ["Fees compound against you", "Diversification lowers single-stock risk", "Automate contributions"],
    tools: [],
  },
  {
    id: "demo_fun_sketch",
    username: "demo_comedy",
    fullName: "Demo Comedy Club",
    category: "Entertainment & Comedy",
    subcategory: "Sketch",
    title: "A short sketch about a meeting that should have been an email",
    tags: ["comedy", "sketch", "workplace"],
    topics: ["humor", "office life"],
    durationSec: 33,
    likes: 5400,
    confidence: 2,
    implementability: 1,
    usefulness: "somewhat_useful",
    keyTakeaways: ["Setups land faster when specific", "Physical comedy needs space", "End on the strongest beat"],
    tools: [],
  },
  {
    // Deliberately thin: no verifiable content, no tags, nothing actionable —
    // exercises the "thin" tier and the library's hide-low-quality toggle.
    id: "demo_thin_clip",
    username: "demo_scroll",
    fullName: "Demo Scroll",
    category: "Entertainment & Comedy",
    subcategory: "",
    title: "A quick clip with no real takeaways",
    tags: [],
    topics: [],
    durationSec: 11,
    likes: 60,
    confidence: 0,
    implementability: 0,
    usefulness: "",
    verification: "not_verifiable",
    appliesTo: [],
    keyTakeaways: [],
    tools: [],
  },
];

const detail = (s, i) => {
  const verification = s.verification ?? "not_verified";
  const appliesTo = s.appliesTo ?? [];
  const qi = {
    verification,
    usefulness: s.usefulness,
    confidence: s.confidence,
    implementability: s.implementability,
    appliesTo,
    tags: s.tags,
    likes: s.likes,
  };
  return {
    id: s.id,
    title: s.title,
    username: s.username,
    fullName: s.fullName,
    source: "instagram",
    contentType: "short_video",
    author: s.fullName,
    category: s.category,
    subcategory: s.subcategory,
    tags: s.tags,
    thumb: "",
    date: `2026-0${(i % 6) + 1}-1${i}T10:0${i}:00+00:00`,
    likes: s.likes,
    durationSec: s.durationSec,
    verification,
    confidence: s.confidence,
    implementability: s.implementability,
    usefulness: s.usefulness,
    hasVideo: false,
    appliesTo,
    quality: qualityScore(qi),
    tier: tierOf(qi),
    code: "",
    pk: null,
    caption: `${s.title}. Demo content for the Dopamine dashboard — not a real post.`,
    hashtags: s.tags.map((t) => `#${t.replace(/-/g, "")}`),
    transcript: `This is a synthetic transcript for "${s.title}". It exists only so the dashboard has something to render in the public repository.`,
    visualDescription: `A placeholder visual description for the demo video "${s.title}". No real footage is included.`,
    keyTakeaways: s.keyTakeaways,
    topics: s.topics,
    links: s.tools.map((t) => ({
      name: t.name,
      url: t.url,
      type: "shown_on_screen",
      description: t.description,
      timestamp: "0:10",
    })),
    actionableItems: s.tools.map((t) => ({
      name: t.name,
      type: t.type,
      description: t.description,
      url: t.url,
      installCommand: "",
      code: "",
      urlStatus: "live",
      verification: "partially_verified",
    })),
    verificationSummary: "",
    itemResults: [],
    relatedIds: [SPECS[(i + 1) % SPECS.length].id, SPECS[(i + 2) % SPECS.length].id],
    videoPath: null,
    resolution: "",
    fileSizeMb: 0,
  };
};

// Emit quality-first, exactly like src/dashboard/data-builder.ts: featured
// learnings lead, the thin tail sinks. Keeps the demo faithful to the real UI.
const TIER_RANK = { featured: 0, standard: 1, thin: 2 };
const details = SPECS.map(detail).sort(
  (a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.quality - a.quality || b.date.localeCompare(a.date),
);

const indexRecord = (d) => ({
  id: d.id,
  title: d.title,
  username: d.username,
  fullName: d.fullName,
  source: d.source,
  contentType: d.contentType,
  author: d.author,
  category: d.category,
  subcategory: d.subcategory,
  tags: d.tags,
  thumb: d.thumb,
  date: d.date,
  likes: d.likes,
  durationSec: d.durationSec,
  verification: d.verification,
  confidence: d.confidence,
  implementability: d.implementability,
  usefulness: d.usefulness,
  hasVideo: d.hasVideo,
  appliesTo: d.appliesTo,
  quality: d.quality,
  tier: d.tier,
});

const meta = {
  generatedAt: GENERATED_AT,
  totalVideos: details.length,
  totalCategories: new Set(details.map((d) => d.category)).size,
  totalDurationSec: details.reduce((a, d) => a + d.durationSec, 0),
};

const tally = (items) => {
  const m = new Map();
  for (const x of items) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};

const facets = {
  categories: [...tally(details.map((d) => d.category)).entries()].map(([name, count]) => ({
    name,
    count,
    color: PALETTE[name]?.color ?? "#ddd",
    bg: PALETTE[name]?.bg ?? "#333",
  })),
  creators: details.map((d) => ({ name: d.username, fullName: d.fullName, count: 1 })),
  tags: [...tally(details.flatMap((d) => d.tags)).entries()].map(([name, count]) => ({ name, count })),
  topics: [...tally(details.flatMap((d) => d.topics)).entries()].map(([name, count]) => ({ name, count })),
  projects: [...tally(details.flatMap((d) => d.appliesTo)).entries()].map(([name, count]) => ({ name, count })),
};

const tools = details.flatMap((d) =>
  d.actionableItems.map((a) => ({
    name: a.name,
    type: a.type,
    url: a.url,
    urlStatus: a.urlStatus,
    videoId: d.id,
    videoTitle: d.title,
    username: d.username,
    category: d.category,
    verification: a.verification,
    description: a.description,
  })),
);

// One synthetic action brief so the /project page's "Actions to try" section
// renders in the demo (mirrors src/schemas/brief.ts public shape).
const briefs = {
  [DEMO_PROJECT]: {
    actions: [
      {
        title: "Add a retrieval layer over your notes",
        detail:
          "Chunk and embed notes, store vectors with metadata, and re-rank before prompting so the assistant answers from your own content.",
        basedOn: ["demo_ai_rag"],
      },
      {
        title: "Make the notes grid hold up on mobile",
        detail:
          "Define breakpoints from content and prefer auto-fit columns so the note list stays usable on small screens.",
        basedOn: ["demo_ux_grids"],
      },
    ],
  },
};

await fs.mkdir(path.join(OUT, "video"), { recursive: true });
await fs.writeFile(path.join(OUT, "meta.json"), JSON.stringify(meta));
await fs.writeFile(path.join(OUT, "index.json"), JSON.stringify({ meta, videos: details.map(indexRecord) }));
await fs.writeFile(path.join(OUT, "facets.json"), JSON.stringify(facets));
await fs.writeFile(path.join(OUT, "tools.json"), JSON.stringify(tools));
await fs.writeFile(path.join(OUT, "briefs.json"), JSON.stringify(briefs));
for (const d of details) {
  await fs.writeFile(path.join(OUT, "video", `${d.id}.json`), JSON.stringify(d));
}
console.log(`Wrote demo dataset: ${details.length} videos, ${tools.length} tools -> ${OUT}`);
