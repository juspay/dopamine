// src/__tests__/source-attempts.test.ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type AttemptLedger,
  EMPTY_MAX_RECHECKS,
  EMPTY_RECHECK_DAYS,
  MAX_FAILURES,
  QUARANTINE_DAYS,
  isEligible,
  loadLedger,
  recordEmpty,
  recordFailure,
  recordSuccess,
  saveLedger,
} from "../sources/attempts.js";

const DAY = 86_400_000;
const T0 = new Date("2026-10-18T00:00:00Z");
const later = (ms: number) => new Date(T0.getTime() + ms);

describe("constants", () => {
  it("match the design: 5 failures, 30 days quarantine, 7 days between empty rechecks, 4 rechecks", () => {
    expect([MAX_FAILURES, QUARANTINE_DAYS, EMPTY_RECHECK_DAYS, EMPTY_MAX_RECHECKS]).toEqual([5, 30, 7, 4]);
  });
});

describe("recordFailure", () => {
  it("leaves the id eligible for failures 1 to 4 and quarantines it on the 5th", () => {
    let ledger: AttemptLedger = {};
    for (let n = 1; n <= 4; n++) {
      ledger = recordFailure(ledger, "a", new Error("boom"), later(n * 1000));
      expect(ledger.a).toMatchObject({ state: "failed", attempts: n, last_error: "boom" });
      expect(isEligible(ledger, "a", later(n * 1000))).toBe(true);
    }
    ledger = recordFailure(ledger, "a", new Error("boom"), T0);
    expect(ledger.a).toMatchObject({ state: "quarantined", attempts: 5 });
    expect(ledger.a.next_eligible).toBe(new Date(T0.getTime() + 30 * DAY).toISOString());
  });

  it("keeps only the first line of the error, at most 200 characters", () => {
    const ledger = recordFailure({}, "a", new Error(`first line\nsecond line ${"x".repeat(300)}`), T0);
    expect(ledger.a.last_error).toBe("first line");
    const long = recordFailure({}, "b", new Error("y".repeat(500)), T0);
    expect(long.b.last_error).toHaveLength(200);
  });

  it("accepts a thrown value that is not an Error", () => {
    expect(recordFailure({}, "a", "plain string", T0).a.last_error).toBe("plain string");
  });
});

describe("quarantine", () => {
  const quarantined = () => {
    let ledger: AttemptLedger = {};
    for (let n = 0; n < MAX_FAILURES; n++) ledger = recordFailure(ledger, "a", new Error("boom"), T0);
    return ledger;
  };

  it("is ineligible for 30 days and eligible after", () => {
    expect(isEligible(quarantined(), "a", later(29 * DAY))).toBe(false);
    expect(isEligible(quarantined(), "a", later(30 * DAY))).toBe(true);
    expect(isEligible(quarantined(), "a", later(31 * DAY))).toBe(true);
  });
});

describe("recordEmpty", () => {
  it("makes the id ineligible for 7 days", () => {
    const ledger = recordEmpty({}, "a", T0);
    expect(ledger.a).toMatchObject({ state: "empty", attempts: 1 });
    expect(isEligible(ledger, "a", later(6 * DAY))).toBe(false);
    expect(isEligible(ledger, "a", later(7 * DAY))).toBe(true);
  });

  it("quarantines after the 4th recheck, the 5th empty result", () => {
    let ledger: AttemptLedger = {};
    for (let n = 1; n <= 4; n++) {
      ledger = recordEmpty(ledger, "a", later(n * 8 * DAY));
      expect(ledger.a.state).toBe("empty");
    }
    ledger = recordEmpty(ledger, "a", later(5 * 8 * DAY));
    expect(ledger.a).toMatchObject({ state: "quarantined", attempts: 5 });
  });
});

describe("a quarantined item remembers what it was quarantined for", () => {
  const quarantinedByFailures = () => {
    let ledger: AttemptLedger = {};
    for (let n = 0; n < MAX_FAILURES; n++) ledger = recordFailure(ledger, "a", new Error("boom"), T0);
    return ledger;
  };

  it("after release, an empty result counts as a first empty result, not as a sixth attempt", () => {
    const ledger = recordEmpty(quarantinedByFailures(), "a", later(31 * DAY));
    expect(ledger.a).toMatchObject({ state: "empty", attempts: 1, kind: "empty" });
  });

  it("after release, a failure starts a fresh count instead of re-quarantining at once", () => {
    const ledger = recordFailure(quarantinedByFailures(), "a", new Error("again"), later(31 * DAY));
    expect(ledger.a).toMatchObject({ state: "failed", attempts: 1, kind: "failed" });
  });

  it("while still quarantined, a repeat keeps the item quarantined", () => {
    const ledger = recordFailure(quarantinedByFailures(), "a", new Error("again"), later(1 * DAY));
    expect(ledger.a.state).toBe("quarantined");
  });

  it("an empty streak that ends in quarantine keeps kind empty", () => {
    let ledger: AttemptLedger = {};
    for (let n = 1; n <= EMPTY_MAX_RECHECKS + 1; n++) ledger = recordEmpty(ledger, "a", later(n * 8 * DAY));
    expect(ledger.a).toMatchObject({ state: "quarantined", kind: "empty" });
  });
});

describe("recordSuccess", () => {
  it("removes the id", () => {
    const ledger = recordSuccess(recordFailure({}, "a", new Error("x"), T0), "a");
    expect(ledger).toEqual({});
    expect(isEligible(ledger, "a", T0)).toBe(true);
  });
});

describe("purity", () => {
  it("does not mutate the ledger it is given", () => {
    const before: AttemptLedger = recordFailure({}, "a", new Error("x"), T0);
    const snapshot = structuredClone(before);
    recordFailure(before, "a", new Error("y"), T0);
    recordEmpty(before, "b", T0);
    recordSuccess(before, "a");
    expect(before).toEqual(snapshot);
  });
});

describe("loadLedger and saveLedger", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "attempts-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("round-trips a ledger", async () => {
    const p = path.join(dir, "source_attempts.json");
    const ledger = recordFailure({}, "a", new Error("x"), T0);
    await saveLedger(ledger, p);
    expect(await loadLedger(p)).toEqual(ledger);
  });

  it("reads a missing, corrupt or non-object file as empty", async () => {
    const p = path.join(dir, "source_attempts.json");
    expect(await loadLedger(p)).toEqual({});
    await fs.writeFile(p, "{ not json", "utf8");
    expect(await loadLedger(p)).toEqual({});
    await fs.writeFile(p, "[1,2]", "utf8");
    expect(await loadLedger(p)).toEqual({});
  });
});
