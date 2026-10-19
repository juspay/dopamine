// src/__tests__/registry-kinds.test.ts
import { describe, expect, it } from "vitest";
import { SOURCE_FACTORIES } from "../sources/registry.js";
import { SOURCE_KINDS } from "../types/index.js";

describe("source registry", () => {
  it("has a factory for every source kind", () => {
    for (const kind of SOURCE_KINDS) expect(typeof SOURCE_FACTORIES[kind]).toBe("function");
  });

  it("has no factory for a kind that is not listed", () => {
    expect(Object.keys(SOURCE_FACTORIES).sort()).toEqual([...SOURCE_KINDS].sort());
  });
});
