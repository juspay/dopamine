import { describe, expect, it } from "vitest";
import { deriveTitle } from "../dashboard/title.js";

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
});
