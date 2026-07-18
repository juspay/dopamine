import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

// Resolve the repo root from this module's location (dist/mcp/server.js → ../../)
// so the server works no matter which project's session spawns it, then load the
// repo .env for Vertex credentials. NOTE: stdout is the MCP transport — every
// diagnostic in this file must go to stderr (console.error), never stdout.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(repoRoot, ".env") });
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(repoRoot, process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

const { hasSearchSchema, openSearchDb } = await import("../search/db.js");
const { TOOLS, handleToolCall } = await import("./handlers.js");

const DB_PATH = path.join(repoRoot, "videos", "search.db");
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
// Generous: cold Vertex auth + first embed can take >10s. Later calls are fast.
const QUERY_EMBED_TIMEOUT_MS = 15_000;
// Provider construction is retried on later queries (a boot-time blip must not
// disable semantic search for the whole session), but a persistently failing
// setup — genuinely missing creds — stops being retried after this many tries.
const MAX_EMBED_INIT_ATTEMPTS = 5;

let db: DatabaseSync | null = null;
function getDb(): DatabaseSync {
  if (db === null) {
    const opened = openSearchDb(DB_PATH, { readonly: true });
    // An empty/foreign file opens fine readonly but has no schema — treat it the
    // same as a missing index so callers get the friendly help message.
    if (!hasSearchSchema(opened)) {
      opened.close();
      throw new Error("search.db exists but has no search schema");
    }
    db = opened;
  }
  return db;
}

type EmbedFn = (text: string) => Promise<number[]>;
// Single-flight construction: concurrent calls (e.g. the boot warmup racing a
// real request) share one in-flight attempt. A settled failure clears the slot
// so the next query retries, until the attempt budget is exhausted.
let embedInit: Promise<EmbedFn | null> | undefined;
let embedInitAttempts = 0;

function initEmbedFn(): Promise<EmbedFn | null> {
  embedInit ??= (async () => {
    embedInitAttempts++;
    try {
      const { createAIProvider } = await import("@juspay/neurolink");
      const provider = await createAIProvider("vertex");
      return (t: string) => provider.embed(t, EMBEDDING_MODEL);
    } catch (err) {
      const permanent = embedInitAttempts >= MAX_EMBED_INIT_ATTEMPTS;
      console.error(
        `dopamine-kb: embedding provider init failed (attempt ${embedInitAttempts}/${MAX_EMBED_INIT_ATTEMPTS}${permanent ? ", giving up — keyword-only for this session" : ", will retry on next query"}): ${String(err).slice(0, 200)}`,
      );
      if (!permanent) {
        embedInit = undefined;
      }
      return null;
    }
  })();
  return embedInit;
}

async function getQueryVector(text: string): Promise<number[] | null> {
  const embedFn = await initEmbedFn();
  if (embedFn === null) return null;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("query embedding timed out")), QUERY_EMBED_TIMEOUT_MS),
    );
    return await Promise.race([embedFn(text), timeout]);
  } catch (err) {
    // Timeouts/transient errors: degrade this query only; the next call retries.
    console.error(`dopamine-kb: query embedding failed, keyword-only for this query: ${String(err).slice(0, 200)}`);
    return null;
  }
}

const MISSING_DB_HELP =
  "The search index (videos/search.db) does not exist yet. Build it from the dopamine repo with: npm run build && npm run search:index";

const deps = {
  getDb,
  getQueryVector,
  embeddingModel: EMBEDDING_MODEL,
  missingDbHelp: MISSING_DB_HELP,
};

const server = new Server({ name: "dopamine-kb", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, (request) =>
  handleToolCall(deps, request.params.name, request.params.arguments ?? {}),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`dopamine-kb MCP server ready (db: ${DB_PATH})`);
// Warm the embedding provider in the background so the first real query is fast.
void getQueryVector("warm up");
