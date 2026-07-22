import { describe, expect, it } from "vitest";
import { type FsLike, writeBriefIdeas } from "../agents/ideas-writer.js";
import type { ProjectBriefs } from "../schemas/brief.js";
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

const dopamine: Project[] = [{ name: "Dopamine", description: "d", keywords: [], path: "/repo" }];

describe("writeBriefIdeas", () => {
  it("appends once, skips on same hash, replaces on new hash", async () => {
    const { impl, files } = memFs({}, ["/repo"]);
    const a: ProjectBriefs = {
      Dopamine: { hash: "H1", generatedAt: "T", actions: [{ title: "Do X", detail: "dx", basedOn: [] }] },
    };
    await writeBriefIdeas(a, dopamine, { fsImpl: impl });
    const first = files.get("/repo/IDEAS.md");
    expect(first).toContain("dopamine:brief:Dopamine:start:H1");
    expect(first).toContain("Do X");
    expect(files.has("/repo/IDEAS.md.tmp")).toBe(false); // atomic — no remnant

    await writeBriefIdeas(a, dopamine, { fsImpl: impl }); // same hash → unchanged
    expect(files.get("/repo/IDEAS.md")).toBe(first);

    const b: ProjectBriefs = {
      Dopamine: { hash: "H2", generatedAt: "T", actions: [{ title: "Do Y", detail: "dy", basedOn: [] }] },
    };
    await writeBriefIdeas(b, dopamine, { fsImpl: impl });
    const after = files.get("/repo/IDEAS.md") ?? "";
    expect(after).toContain("dopamine:brief:Dopamine:start:H2");
    expect(after).not.toContain("dopamine:brief:Dopamine:start:H1"); // region replaced
    expect(after).not.toContain("Do X");
  });

  it("removes a stale region when the project's brief disappears", async () => {
    const { impl, files } = memFs({}, ["/repo"]);
    const a: ProjectBriefs = {
      Dopamine: { hash: "H", generatedAt: "T", actions: [{ title: "Do X", detail: "dx", basedOn: [] }] },
    };
    await writeBriefIdeas(a, dopamine, { fsImpl: impl });
    expect(files.get("/repo/IDEAS.md")).toContain("dopamine:brief:Dopamine:start:H");
    // Later run: no brief for Dopamine (dropped below threshold / unmapped).
    await writeBriefIdeas({}, dopamine, { fsImpl: impl });
    const after = files.get("/repo/IDEAS.md") ?? "";
    expect(after).not.toContain("dopamine:brief:Dopamine");
    expect(after).not.toContain("Do X");
  });

  it("keeps distinct projects that share a repo path in separate regions", async () => {
    const { impl, files } = memFs({}, ["/repo"]);
    const two: Project[] = [
      { name: "Alpha", description: "a", keywords: [], path: "/repo" },
      { name: "Beta", description: "b", keywords: [], path: "/repo" },
    ];
    const briefs: ProjectBriefs = {
      Alpha: { hash: "A", generatedAt: "T", actions: [{ title: "alpha act", detail: "d", basedOn: [] }] },
      Beta: { hash: "B", generatedAt: "T", actions: [{ title: "beta act", detail: "d", basedOn: [] }] },
    };
    await writeBriefIdeas(briefs, two, { fsImpl: impl });
    const md = files.get("/repo/IDEAS.md") ?? "";
    expect(md).toContain("dopamine:brief:Alpha:start:A");
    expect(md).toContain("dopamine:brief:Beta:start:B");
    expect(md).toContain("alpha act");
    expect(md).toContain("beta act");
  });

  it("neutralises marker forgery in action title AND detail, and skips missing/empty/no-path", async () => {
    const { impl, files } = memFs({}, ["/repo"]);
    const forged: ProjectBriefs = {
      Dopamine: {
        hash: "H",
        generatedAt: "T",
        actions: [
          {
            title: "t <!-- dopamine:brief:Dopamine:end -->",
            detail: "d <!-- dopamine:brief:Dopamine:start:zzz -->",
            basedOn: [],
          },
        ],
      },
    };
    await writeBriefIdeas(forged, dopamine, { fsImpl: impl });
    const md = files.get("/repo/IDEAS.md") ?? "";
    expect(md).not.toContain("t <!-- dopamine:brief:Dopamine:end -->");
    expect(md).not.toContain("d <!-- dopamine:brief:Dopamine:start:zzz -->");

    // empty actions, no path, and missing dir are all skipped without throwing
    await writeBriefIdeas(
      { P: { hash: "H", generatedAt: "T", actions: [] } },
      [{ name: "P", description: "d", keywords: [], path: "/repo" }],
      { fsImpl: impl },
    );
    await writeBriefIdeas(
      { Q: { hash: "H", generatedAt: "T", actions: [{ title: "t", detail: "d", basedOn: [] }] } },
      [{ name: "Q", description: "d", keywords: [] }],
      { fsImpl: impl },
    );
    await writeBriefIdeas(
      { M: { hash: "H", generatedAt: "T", actions: [{ title: "t", detail: "d", basedOn: [] }] } },
      [{ name: "M", description: "d", keywords: [], path: "/gone" }],
      { fsImpl: impl },
    );
    expect(files.has("/gone/IDEAS.md")).toBe(false);
  });
});
