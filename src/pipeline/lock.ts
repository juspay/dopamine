import fs from "node:fs";

const STALE_MS = 10 * 60 * 1000;

/**
 * mkdir-based advisory lock so a manual run can't race a scheduled pipeline run.
 * mkdir is atomic; a lock older than STALE_MS is reclaimed (a killed run can't
 * release its own lock). Returns false when another live run holds it.
 */
export function acquireLock(lockPath: string, staleMs = STALE_MS): boolean {
  try {
    fs.mkdirSync(lockPath);
    return true;
  } catch {
    try {
      if (Date.now() - fs.statSync(lockPath).mtimeMs > staleMs) {
        fs.rmdirSync(lockPath);
        fs.mkdirSync(lockPath);
        return true;
      }
    } catch {
      // raced with another process — treat as locked
    }
    return false;
  }
}

export function releaseLock(lockPath: string): void {
  try {
    fs.rmdirSync(lockPath);
  } catch {
    // already gone — nothing to release
  }
}
