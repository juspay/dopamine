# dopamine-kb MCP Server

Expose the processed video corpus as an [MCP](https://modelcontextprotocol.io)
server so any Claude Code session — in any repository — can ask "what did I save
about X?" and get ranked, verified answers with source links.

## How it works

The last pipeline step (`Search index`, also runnable via `npm run search:index`)
builds `videos/search.db`: an SQLite database with an FTS5 keyword index and one
Gemini embedding per video (generated through the NeuroLink Vertex provider,
incrementally — only new or changed videos are re-embedded).

The server (`src/mcp/server.ts`, stdio transport) answers queries with **hybrid
retrieval**: the query is embedded, cosine similarity is computed against all
video vectors, an FTS5/BM25 keyword search runs in parallel, and the two rankings
are merged with reciprocal-rank fusion. If the embedding call fails (no
credentials, offline, quota), the server degrades to keyword-only and reports
`"mode": "fts_only"` in the response instead of erroring.

## Setup

```bash
# 1. Build the project and the index (from the repo root)
npm run build
npm run search:index

# 2. Register the server user-scoped (available in every project)
claude mcp add --scope user dopamine-kb -- node <repo>/dist/mcp/server.js
```

Replace `<repo>` with the absolute path to your dopamine checkout. The server
resolves the repo root from its own location, loads the repo `.env` for Vertex
credentials, and opens `videos/search.db` read-only — so it works regardless of
which project's session spawns it.

## Tools

| Tool | Input | Returns |
|------|-------|---------|
| `search_corpus` | `query` (required), `category?`, `limit?` (default 10) | Ranked hits: id, title, category, creator, key takeaways, top tools, verification, source URL — plus the retrieval `mode` |
| `get_video` | `id` (from search results) | Full record: transcript, visual description, takeaways, topics, all tools with URLs and liveness status, verification |
| `search_tools` | `query` (required), `type?` (`tool_install` \| `workflow` \| `technique` \| `api_setup` \| `code_snippet` \| `link`), `limit?` (default 15) | Tool records with live-checked URLs and the source video |
| `corpus_stats` | — | Totals, per-category counts, embedding coverage, index build time and model |

## Rebuilding the index

The index refreshes automatically at the end of every pipeline run. To rebuild
manually (e.g. after changing `EMBEDDING_MODEL`):

```bash
npm run build && npm run search:index
```

Changing `EMBEDDING_MODEL` re-embeds the whole corpus by construction (the
per-video hash includes the model name).

## Privacy

`videos/search.db` (and its WAL sidecars) are explicitly gitignored
(`videos/*.db`, `videos/*.db-*`), like all other pipeline state under `videos/`.
Nothing about your corpus is committed to the repository.
