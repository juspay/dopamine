// src/__tests__/instagram-collector.test.ts
import { describe, it, expect } from "vitest";
import { describeScriptFailure } from "../sources/instagram/collector.js";

describe("describeScriptFailure", () => {
  it("flags a timed-out run as an Instagram throttle/soft-block, with the minutes", () => {
    const msg = describeScriptFailure("scripts/collect_metadata.py", { timedOut: true }, 11 * 60 * 1000);
    expect(msg).toContain("scripts/collect_metadata.py");
    expect(msg).toContain("~11 min");
    expect(msg).toMatch(/throttl|soft-block/i);
    expect(msg).toContain("ig_login.py");
  });

  it("rounds the timeout to whole minutes", () => {
    const msg = describeScriptFailure("s.py", { timedOut: true }, 45 * 60 * 1000);
    expect(msg).toContain("~45 min");
  });

  it("reports the exit code for a normal non-zero exit (not a timeout)", () => {
    const msg = describeScriptFailure("scripts/download_videos.py", { exitCode: 1, timedOut: false }, 660_000);
    expect(msg).toContain("exited with code 1");
    expect(msg).not.toMatch(/throttl|soft-block/i);
  });

  it("says 'unknown' when the error carries no exit code", () => {
    expect(describeScriptFailure("s.py", {}, 660_000)).toContain("exited with code unknown");
  });

  it("handles non-object errors without throwing", () => {
    expect(describeScriptFailure("s.py", null, 660_000)).toContain("exited with code unknown");
    expect(describeScriptFailure("s.py", "boom", 660_000)).toContain("exited with code unknown");
  });
});
