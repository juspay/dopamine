import type { DatabaseSync } from "node:sqlite";
import { clampLimit, getVideo, hybridSearch, searchTools, stats } from "../search/query.js";

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
];

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
