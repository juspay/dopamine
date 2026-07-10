import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ingestMetadata } from "../pipeline/ingest.js";
import type { MetadataEntry } from "../types/index.js";

// Injectable temp store — NEVER touch the real videos/metadata.json in tests.
// Use a uniquely-named temp dir (mkdtemp) rather than a fixed name in the shared
// temp dir, matching the state/video/organizer suites — a predictable /tmp path
// is the insecure-temp-file class CodeQL flags.
let tmpDir: string;
let STORE: string;

const entry = (pk: string, extra: Partial<MetadataEntry> = {}): MetadataEntry => ({
  pk,
  code: `c${pk}`,
  media_type: 2,
  taken_at: `2026-01-0${pk}T00:00:00`,
  caption_text: null,
  username: "u",
  full_name: null,
  location: null,
  like_count: 0,
  comment_count: 0,
  video_url: `v${pk}`,
  thumbnail_url: null,
  resources: [],
  ...extra,
});

const writeStore = (data: unknown) => fs.writeFile(STORE, JSON.stringify(data), "utf8");
const readStore = async (): Promise<MetadataEntry[]> => JSON.parse(await fs.readFile(STORE, "utf8"));

describe("ingestMetadata", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dopamine-ingest-"));
    STORE = path.join(tmpDir, "metadata.json");
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("adds new entries to an empty store", async () => {
    const r = await ingestMetadata([entry("1"), entry("2")], STORE);
    expect(r).toEqual({ added: 2, updated: 0, total: 2 });
  });

  it("dedupes by pk, new wins, existing preserved", async () => {
    await writeStore([entry("1", { caption_text: "old" }), entry("9")]);
    const r = await ingestMetadata([entry("1", { caption_text: "new" }), entry("2")], STORE);
    expect(r).toEqual({ added: 1, updated: 1, total: 3 });
    const store = await readStore();
    expect(store.find((e) => e.pk === "1")?.caption_text).toBe("new");
    expect(store.some((e) => e.pk === "9")).toBe(true);
  });

  it("migrates legacy SourceItem[] (pk under .ig)", async () => {
    await writeStore([{ id: "u_1.mp4", source: "instagram", ig: entry("1") }]);
    const r = await ingestMetadata([entry("2")], STORE);
    expect(r.total).toBe(2);
  });

  it("is idempotent on identical re-ingest", async () => {
    await writeStore([entry("1")]);
    const r = await ingestMetadata([entry("1")], STORE);
    expect(r).toEqual({ added: 0, updated: 1, total: 1 });
  });

  it("sorts by taken_at descending", async () => {
    await ingestMetadata([entry("1"), entry("3"), entry("2")], STORE);
    expect((await readStore()).map((e) => e.pk)).toEqual(["3", "2", "1"]);
  });
});
