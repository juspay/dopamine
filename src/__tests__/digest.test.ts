import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type DigestCandidate,
  type DigestState,
  buildPushPayload,
  composeDigest,
  fallbackDigest,
  parseDigestState,
  rankScore,
  resolvePushKey,
  runDigestAgent,
  saveDigestState,
  selectCandidates,
} from "../agents/digest.js";
import { loadState } from "../pipeline/state.js";
import { openSearchDb } from "../search/db.js";
import { type SearchStates, buildSearchRecords, indexRecords } from "../search/indexer.js";

function kb(takeaway: string) {
  return {
    category: "Tech & Coding",
    transcript: "t",
    visual_description: "",
    key_takeaways: [{ timestamp: "0:01", takeaway }],
    topics: [],
  };
}

const states: SearchStates = {
  knowledge: {
    "a_1.mp4": kb("verified great tool"),
    "b_2.mp4": kb("unverified tool"),
    "c_3.mp4": kb("another verified tool"),
  },
  classifications: {
    "a_1.mp4": { category: "Tech & Coding", tags: [], description: "Tool A", code: "AAA", username: "a" },
    "b_2.mp4": { category: "Tech & Coding", tags: [], description: "Tool B", code: "BBB", username: "b" },
    "c_3.mp4": { category: "Tech & Coding", tags: [], description: "Tool C", code: "CCC", username: "c" },
    // No knowledge/analysis entry — non-target category, nothing extracted
    "d_4.mp4": { category: "Food & Cooking", tags: [], description: "Pasta", code: "DDD", username: "d" },
  },
  catalog: [
    { filename: "a_1.mp4", description: "Tool A video", taken_at: "2026-07-10" },
    { filename: "b_2.mp4", description: "Tool B video", taken_at: "2026-07-12" },
    { filename: "c_3.mp4", description: "Tool C video", taken_at: "2026-07-11" },
    { filename: "d_4.mp4", description: "Pasta video", taken_at: "2026-07-13" },
  ],
  analysis: {
    "a_1.mp4": {
      actionable_items: [{ name: "ToolA", type: "tool_install", description: "d", url: "https://a.example" }],
      implementability_score: 9,
      usefulness_prediction: "highly_useful",
    },
    "b_2.mp4": {
      actionable_items: [{ name: "ToolB", type: "technique", description: "d" }],
      implementability_score: 2,
    },
  },
  research: {},
  verifications: { "a_1.mp4": { overall_score: "verified_useful" } },
  linksV2: {},
};

function candidate(over: Partial<DigestCandidate>): DigestCandidate {
  return {
    id: "x",
    title: "T",
    category: "Tech & Coding",
    takenAt: "2026-07-10",
    sourceUrl: "https://www.instagram.com/reel/X/",
    verification: "unknown",
    implementability: 0,
    usefulness: "unknown",
    takeaways: ["do the thing"],
    toolNames: [],
    ...over,
  };
}

let tmpDir: string;
let db: DatabaseSync;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-digest-"));
  db = openSearchDb(path.join(tmpDir, "search.db"));
  await indexRecords(db, buildSearchRecords(states), async (texts) => texts.map(() => [1, 0, 0]), "test-model");
});

afterEach(async () => {
  db.close();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("rankScore", () => {
  it("ranks verified + highly useful + implementable above unknowns", () => {
    const strong = candidate({ verification: "verified_useful", usefulness: "highly_useful", implementability: 9 });
    const weak = candidate({ verification: "unknown", usefulness: "unknown", implementability: 2 });
    expect(rankScore(strong)).toBeGreaterThan(rankScore(weak));
  });
});

describe("selectCandidates", () => {
  it("filters digested ids, ranks, limits, and hydrates takeaways + tools", () => {
    // a_1: verified+highly_useful+impl9 → 10.8; b_2: unknown+impl2 → 2.4; c_3: unknown, no analysis → 2.0
    const all = selectCandidates(db, new Set(), 10);
    expect(all.items.map((c) => c.id)).toEqual(["a_1", "b_2", "c_3"]);
    const top = selectCandidates(db, new Set(["a_1"]), 1);
    expect(top.items).toHaveLength(1);
    expect(top.items[0].id).not.toBe("a_1");
    const a = all.items[0];
    expect(a.takeaways[0]).toContain("verified great tool");
    expect(a.toolNames).toContain("ToolA");
  });

  it("routes content-less videos to skippedIds instead of the digest", () => {
    const { items, skippedIds } = selectCandidates(db, new Set(), 10);
    expect(skippedIds).toEqual(["d_4"]);
    expect(items.map((c) => c.id)).not.toContain("d_4");
  });
});

describe("fallbackDigest / composeDigest", () => {
  it("builds mechanical lines with truncation", () => {
    const d = fallbackDigest([candidate({ title: "X".repeat(200) })]);
    expect(d.lines[0].length).toBeLessThanOrEqual(110);
    expect(d.headline).toContain("1 new learning");
  });

  it("uses the LLM digest when line count matches, truncating long lines", async () => {
    const items = [candidate({}), candidate({ id: "y" })];
    const d = await composeDigest(async () => ({ headline: "H".repeat(200), lines: ["a".repeat(150), "b"] }), items);
    expect(d.headline.length).toBeLessThanOrEqual(80);
    expect(d.lines).toHaveLength(2);
    expect(d.lines[0].length).toBeLessThanOrEqual(110);
  });

  it("accepts newline-packed and numbered lines from the model", async () => {
    const items = [candidate({}), candidate({ id: "y" }), candidate({ id: "z" })];
    const d = await composeDigest(
      async () => ({ headline: "h", lines: ["1. first line\n2) second line\n3. third line"] }),
      items,
    );
    expect(d.lines).toEqual(["first line", "second line", "third line"]);
  });

  it("falls back on wrong line count and on LLM errors", async () => {
    const items = [candidate({})];
    const wrongCount = await composeDigest(async () => ({ headline: "h", lines: ["a", "b"] }), items);
    expect(wrongCount.lines[0]).toContain("do the thing");
    const thrown = await composeDigest(async () => {
      throw new Error("boom");
    }, items);
    expect(thrown.lines).toHaveLength(1);
  });
});

describe("buildPushPayload", () => {
  it("numbers lines and attaches URLs by index", () => {
    const items = [candidate({ sourceUrl: "https://one" }), candidate({ id: "y", sourceUrl: "https://two" })];
    const p = buildPushPayload({ headline: "hl", lines: ["first", "second"] }, items, "2026-07-19T00:00:00Z", "req1");
    expect(p.title).toBe("Dopamine — 2 new learnings");
    expect(p.subtitle).toBe("hl");
    expect(p.message).toBe("1. first\nhttps://one\n2. second\nhttps://two");
    expect(p.data).toMatchObject({ category: "digest", project: "dopamine", requestId: "req1" });
  });
});

describe("resolvePushKey", () => {
  it("prefers the env var, falls back to the shooter env file, else empty", () => {
    expect(resolvePushKey({ DIGEST_PUSH_KEY: "envkey" })).toBe("envkey");
    expect(resolvePushKey({}, () => 'API_KEY="filekey"\nOTHER=x')).toBe("filekey");
    expect(
      resolvePushKey({}, () => {
        throw new Error("absent");
      }),
    ).toBe("");
  });

  it("never captures trailing inline comments or whitespace into the token", () => {
    expect(resolvePushKey({}, () => "API_KEY=abc123 # deployment key")).toBe("abc123");
    expect(resolvePushKey({}, () => "API_KEY=abc123\ttrailing")).toBe("abc123");
    expect(resolvePushKey({}, () => 'API_KEY="spaced value # not comment"')).toBe("spaced value # not comment");
  });
});

describe("digest state handling", () => {
  it("parseDigestState rejects invalid JSON and malformed-but-parseable shapes", () => {
    expect(parseDigestState("{truncated")).toBeNull();
    expect(parseDigestState("{}")).toBeNull();
    expect(parseDigestState('{"digestedIds": "not-an-array", "lastDigestAt": "x"}')).toBeNull();
    expect(parseDigestState('{"digestedIds": [1, 2], "lastDigestAt": "x"}')).toBeNull();
    expect(parseDigestState('{"digestedIds": ["a"], "lastDigestAt": "x"}')).toEqual({
      digestedIds: ["a"],
      lastDigestAt: "x",
    });
  });

  it("saveDigestState writes atomically (no .tmp remnant, parseable result)", async () => {
    const p = path.join(tmpDir, "digest_state.json");
    await saveDigestState(p, { digestedIds: ["a"], lastDigestAt: "x" });
    expect(parseDigestState(await fs.readFile(p, "utf8"))).not.toBeNull();
    await expect(fs.access(`${p}.tmp`)).rejects.toThrow();
  });
});

describe("runDigestAgent", () => {
  const dbPath = () => path.join(tmpDir, "search.db");
  const statePath = () => path.join(tmpDir, "digest_state.json");

  it("bootstraps by seeding all ids without pushing", async () => {
    let pushed = 0;
    await runDigestAgent(null, {
      dbPath: dbPath(),
      statePath: statePath(),
      pushKey: "k",
      fetchFn: async () => {
        pushed++;
        return new Response("ok", { status: 200 });
      },
    });
    expect(pushed).toBe(0);
    const state = await loadState<DigestState | null>(statePath(), null);
    expect(state?.digestedIds.sort()).toEqual(["a_1", "b_2", "c_3", "d_4"]);
  });

  it("pushes new items and marks them digested only on 2xx", async () => {
    await fs.writeFile(statePath(), JSON.stringify({ digestedIds: ["b_2", "c_3"], lastDigestAt: "x" }));
    const calls: string[] = [];
    await runDigestAgent(null, {
      dbPath: dbPath(),
      statePath: statePath(),
      pushKey: "k",
      generate: async () => ({ headline: "h", lines: ["one line"] }),
      fetchFn: async (url) => {
        calls.push(String(url));
        return new Response("ok", { status: 200 });
      },
      pushUrl: "http://test/notify",
    });
    expect(calls).toEqual(["http://test/notify"]);
    const state = await loadState<DigestState | null>(statePath(), null);
    expect(state?.digestedIds).toContain("a_1");
    // content-less d_4 marked alongside, without being sent
    expect(state?.digestedIds).toContain("d_4");
  });

  it("rolls forward (state untouched) when delivery fails", async () => {
    await fs.writeFile(statePath(), JSON.stringify({ digestedIds: ["b_2", "c_3"], lastDigestAt: "x" }));
    await runDigestAgent(null, {
      dbPath: dbPath(),
      statePath: statePath(),
      pushKey: "k",
      fetchFn: async () => new Response("nope", { status: 500 }),
    });
    const state = await loadState<DigestState | null>(statePath(), null);
    expect(state?.digestedIds).not.toContain("a_1");
  });

  it("sends nothing when there are no new items or no key", async () => {
    let pushed = 0;
    const fetchFn = async () => {
      pushed++;
      return new Response("ok", { status: 200 });
    };
    await fs.writeFile(statePath(), JSON.stringify({ digestedIds: ["a_1", "b_2", "c_3"], lastDigestAt: "x" }));
    await runDigestAgent(null, { dbPath: dbPath(), statePath: statePath(), pushKey: "k", fetchFn });
    // content-less d_4 was the only new item: skipped AND persisted as digested
    const afterSkip = await loadState<DigestState | null>(statePath(), null);
    expect(afterSkip?.digestedIds).toContain("d_4");
    await fs.writeFile(statePath(), JSON.stringify({ digestedIds: [], lastDigestAt: "x" }));
    await runDigestAgent(null, { dbPath: dbPath(), statePath: statePath(), pushKey: "", fetchFn });
    expect(pushed).toBe(0);
  });

  it("refuses to run (and never re-bootstraps) over a corrupt state file", async () => {
    for (const corrupt of ["{truncated", "{}"]) {
      await fs.writeFile(statePath(), corrupt);
      let pushed = 0;
      await runDigestAgent(null, {
        dbPath: dbPath(),
        statePath: statePath(),
        pushKey: "k",
        fetchFn: async () => {
          pushed++;
          return new Response("ok", { status: 200 });
        },
      });
      expect(pushed).toBe(0);
      // file untouched — no silent re-bootstrap over the corrupt content
      expect(await fs.readFile(statePath(), "utf8")).toBe(corrupt);
    }
  });

  it("skips when another run holds the lock, proceeds when the lock is stale", async () => {
    const lockPath = path.join(tmpDir, "digest.lock");
    await fs.mkdir(lockPath);
    let pushed = 0;
    const opts = {
      dbPath: dbPath(),
      statePath: statePath(),
      lockPath,
      pushKey: "k",
      generate: async () => ({ headline: "h", lines: ["one"] }),
      fetchFn: async () => {
        pushed++;
        return new Response("ok", { status: 200 });
      },
    };
    await fs.writeFile(statePath(), JSON.stringify({ digestedIds: ["b_2", "c_3", "d_4"], lastDigestAt: "x" }));
    await runDigestAgent(null, opts);
    expect(pushed).toBe(0); // fresh lock → skipped

    const stale = new Date(Date.now() - 11 * 60 * 1000);
    await fs.utimes(lockPath, stale, stale);
    await runDigestAgent(null, opts);
    expect(pushed).toBe(1); // stale lock reclaimed → ran, and lock released after
    await expect(fs.access(lockPath)).rejects.toThrow();
  });

  it("skips gracefully when search.db exists but has no schema", async () => {
    const emptyDb = path.join(tmpDir, "empty.db");
    await fs.writeFile(emptyDb, "");
    let pushed = 0;
    await runDigestAgent(null, {
      dbPath: emptyDb,
      statePath: statePath(),
      pushKey: "k",
      fetchFn: async () => {
        pushed++;
        return new Response("ok", { status: 200 });
      },
    });
    expect(pushed).toBe(0); // no throw, no push
  });
});
