import { describe, it, expect } from "vitest";
import { normalizeToolUrl } from "../dashboard/data-builder.js";

describe("normalizeToolUrl", () => {
  it("keeps a valid http(s) URL as-is", () => {
    expect(normalizeToolUrl("https://openui.fly.dev/")).toBe("https://openui.fly.dev/");
    expect(normalizeToolUrl("http://example.com/x")).toBe("http://example.com/x");
  });

  it("upgrades a bare domain to https", () => {
    expect(normalizeToolUrl("notion.so")).toBe("https://notion.so");
    expect(normalizeToolUrl("calendly.com/x")).toBe("https://calendly.com/x");
  });

  it("takes only the first URL when several are packed into one field", () => {
    expect(
      normalizeToolUrl("https://www.instagram.com/testuser/, https://www.instagram.com/achieve"),
    ).toBe("https://www.instagram.com/testuser/");
    expect(normalizeToolUrl("https://stripe.com | https://paypal.com")).toBe(
      "https://stripe.com",
    );
  });

  it("drops ephemeral Google grounding-redirect links", () => {
    expect(
      normalizeToolUrl(
        "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE4HVqZ",
      ),
    ).toBe("");
  });

  it("drops free-text / non-URL strings", () => {
    expect(normalizeToolUrl("N/A: macOS only")).toBe("");
    expect(normalizeToolUrl("search for the tool on Google")).toBe("");
    expect(normalizeToolUrl("")).toBe("");
    expect(normalizeToolUrl(null)).toBe("");
  });

  it("preserves a single URL that legitimately contains commas in its query", () => {
    expect(normalizeToolUrl("https://maps.example.com/?q=12.9,77.5")).toBe(
      "https://maps.example.com/?q=12.9,77.5",
    );
  });
});
