// src/__tests__/source-health.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { alertFailing, failingSources, loadHealth, recordSourceRun, saveHealth } from "../sources/health.js";

const HOUR = 3_600_000;
const T0 = new Date("2026-10-18T00:00:00Z");
const at = (hours: number) => new Date(T0.getTime() + hours * HOUR);

describe("recordSourceRun", () => {
  it("records a success and clears a failing streak", () => {
    let h = recordSourceRun({}, "youtube", { ok: false, error: "boom" }, T0);
    h = recordSourceRun(h, "youtube", { ok: true }, at(1));
    expect(h.youtube).toMatchObject({ last_success: at(1).toISOString(), failing_since: null });
    expect(failingSources(h, at(100))).toEqual([]);
  });

  it("keeps the start of a failing streak across repeated failures", () => {
    let h = recordSourceRun({}, "youtube", { ok: true }, T0);
    h = recordSourceRun(h, "youtube", { ok: false, error: "first" }, at(1));
    h = recordSourceRun(h, "youtube", { ok: false, error: "second" }, at(5));
    expect(h.youtube).toMatchObject({
      failing_since: at(1).toISOString(),
      last_failure: at(5).toISOString(),
      last_error: "second",
    });
  });

  it("does not mutate the file it is given", () => {
    const before = recordSourceRun({}, "x", { ok: true }, T0);
    const snapshot = structuredClone(before);
    recordSourceRun(before, "x", { ok: false, error: "e" }, at(1));
    expect(before).toEqual(snapshot);
  });
});

describe("failingSources", () => {
  const failedAfterSuccess = (hours: number) => {
    let h = recordSourceRun({}, "youtube", { ok: true }, T0);
    h = recordSourceRun(h, "youtube", { ok: false, error: "e" }, at(hours));
    return h;
  };

  it("lists a source whose last success is more than 24 hours old and whose latest run failed", () => {
    expect(failingSources(failedAfterSuccess(25), at(25))).toEqual(["youtube"]);
  });

  it("does not list one that last succeeded 23 hours ago", () => {
    expect(failingSources(failedAfterSuccess(23), at(23))).toEqual([]);
  });

  it("lists a source that never succeeded once it has been failing for more than 24 hours", () => {
    let h = recordSourceRun({}, "x", { ok: false, error: "e" }, T0);
    expect(failingSources(h, at(23))).toEqual([]);
    h = recordSourceRun(h, "x", { ok: false, error: "e" }, at(25));
    expect(failingSources(h, at(25))).toEqual(["x"]);
  });

  it("honours a different threshold and returns names sorted", () => {
    let h = recordSourceRun({}, "youtube", { ok: false, error: "e" }, T0);
    h = recordSourceRun(h, "x", { ok: false, error: "e" }, T0);
    expect(failingSources(h, at(3), 2)).toEqual(["x", "youtube"]);
  });
});

describe("alertFailing", () => {
  it("sends one message per failing source", async () => {
    const send = vi.fn(async (_message: string) => {});
    await alertFailing(["youtube", "x"], send);
    expect(send.mock.calls.map((c) => c[0])).toEqual([
      "Source youtube has been failing for over 24h",
      "Source x has been failing for over 24h",
    ]);
  });

  it("never throws even when sending fails", async () => {
    const send = vi.fn(async () => {
      throw new Error("no notifier");
    });
    await expect(alertFailing(["youtube"], send)).resolves.toBeUndefined();
  });
});

describe("loadHealth and saveHealth", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "health-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("round-trips and reads a missing or corrupt file as empty", async () => {
    const p = path.join(dir, "source_health.json");
    expect(await loadHealth(p)).toEqual({});
    const h = recordSourceRun({}, "youtube", { ok: true }, T0);
    await saveHealth(h, p);
    expect(await loadHealth(p)).toEqual(h);
    await fs.writeFile(p, "[oops", "utf8");
    expect(await loadHealth(p)).toEqual({});
  });
});
