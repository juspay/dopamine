import { describe, it, expect } from "vitest";
import {
  isKnowledgeComplete,
  mergeKnowledge,
  pickLonger,
  pickMore,
} from "../agents/knowledge-merge.js";
import type { Knowledge } from "../schemas/knowledge.js";

const MIN = 200;

/** Build a Knowledge object with overrides. */
function kn(over: Partial<Knowledge> = {}): Knowledge {
  return {
    transcript: "",
    visual_description: "",
    links_and_resources: [],
    key_takeaways: [],
    topics: [],
    ...over,
  };
}

const rich = "x".repeat(250);
const thin = "x".repeat(50);

describe("isKnowledgeComplete", () => {
  it("treats an entry with rich visual + 3 takeaways as complete", () => {
    expect(
      isKnowledgeComplete(
        { visual_description: rich, key_takeaways: [1, 2, 3] },
        MIN,
      ),
    ).toBe(true);
  });

  it("THE BUG: entry with good transcript but EMPTY visual is NOT complete", () => {
    // This is the exact case the old skip-check missed: transcript + takeaways
    // present, visual empty -> must be re-extracted, not skipped.
    expect(
      isKnowledgeComplete(
        { visual_description: "", key_takeaways: [1, 2, 3, 4, 5] },
        MIN,
      ),
    ).toBe(false);
  });

  it("entry with thin visual (< min) is NOT complete", () => {
    expect(
      isKnowledgeComplete({ visual_description: thin, key_takeaways: [1, 2, 3] }, MIN),
    ).toBe(false);
  });

  it("entry with rich visual but < 3 takeaways is NOT complete", () => {
    expect(
      isKnowledgeComplete({ visual_description: rich, key_takeaways: [1] }, MIN),
    ).toBe(false);
  });

  it("entry carrying an error is never complete (retryable)", () => {
    expect(
      isKnowledgeComplete(
        { visual_description: rich, key_takeaways: [1, 2, 3], error: "boom" },
        MIN,
      ),
    ).toBe(false);
  });

  it("undefined entry is not complete", () => {
    expect(isKnowledgeComplete(undefined, MIN)).toBe(false);
  });

  it("ignores leading/trailing whitespace when measuring visual length", () => {
    expect(
      isKnowledgeComplete(
        { visual_description: "   " + "y".repeat(10) + "   ", key_takeaways: [1, 2, 3] },
        MIN,
      ),
    ).toBe(false);
  });
});

describe("pickLonger", () => {
  it("keeps the previous value when the new one is blank", () => {
    expect(pickLonger("", "kept")).toBe("kept");
    expect(pickLonger("   ", "kept")).toBe("kept");
  });
  it("takes the new value when previous is empty/undefined", () => {
    expect(pickLonger("fresh", "")).toBe("fresh");
    expect(pickLonger("fresh", undefined)).toBe("fresh");
  });
  it("keeps whichever is longer", () => {
    expect(pickLonger("short", "a much longer previous string")).toBe(
      "a much longer previous string",
    );
    expect(pickLonger("a much longer fresh string", "short")).toBe(
      "a much longer fresh string",
    );
  });
});

describe("pickMore", () => {
  it("keeps the array with more items", () => {
    expect(pickMore([1], [1, 2, 3])).toEqual([1, 2, 3]);
    expect(pickMore([1, 2, 3], [1])).toEqual([1, 2, 3]);
  });
  it("handles undefined inputs", () => {
    expect(pickMore(undefined, [1])).toEqual([1]);
    expect(pickMore([1], undefined)).toEqual([1]);
    expect(pickMore(undefined, undefined)).toEqual([]);
  });
  it("treats a non-array (e.g. string) as empty rather than crashing", () => {
    expect(pickMore("oops" as unknown, [1, 2])).toEqual([1, 2]);
  });
});

describe("legacy non-string fields (the mid-run crash)", () => {
  // Old entries ported from Python stored transcript/visual as arrays.
  // pickLonger must coerce, not call .trim() on an array.
  it("pickLonger handles an array prev without throwing", () => {
    expect(() => pickLonger("new", ["line1", "line2"] as unknown)).not.toThrow();
    // array joins to "line1\nline2" (11 chars) vs "new" (3) -> array wins
    expect(pickLonger("new", ["line1", "line2"] as unknown)).toBe("line1\nline2");
  });
  it("pickLonger handles a numeric prev", () => {
    expect(pickLonger("hello", 12345 as unknown)).toBe("hello");
  });
  it("isKnowledgeComplete coerces an array visual_description", () => {
    const longArr = Array.from({ length: 10 }, () => "x".repeat(30)); // joins to ~300+ chars
    expect(
      isKnowledgeComplete(
        { visual_description: longArr, key_takeaways: [1, 2, 3] },
        MIN,
      ),
    ).toBe(true);
  });
  it("mergeKnowledge survives array-typed existing fields", () => {
    const existing = {
      transcript: ["spoken line one", "spoken line two"],
      visual_description: [],
    } as unknown as Partial<Knowledge>;
    const next = kn({ transcript: "x", visual_description: rich });
    expect(() => mergeKnowledge(next, existing)).not.toThrow();
    const merged = mergeKnowledge(next, existing);
    expect(merged.visual_description).toBe(rich);
    expect(merged.transcript).toBe("spoken line one\nspoken line two");
  });
});

describe("mergeKnowledge — non-regression", () => {
  it("recovers an empty visual_description from the fresh extraction", () => {
    const existing = kn({ transcript: "old transcript", visual_description: "" });
    const next = kn({ transcript: "", visual_description: rich, topics: ["a", "b"] });
    const merged = mergeKnowledge(next, existing);
    expect(merged.visual_description).toBe(rich);
    // transcript preserved from existing (next had none)
    expect(merged.transcript).toBe("old transcript");
    expect(merged.topics).toEqual(["a", "b"]);
  });

  it("PROTECTS a rich audio transcript from a shorter frames-only transcript", () => {
    // duodevlogs case: existing has a 6396-char transcript, frames re-extraction
    // returns a short on-screen-text transcript. The long one must survive.
    const longTranscript = "speech ".repeat(1000);
    const existing = kn({ transcript: longTranscript, visual_description: thin });
    const next = kn({
      transcript: "on-screen text only",
      visual_description: rich,
    });
    const merged = mergeKnowledge(next, existing);
    expect(merged.transcript).toBe(longTranscript); // not regressed
    expect(merged.visual_description).toBe(rich); // visual upgraded
  });

  it("never drops takeaways/links when the fresh extraction has fewer", () => {
    const existing = kn({
      key_takeaways: ["a", "b", "c", "d", "e", "f", "g"],
      links_and_resources: [
        { url: "u1", description: "d1", timestamp: "0:01" },
        { url: "u2", description: "d2", timestamp: "0:02" },
      ],
    });
    const next = kn({
      key_takeaways: ["x"],
      links_and_resources: [{ url: "u3", description: "d3", timestamp: "0:03" }],
    });
    const merged = mergeKnowledge(next, existing);
    expect(merged.key_takeaways).toHaveLength(7);
    expect(merged.links_and_resources).toHaveLength(2);
  });

  it("first-time extraction (no existing) just returns the fresh content", () => {
    const next = kn({ transcript: "t", visual_description: rich, topics: ["z"] });
    const merged = mergeKnowledge(next, undefined);
    expect(merged.visual_description).toBe(rich);
    expect(merged.transcript).toBe("t");
    expect(merged.topics).toEqual(["z"]);
  });

  it("a recovered entry then satisfies isKnowledgeComplete", () => {
    const existing = kn({ transcript: "old", visual_description: "", key_takeaways: ["1"] });
    const next = kn({ visual_description: rich, key_takeaways: ["a", "b", "c"] });
    const merged = mergeKnowledge(next, existing);
    expect(isKnowledgeComplete(merged, MIN)).toBe(true);
  });
});
