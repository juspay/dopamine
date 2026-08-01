import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { handleToolCall } from "../mcp/handlers.js";
import { type UsageEntry, createUsageLogger, formatEntry, tallyConfidence } from "../mcp/usage-log.js";

describe("tallyConfidence", () => {
  it("counts each level and always reports all three", () => {
    const t = tallyConfidence([{ confidence: "high" }, { confidence: "low" }, { confidence: "low" }]);
    expect(t).toEqual({ high: 1, medium: 0, low: 2 });
  });

  it("ignores an unrecognised level instead of inventing a key", () => {
    const t = tallyConfidence([{ confidence: "bogus" as never }, { confidence: "medium" }]);
    expect(Object.keys(t).sort()).toEqual(["high", "low", "medium"]);
    expect(t.medium).toBe(1);
  });
});

describe("formatEntry", () => {
  it("emits one newline-terminated JSON object with the timestamp first", () => {
    const line = formatEntry({ event: "call", tool: "search_corpus", ms: 12, ok: true }, "2026-01-01T00:00:00.000Z");
    expect(line.endsWith("\n")).toBe(true);
    expect(line.split("\n").filter(Boolean)).toHaveLength(1);
    expect(JSON.parse(line)).toEqual({
      at: "2026-01-01T00:00:00.000Z",
      event: "call",
      tool: "search_corpus",
      ms: 12,
      ok: true,
    });
  });
});

let dir: string | undefined;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("createUsageLogger", () => {
  it("appends one line per entry", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "usage-"));
    const file = path.join(dir, "u.jsonl");
    const log = createUsageLogger(file, () => "T");
    log({ event: "call", tool: "a", ms: 1, ok: true });
    log({ event: "call", tool: "b", ms: 2, ok: false });
    // Writes are fire-and-forget, so poll for the expected line count rather
    // than racing a fixed sleep.
    let lines: string[] = [];
    for (let i = 0; i < 100 && lines.length < 2; i++) {
      await new Promise((r) => setTimeout(r, 10));
      lines = (await readFile(file, "utf8").catch(() => "")).trim().split("\n").filter(Boolean);
    }
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).tool).toBe("a");
    expect(JSON.parse(lines[1]).ok).toBe(false);
  });

  it("never throws when the path is unwritable — telemetry must not break a tool call", async () => {
    const log = createUsageLogger("/nonexistent-dir-xyz/u.jsonl", () => "T");
    expect(() => log({ event: "call", tool: "a", ms: 1, ok: true })).not.toThrow();
    await new Promise((r) => setTimeout(r, 20));
  });
});

describe("handleToolCall usage logging", () => {
  const baseDeps = {
    getDb: () => ({}) as never,
    getQueryVector: async () => null,
    embeddingModel: "m",
    missingDbHelp: "no db",
  };

  it("records the tool name and failure when the db is missing", async () => {
    const seen: UsageEntry[] = [];
    // getDb throwing is the pre-dispatch bail-out, which must still be visible:
    // "every call failed because the index was missing" is exactly the kind of
    // thing this log exists to surface.
    await handleToolCall(
      {
        ...baseDeps,
        getDb: () => {
          throw new Error("nope");
        },
        logUsage: (e) => seen.push(e),
      },
      "corpus_stats",
      {},
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ event: "call", tool: "corpus_stats", ok: false });
  });

  it("records an unknown tool as a failed call", async () => {
    const seen: UsageEntry[] = [];
    await handleToolCall({ ...baseDeps, logUsage: (e) => seen.push(e) }, "no_such_tool", {});
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ event: "call", tool: "no_such_tool", ok: false });
  });

  it("works with no logger supplied", async () => {
    await expect(handleToolCall(baseDeps, "no_such_tool", {})).resolves.toBeDefined();
  });
});
