// src/__tests__/registry.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("../sources/instagram/collector.js", () => ({
  makeInstagramCollector: vi.fn(() => ({ source: "instagram" as const, collect: vi.fn(), acquire: vi.fn() })),
}));
vi.mock("../sources/youtube/collector.js", () => ({
  makeYoutubeCollector: vi.fn(() => ({ source: "youtube" as const, collect: vi.fn(), acquire: vi.fn() })),
}));

import { getEnabledCollectors } from "../sources/registry.js";

describe("getEnabledCollectors", () => {
  it("defaults to [instagram] when undefined", () => {
    const c = getEnabledCollectors(undefined);
    expect(c.map((x) => x.source)).toEqual(["instagram"]);
  });
  it("returns both for 'instagram,youtube'", () => {
    expect(getEnabledCollectors("instagram,youtube").map((x) => x.source).sort()).toEqual(["instagram", "youtube"]);
  });
  it("trims whitespace and dedupes repeats", () => {
    expect(getEnabledCollectors(" instagram , instagram ").map((x) => x.source)).toEqual(["instagram"]);
  });
  it("ignores unknown tokens with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const c = getEnabledCollectors("instagram,tiktok");
    expect(c.map((x) => x.source)).toEqual(["instagram"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("tiktok"));
    warn.mockRestore();
  });
  it("defaults to [instagram] when empty string", () => {
    expect(getEnabledCollectors("").map((x) => x.source)).toEqual(["instagram"]);
  });
});
