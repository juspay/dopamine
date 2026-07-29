import { describe, expect, it } from "vitest";
import { isHost } from "../agents/researcher.js";

describe("isHost", () => {
  it("matches the host itself and its subdomains", () => {
    expect(isHost("https://npmjs.com/package/zod", "npmjs.com")).toBe(true);
    expect(isHost("https://www.npmjs.com/package/zod", "npmjs.com")).toBe(true);
    expect(isHost("https://registry.npmjs.org/zod", "npmjs.org")).toBe(true);
    expect(isHost("https://github.com/colinhacks/zod", "github.com")).toBe(true);
  });

  it("is not fooled by the host name appearing elsewhere in the URL", () => {
    // The substring check this replaced said yes to every one of these.
    expect(isHost("https://evil.example/npmjs.com", "npmjs.com")).toBe(false);
    expect(isHost("https://evil.example/?q=pypi.org", "pypi.org")).toBe(false);
    expect(isHost("https://github.com.evil.example/x", "github.com")).toBe(false);
    expect(isHost("https://notgithub.com/x/y", "github.com")).toBe(false);
  });

  it("treats missing or unparseable input as no match rather than throwing", () => {
    expect(isHost(null, "github.com")).toBe(false);
    expect(isHost(undefined, "github.com")).toBe(false);
    expect(isHost("", "github.com")).toBe(false);
    expect(isHost("not a url", "github.com")).toBe(false);
  });
});
