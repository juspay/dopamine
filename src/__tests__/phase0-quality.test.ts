import { describe, expect, it } from "vitest";
import { parseBrief } from "../agents/project-brief.js";
import { CONFIDENCE_HIGH_Z, parseJudgement } from "../agents/project-mapper.js";
import { deriveTitle } from "../dashboard/title.js";
import { thinReasonFor } from "../dashboard/data-builder.js";
import { briefSourceCount, isExploratoryAction } from "../schemas/brief.js";

/** parseJudgement with every candidate scored into `high`, so these cases
 *  exercise reason quality and recall rather than confidence derivation — that
 *  lives in confidence-from-score.test.ts. */
const judged = (judge: unknown, names: string[]) =>
  parseJudgement(judge, names, Object.fromEntries(names.map((n) => [n, CONFIDENCE_HIGH_Z])));

describe("thinReasonFor", () => {
  it("blames the classifier when classification itself errored", () => {
    expect(thinReasonFor({ error: "InvalidModelError" }, undefined)).toBe("classification-failed");
    // classification error wins even if knowledge also looks empty
    expect(thinReasonFor({ error: "boom" }, { low_content: true })).toBe("classification-failed");
  });
  it("reports never-extracted when there is no knowledge entry at all", () => {
    expect(thinReasonFor({}, undefined)).toBe("not-extracted");
  });
  it("reports an empty extraction for low_content or a knowledge error", () => {
    expect(thinReasonFor({}, { low_content: true })).toBe("extraction-empty");
    expect(thinReasonFor({}, { error: "timeout" })).toBe("extraction-empty");
  });
  it("falls back to low-signal when everything ran but the content is thin", () => {
    expect(thinReasonFor({}, {})).toBe("low-signal");
  });
});

describe("brief provenance", () => {
  const known = new Set(["v1", "v2"]);

  it("marks a single-source action exploratory and a corroborated one not", () => {
    const out = parseBrief(
      {
        actions: [
          { title: "one", detail: "d", basedOn: ["v1"] },
          { title: "two", detail: "d", basedOn: ["v1", "v2"] },
        ],
      },
      known,
    );
    expect(out[0].exploratory).toBe(true);
    expect(out[1].exploratory).toBe(false);
  });

  it("treats duplicate ids as a single source", () => {
    const out = parseBrief({ actions: [{ title: "t", detail: "d", basedOn: ["v1", "v1"] }] }, known);
    expect(out[0].basedOn).toEqual(["v1"]);
    expect(out[0].exploratory).toBe(true);
  });

  it("isExploratoryAction falls back to basedOn for briefs predating the flag", () => {
    expect(isExploratoryAction({ basedOn: ["v1"] })).toBe(true);
    expect(isExploratoryAction({ basedOn: ["v1", "v2"] })).toBe(false);
    // an explicit flag always wins over the fallback
    expect(isExploratoryAction({ basedOn: ["v1", "v2"], exploratory: true })).toBe(true);
  });

  it("briefSourceCount prefers the stamped count and otherwise unions the actions", () => {
    const actions = [
      { title: "a", detail: "d", basedOn: ["v1"] },
      { title: "b", detail: "d", basedOn: ["v1", "v2"] },
    ];
    expect(briefSourceCount({ actions, sourceCount: 7 })).toBe(7);
    expect(briefSourceCount({ actions })).toBe(2); // v1 counted once
  });
});

describe("deriveTitle hardening", () => {
  it("strips a timestamp tag even behind leading whitespace or a newline", () => {
    expect(deriveTitle("  [0:05] Real title", "t", "c")).toBe("Real title");
    expect(deriveTitle("\n[00:00:10] Real title", "t", "c")).toBe("Real title");
  });
  it("strips stacked tags", () => {
    expect(deriveTitle("[0:00] [0:05] Real title", "t", "c")).toBe("Real title");
  });
  it("falls through when a source is only a tag", () => {
    expect(deriveTitle("  [0:00]  ", "", "Class desc")).toBe("Class desc");
  });
  it("leaves non-timestamp bracketed text alone", () => {
    expect(deriveTitle("[Tutorial] Build a CLI", "t", "c")).toBe("[Tutorial] Build a CLI");
  });
});

describe("parseJudgement reason quality", () => {
  const j = (reason: string) => ({ results: [{ project: "P", applies: true, confidence: "high", reason }] });

  it("keeps a terse but real two-word reason", () => {
    expect(judged(j("Same tech"), ["P"])[0].reason).toBe("Same tech");
  });
  it("rejects an empty or single-word reason", () => {
    expect(judged(j(""), ["P"])).toEqual([]);
    expect(judged(j("Can"), ["P"])).toEqual([]);
  });
  it("truncates on a word boundary, never mid-word", () => {
    const long = `${"word ".repeat(40)}end`;
    const out = judged(j(long), ["P"])[0].reason;
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/); // would indicate a mid-word cut
    expect(out.length).toBeLessThanOrEqual(141);
  });
  it("does not split an astral character across the cut", () => {
    const out = judged(j(`${"a".repeat(138)}🎉 tail`), ["P"])[0].reason;
    // A lone surrogate would make the string non-round-trippable.
    expect([...out].every((ch) => ch.codePointAt(0) !== undefined)).toBe(true);
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(out)).toBe(false);
  });
  it("lets the first verdict for a project win over a later duplicate", () => {
    const out = judged(
      {
        results: [
          { project: "P", applies: true, confidence: "high", reason: "Can" },
          { project: "P", applies: true, confidence: "low", reason: "a plausible sounding rationale" },
        ],
      },
      ["P"],
    );
    expect(out).toEqual([]); // degenerate first answer is not replaced by a later one
  });
});

describe("thinReasonFor content awareness", () => {
  it("does not call an errored-but-substantial entry empty", () => {
    expect(thinReasonFor({}, { error: "timeout", transcript: "a real transcript" })).toBe("low-signal");
    expect(thinReasonFor({}, { error: "timeout", key_takeaways: [{ takeaway: "x" }] })).toBe("low-signal");
  });
  it("still calls an errored, contentless entry empty", () => {
    expect(thinReasonFor({}, { error: "timeout", transcript: "   " })).toBe("extraction-empty");
  });
});

describe("parseJudgement lone-token reasons", () => {
  const j = (reason: string) => ({ results: [{ project: "P", applies: true, confidence: "high", reason }] });

  it("rejects a short lone token but keeps a substantive one", () => {
    expect(judged(j("Can"), ["P"])).toEqual([]);
    expect(judged(j("authentication-middleware-reuse"), ["P"])).toHaveLength(1);
  });
});

describe("parseJudgement resilience (recall)", () => {
  const good = { project: "A", applies: true, confidence: "high", reason: "shares the scraping stack" };
  const malformed = { project: "B", applies: true }; // truncated: no confidence/reason

  it("keeps a valid verdict even when a sibling verdict is malformed", () => {
    // Regression: the whole-object schema discarded every verdict when one was
    // malformed, losing ~93% of the judge's positive answers.
    const out = judged({ results: [good, malformed] }, ["A", "B"]);
    expect(out).toHaveLength(1);
    expect(out[0].project).toBe("A");
  });

  it("keeps a valid verdict that follows a malformed one", () => {
    expect(judged({ results: [malformed, good] }, ["A", "B"])).toHaveLength(1);
  });

  it("returns nothing for a non-array or absent results payload", () => {
    expect(judged({ results: "nope" }, ["A"])).toEqual([]);
    expect(judged({}, ["A"])).toEqual([]);
    expect(judged(null, ["A"])).toEqual([]);
  });
});
