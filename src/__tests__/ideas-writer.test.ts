import { describe, expect, it } from "vitest";
import { type FsLike, type IdeaVideo, ideaBlock, writeIdeas } from "../agents/ideas-writer.js";
import type { MappingSet } from "../agents/project-mapper.js";
import type { Project } from "../schemas/projects.js";

/** In-memory fs honoring the tmp+rename atomic-write pattern. */
function memFs(seed: Record<string, string> = {}, existingDirs: string[] = []) {
  const files = new Map(Object.entries(seed));
  const dirs = new Set(existingDirs);
  const impl: FsLike = {
    readFile: async (p) => {
      const f = files.get(String(p));
      if (f === undefined) throw new Error(`ENOENT ${String(p)}`);
      return f;
    },
    writeFile: async (p, data) => {
      files.set(String(p), String(data));
    },
    rename: async (from, to) => {
      const v = files.get(String(from));
      if (v === undefined) throw new Error("ENOENT");
      files.set(String(to), v);
      files.delete(String(from));
    },
    access: async (p) => {
      if (!dirs.has(String(p)) && !files.has(String(p))) throw new Error(`ENOENT ${String(p)}`);
    },
  };
  return { impl, files };
}

const video: IdeaVideo = {
  id: "a_1",
  title: "CloakBrowser",
  takeaways: ["bypasses cloudflare"],
  toolNames: ["CloakBrowser"],
  sourceUrl: "https://www.instagram.com/reel/AAA/",
};

const projects: Project[] = [
  { name: "Dopamine", description: "scraper", keywords: [], path: "/repo/dopamine" },
  { name: "NoPath", description: "no path", keywords: [] },
  { name: "Missing", description: "path absent", keywords: [], path: "/repo/missing" },
];

describe("ideaBlock", () => {
  it("includes title, reason, takeaway, tools, source, and marker", () => {
    const b = ideaBlock(video, "fits the scraper", "<!-- dopamine:a_1 -->");
    expect(b).toContain("### CloakBrowser");
    expect(b).toContain("fits the scraper");
    expect(b).toContain("- **Takeaway:** bypasses cloudflare");
    expect(b).toContain("- **Source:** https://www.instagram.com/reel/AAA/");
    expect(b).toContain("<!-- dopamine:a_1 -->");
  });

  it("neutralises comment markers in LLM-derived text (no marker forgery)", () => {
    const b = ideaBlock(video, "sneaky <!-- dopamine:other --> text", "<!-- dopamine:a_1 -->");
    expect(b).toContain("<!-- dopamine:a_1 -->"); // the real marker survives
    expect(b).not.toContain("<!-- dopamine:other -->"); // the forged one is neutralised
  });
});

const statePath = "/state/ideas_state.json";
const opts = (impl: FsLike) => ({ statePath, now: () => "2026-07-19T00:00:00Z", fsImpl: impl });

describe("writeIdeas", () => {
  it("creates IDEAS.md with a header for a high-confidence mapping into an existing path", async () => {
    const { impl, files } = memFs({}, ["/repo/dopamine"]);
    const mappings: MappingSet = { a_1: [{ project: "Dopamine", confidence: "high", reason: "fits" }] };
    await writeIdeas(mappings, [video], projects, opts(impl));
    const ideas = files.get("/repo/dopamine/IDEAS.md");
    expect(ideas).toContain("# Ideas from Dopamine");
    expect(ideas).toContain("### CloakBrowser");
    expect(files.has("/repo/dopamine/IDEAS.md.tmp")).toBe(false); // atomic — no remnant
  });

  it("is idempotent across runs (marker + state guard, no duplicate block)", async () => {
    const { impl, files } = memFs({}, ["/repo/dopamine"]);
    const mappings: MappingSet = { a_1: [{ project: "Dopamine", confidence: "high", reason: "fits" }] };
    await writeIdeas(mappings, [video], projects, opts(impl));
    await writeIdeas(mappings, [video], projects, opts(impl));
    const occurrences = (files.get("/repo/dopamine/IDEAS.md") ?? "").split("### CloakBrowser").length - 1;
    expect(occurrences).toBe(1);
  });

  it("skips non-high confidence, path-less projects, and missing paths", async () => {
    const { impl, files } = memFs({}, ["/repo/dopamine"]);
    const mappings: MappingSet = {
      a_1: [
        { project: "Dopamine", confidence: "medium", reason: "meh" }, // not high
        { project: "NoPath", confidence: "high", reason: "no path" }, // no path
        { project: "Missing", confidence: "high", reason: "absent" }, // path not on disk
      ],
    };
    await writeIdeas(mappings, [video], projects, opts(impl));
    expect(files.has("/repo/dopamine/IDEAS.md")).toBe(false);
    expect(files.has("/repo/missing/IDEAS.md")).toBe(false);
  });
});
