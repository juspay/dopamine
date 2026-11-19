// src/__tests__/youtube-doctor.test.ts
import { describe, expect, it } from "vitest";
import { type Check, classifyProbe, verdict } from "../sources/youtube/doctor.js";

describe("classifyProbe", () => {
  it("counts any answer below 500 as reachable: a 403 or 404 still proves the host answers", () => {
    expect(classifyProbe({ status: 200 })).toBe("ok");
    expect(classifyProbe({ status: 403 })).toBe("ok");
    expect(classifyProbe({ status: 404 })).toBe("ok");
    expect(classifyProbe({ status: 502 })).toBe("http_error");
  });
  it("names a reset, a timeout and a DNS failure", () => {
    expect(classifyProbe({ error: "read ECONNRESET" })).toBe("reset");
    expect(classifyProbe({ error: "The operation was aborted due to timeout" })).toBe("timeout");
    expect(classifyProbe({ error: "getaddrinfo ENOTFOUND www.youtube.com" })).toBe("dns");
    expect(classifyProbe({ error: "something else" })).toBe("unreachable");
  });
});

describe("verdict", () => {
  const check = (over: Partial<Check>): Check => ({
    api: "ok",
    webDefault: "ok",
    webEgress: null,
    ytDlp: "2026.10.26",
    credentials: true,
    refreshToken: "ok",
    cookies: "ok",
    ...over,
  });

  it("is ready when everything answers", () => {
    expect(verdict(check({}))).toEqual({ ready: true, problems: [] });
  });

  it("is ready when youtube.com is blocked on the default route but the egress interface reaches it", () => {
    expect(verdict(check({ webDefault: "reset", webEgress: "ok" })).ready).toBe(true);
  });

  it("explains a blocked network and how to get around it", () => {
    const v = verdict(check({ webDefault: "reset", webEgress: null }));
    expect(v.ready).toBe(false);
    expect(v.problems.join(" ")).toMatch(/DOPAMINE_EGRESS_INTERFACE/);
  });

  it("lists each missing piece: yt-dlp, credentials, refresh token", () => {
    const v = verdict(check({ ytDlp: null, credentials: false, refreshToken: "missing" }));
    expect(v.ready).toBe(false);
    expect(v.problems).toHaveLength(3);
    expect(v.problems.join(" ")).toMatch(/yt-dlp/);
    expect(v.problems.join(" ")).toMatch(/youtube:auth/);
  });

  it("says to log in again when Google rejects the token, as it does weekly in Testing mode", () => {
    const v = verdict(check({ refreshToken: "rejected" }));
    expect(v.ready).toBe(false);
    expect(v.problems.join(" ")).toMatch(/rejected.*youtube:auth/);
  });

  it("treats cookie trouble as a note, since only Watch Later needs them", () => {
    const v = verdict(check({ cookies: "missing" }));
    expect(v.ready).toBe(true);
    expect(v.problems.join(" ")).toMatch(/Watch Later/);
  });
});
