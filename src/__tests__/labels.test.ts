import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EMPTY_LABELS,
  type LabelsFile,
  isEmptyLabel,
  isValidVideoId,
  removeLabel,
  upsertLabel,
} from "../schemas/label.js";
import { loadLabels, saveLabels } from "../server/labels-store.js";

const NOW = "2026-08-02T00:00:00.000Z";

describe("upsertLabel", () => {
  it("creates a label with defaults", () => {
    const f = upsertLabel(EMPTY_LABELS, "v1", { projects: ["Shooter"] }, NOW);
    expect(f.labels.v1).toEqual({ projects: ["Shooter"], tags: [], verdict: "applies", note: "", updatedAt: NOW });
  });

  it("leaves untouched fields alone — editing tags must not clear projects", () => {
    const a = upsertLabel(EMPTY_LABELS, "v1", { projects: ["Yama"], note: "keep me" }, NOW);
    const b = upsertLabel(a, "v1", { tags: ["infra"] }, "later");
    expect(b.labels.v1.projects).toEqual(["Yama"]);
    expect(b.labels.v1.note).toBe("keep me");
    expect(b.labels.v1.tags).toEqual(["infra"]);
  });

  it("clears projects only when explicitly given an empty array", () => {
    const a = upsertLabel(EMPTY_LABELS, "v1", { projects: ["Yama"] }, NOW);
    expect(upsertLabel(a, "v1", { projects: [] }, NOW).labels.v1.projects).toEqual([]);
  });

  it("dedupes and trims, so double-clicking a chip cannot double-count a verdict", () => {
    const f = upsertLabel(EMPTY_LABELS, "v1", { projects: ["Yama", " Yama ", "Vokal"], tags: ["a", "a"] }, NOW);
    expect(f.labels.v1.projects).toEqual(["Yama", "Vokal"]);
    expect(f.labels.v1.tags).toEqual(["a"]);
  });

  it("records a 'none' verdict — a confirmed non-match is data, not an absence", () => {
    const f = upsertLabel(EMPTY_LABELS, "v1", { verdict: "none" }, NOW);
    expect(f.labels.v1.verdict).toBe("none");
    expect(isEmptyLabel(f.labels.v1)).toBe(false);
  });

  it("does not mutate the input", () => {
    const before: LabelsFile = { version: 1, labels: {} };
    upsertLabel(before, "v1", { projects: ["X"] }, NOW);
    expect(before.labels).toEqual({});
  });
});

describe("isEmptyLabel", () => {
  it("treats an all-defaults label as an accidental click", () => {
    expect(isEmptyLabel({ projects: [], tags: [], verdict: "applies", note: "  ", updatedAt: NOW })).toBe(true);
  });
  it("treats any real content as a verdict", () => {
    expect(isEmptyLabel({ projects: ["A"], tags: [], verdict: "applies", note: "", updatedAt: NOW })).toBe(false);
    expect(isEmptyLabel({ projects: [], tags: ["t"], verdict: "applies", note: "", updatedAt: NOW })).toBe(false);
  });
});

describe("removeLabel", () => {
  it("drops the entry and returns the same object when absent", () => {
    const a = upsertLabel(EMPTY_LABELS, "v1", { projects: ["X"] }, NOW);
    expect(removeLabel(a, "v1").labels).toEqual({});
    const b: LabelsFile = { version: 1, labels: {} };
    expect(removeLabel(b, "nope")).toBe(b);
  });
});

describe("isValidVideoId", () => {
  it("accepts real corpus ids and rejects path-ish or empty input", () => {
    expect(isValidVideoId("creator_123456789")).toBe(true);
    expect(isValidVideoId("a.b-c_d")).toBe(true);
    expect(isValidVideoId("")).toBe(false);
    expect(isValidVideoId("../../etc/passwd")).toBe(false);
    expect(isValidVideoId("has space")).toBe(false);
    expect(isValidVideoId("x".repeat(201))).toBe(false);
  });

  it("rejects ids that mean something to Object", () => {
    // These match the character class, so only an explicit check stops them.
    // "toString" is the one that bites: labels["toString"] is a FUNCTION, so an
    // unwritten label would read back as present.
    for (const id of ["__proto__", "constructor", "prototype", "toString", "hasOwnProperty", "valueOf"]) {
      expect(isValidVideoId(id)).toBe(false);
    }
  });
});

describe("prototype-chain safety", () => {
  it("does not report an unwritten label as existing", () => {
    // The bug this guards: `id in labels` and `labels[id]` both consult the
    // prototype chain, so "toString" looks present in an empty label set.
    expect(removeLabel(EMPTY_LABELS, "toString")).toBe(EMPTY_LABELS);
    const f = upsertLabel(EMPTY_LABELS, "v1", { projects: ["A"] }, NOW);
    expect(Object.keys(f.labels)).toEqual(["v1"]);
  });

  it("never pollutes Object.prototype even if a reserved id reaches upsert", () => {
    // Defence in depth: the API rejects these before they get here, but a
    // computed key must define an own property rather than reach the prototype.
    const f = upsertLabel(EMPTY_LABELS, "__proto__", { projects: ["X"] }, NOW);
    expect(Object.hasOwn(f.labels, "__proto__")).toBe(true);
    expect(({} as Record<string, unknown>).projects).toBeUndefined();
  });
});

let dir: string | undefined;
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("labels store", () => {
  it("round-trips through disk", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "labels-"));
    const file = path.join(dir, "labels.json");
    const data = upsertLabel(EMPTY_LABELS, "v1", { projects: ["Shooter"], tags: ["t"] }, NOW);
    await saveLabels(data, file);
    expect(await loadLabels(file)).toEqual(data);
  });

  it("treats a missing file as first run, not an error", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "labels-"));
    expect(await loadLabels(path.join(dir, "nope.json"))).toEqual(EMPTY_LABELS);
  });

  it("REFUSES to read a corrupt file rather than reporting it as empty", async () => {
    // Returning empty here would look like "no labels yet", and the next save
    // would overwrite hand-made verdicts that no pipeline step can regenerate.
    dir = await mkdtemp(path.join(tmpdir(), "labels-"));
    const file = path.join(dir, "labels.json");
    await writeFile(file, JSON.stringify({ version: 1, labels: { v1: { projects: "not-an-array" } } }));
    await expect(loadLabels(file)).rejects.toThrow(/unreadable/);
  });
});
