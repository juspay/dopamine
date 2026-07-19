import type { DatabaseSync } from "node:sqlite";
import {
  type Confidence,
  clampLimit,
  findForProject,
  getVideo,
  hybridSearch,
  listMappedProjects,
  searchTools,
  stats,
} from "../search/query.js";

/** Everything the tool dispatch needs from the host process — injectable for tests. */
export interface HandlerDeps {
  getDb: () => DatabaseSync;
  getQueryVector: (text: string) => Promise<number[] | null>;
  embeddingModel: string;
  missingDbHelp: string;
}

export interface ToolContent {
  content: { type: "text"; text: string }[];
  isError?: true;
  /** Structural compatibility with the MCP SDK's CallTool result type. */
  [key: string]: unknown;
}

function jsonContent(value: unknown): ToolContent {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorContent(message: string): ToolContent {
  return { content: [{ type: "text", text: message }], isError: true };
}

export const TOOLS = [
  {
    name: "search_corpus",
    description:
      "Hybrid semantic + keyword search over the saved-video knowledge corpus. Returns ranked videos with key takeaways, top tools, verification status, and source URL. Use for questions like 'what did I save about X?'.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural-language search query" },
        category: { type: "string", description: "Optional exact category filter, e.g. 'Tech & Coding'" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_video",
    description:
      "Full detail for one video by id: transcript, visual description, takeaways, topics, tools with URLs, verification.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Video id from search_corpus results" } },
      required: ["id"],
    },
  },
  {
    name: "search_tools",
    description:
      "Search the extracted tools/techniques catalogue by name or description substring. Returns tool records with live-checked URLs and the source video.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Substring to match against tool name/description" },
        type: {
          type: "string",
          description: "Optional type filter: tool_install | workflow | technique | api_setup | code_snippet | link",
        },
        limit: { type: "number", description: "Max results (default 15)" },
      },
      required: ["query"],
    },
  },
  {
    name: "corpus_stats",
    description: "Corpus overview: totals, per-category counts, embedding coverage, index freshness.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "find_for_project",
    description:
      "Learnings from the corpus mapped to one of your projects. Use when working on a project to pull every saved learning that applies to it, with why-it-applies reasons and source links.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project name (case-insensitive)" },
        minConfidence: { type: "string", description: "Optional floor: high | medium | low (default low)" },
      },
      required: ["project"],
    },
  },
];

function asConfidence(v: unknown): Confidence {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  return s === "high" || s === "medium" || s === "low" ? s : "low";
}

type ToolArgs = Record<string, unknown>;
type ToolFn = (deps: HandlerDeps, db: DatabaseSync, args: ToolArgs) => Promise<ToolContent> | ToolContent;

const toolFns: Record<string, ToolFn> = {
  search_corpus: async (deps, db, args) => {
    const query = String(args.query ?? "");
    if (query === "") return errorContent("query is required");
    const vector = await deps.getQueryVector(query);
    return jsonContent(
      hybridSearch(db, query, vector, {
        category: typeof args.category === "string" ? args.category : undefined,
        limit: clampLimit(args.limit, 10),
        queryModel: deps.embeddingModel,
      }),
    );
  },
  get_video: (_deps, db, args) => {
    const detail = getVideo(db, String(args.id ?? ""));
    return detail === null ? errorContent(`No video with id: ${String(args.id)}`) : jsonContent(detail);
  },
  search_tools: (_deps, db, args) => {
    const query = String(args.query ?? "");
    if (query === "") return errorContent("query is required");
    return jsonContent(
      searchTools(
        db,
        query,
        typeof args.type === "string" && args.type !== "" ? args.type : undefined,
        clampLimit(args.limit, 15),
      ),
    );
  },
  corpus_stats: (_deps, db) => jsonContent(stats(db)),
  find_for_project: (_deps, db, args) => {
    const project = String(args.project ?? "");
    if (project === "") return errorContent("project is required");
    const hits = findForProject(db, project, asConfidence(args.minConfidence));
    if (hits.length === 0) {
      const known = listMappedProjects(db);
      return errorContent(
        known.length > 0
          ? `No mappings for "${project}". Known projects: ${known.join(", ")}`
          : "No project mappings yet — run map:projects with a projects.json.",
      );
    }
    return jsonContent(hits);
  },
};

/** Dispatch one tools/call request. Never throws — every failure is a ToolContent error. */
export async function handleToolCall(deps: HandlerDeps, name: string, args: ToolArgs = {}): Promise<ToolContent> {
  let db: DatabaseSync;
  try {
    db = deps.getDb();
  } catch {
    return errorContent(deps.missingDbHelp);
  }

  const fn = toolFns[name];
  if (!fn) return errorContent(`Unknown tool: ${name}`);
  try {
    return await fn(deps, db, args);
  } catch (err) {
    return errorContent(`dopamine-kb error: ${String(err).slice(0, 300)}`);
  }
}
