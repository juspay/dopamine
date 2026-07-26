import { describe, expect, it } from "vitest";
import { deriveTitle } from "../dashboard/title.js";
import { takeawayTitleText } from "../schemas/knowledge.js";

describe("deriveTitle", () => {
  it("prefers the catalog description", () => {
    expect(deriveTitle("Catalog desc", "Takeaway", "Class desc")).toBe("Catalog desc");
  });

  it("falls back to the first takeaway when catalog description is empty", () => {
    expect(deriveTitle("", "Takeaway", "Class desc")).toBe("Takeaway");
  });

  it("falls back to the classification description", () => {
    expect(deriveTitle(undefined, "", "Class desc")).toBe("Class desc");
  });

  it("returns (untitled) when everything is empty", () => {
    expect(deriveTitle(undefined, "", undefined)).toBe("(untitled)");
  });

  // Regression: real callers pass `takeawayTitleText(kbEntry?.key_takeaways?.[0])` as
  // the takeaway argument. When that first takeaway is timestamp-only (e.g. "0:00" with
  // an empty takeaway string — as produced for several videos in the store), the title
  // must fall through to the classification description instead of surfacing "[0:00] "
  // or landing on "(untitled)" when a better source exists.
  it("falls through past a timestamp-only, textless first takeaway to the classification description", () => {
    const firstTakeaway = takeawayTitleText({ timestamp: "0:00", takeaway: "" });
    expect(deriveTitle(undefined, firstTakeaway, "Class desc")).toBe("Class desc");
  });

  // Belt-and-suspenders: a source can carry an inline timestamp tag even without
  // going through takeawayText (e.g. the LLM wrote one directly into the takeaway
  // text, or a catalog/classification description happens to start with one).
  it("strips a leading [m:ss] timestamp tag from any source", () => {
    expect(deriveTitle("[0:00] Real title", "Takeaway", "Class desc")).toBe("Real title");
  });

  it("strips a leading [hh:mm:ss] timestamp tag", () => {
    expect(deriveTitle(undefined, "[00:00:10] Use the tool", "Class desc")).toBe("Use the tool");
  });

  it("strips a leading [start - end] timestamp range tag", () => {
    expect(deriveTitle(undefined, "[00:00 - 00:11] Use the tool", "Class desc")).toBe("Use the tool");
  });

  it("falls through when stripping the tag leaves nothing behind", () => {
    expect(deriveTitle(undefined, "[0:00]", "Class desc")).toBe("Class desc");
  });
});
