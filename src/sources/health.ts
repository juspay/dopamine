// src/sources/health.ts
//
// When each source last worked, and whether it is failing now, so a source that has
// been down for more than a day raises an alert instead of failing quietly.
import { execa } from "execa";
import { CONFIG } from "../pipeline/config.js";
import { loadState, writeJsonAtomic } from "../pipeline/state.js";

export interface SourceHealth {
  last_success: string | null;
  last_failure: string | null;
  last_error: string | null;
  /** Start of the current run of failures; null while the source is healthy. */
  failing_since: string | null;
}

export type HealthFile = Record<string, SourceHealth>;

export type SourceOutcome = { ok: true } | { ok: false; error: string };

const HOUR_MS = 3_600_000;

export function recordSourceRun(h: HealthFile, source: string, outcome: SourceOutcome, now: Date): HealthFile {
  const prev: SourceHealth = h[source] ?? {
    last_success: null,
    last_failure: null,
    last_error: null,
    failing_since: null,
  };
  const stamp = now.toISOString();
  const next: SourceHealth = outcome.ok
    ? { ...prev, last_success: stamp, failing_since: null }
    : { ...prev, last_failure: stamp, last_error: outcome.error, failing_since: prev.failing_since ?? stamp };
  return { ...h, [source]: next };
}

/**
 * Sources whose latest run failed and that have not succeeded for more than `hours`.
 * A source that has never succeeded is measured from the start of its failures.
 */
export function failingSources(h: HealthFile, now: Date, hours = 24): string[] {
  return Object.entries(h)
    .filter(([, s]) => {
      if (s.failing_since === null) return false;
      const since = Date.parse(s.last_success ?? s.failing_since);
      return now.getTime() - since > hours * HOUR_MS;
    })
    .map(([source]) => source)
    .sort();
}

async function notify(message: string): Promise<void> {
  await execa("bash", ["scripts/notify-failure.sh", message], { reject: false });
}

/** One alert per failing source through the existing failure channel. Never throws. */
export async function alertFailing(
  sources: string[],
  send: (message: string) => Promise<void> = notify,
): Promise<void> {
  for (const source of sources) {
    try {
      await send(`Source ${source} has been failing for over 24h`);
    } catch (err) {
      console.error(`[health] could not send the alert for ${source}: ${String(err).split("\n")[0]}`);
    }
  }
}

export async function loadHealth(path: string = CONFIG.STATE.SOURCE_HEALTH): Promise<HealthFile> {
  const raw = await loadState<unknown>(path, {});
  return raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as HealthFile) : {};
}

export async function saveHealth(h: HealthFile, path: string = CONFIG.STATE.SOURCE_HEALTH): Promise<void> {
  await writeJsonAtomic(path, h);
}
