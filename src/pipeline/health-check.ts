import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthCheckResult {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  details?: unknown;
}

export interface HealthReport {
  timestamp: string;
  overall: "healthy" | "degraded" | "unhealthy";
  checks: HealthCheckResult[];
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

async function checkStateFile(label: string, filePath: string): Promise<HealthCheckResult> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    const isArray = Array.isArray(data);
    const count = isArray ? data.length : Object.keys(data).length;
    return {
      name: `state:${label}`,
      status: "pass",
      message: `Valid JSON — ${count} ${isArray ? "items" : "keys"}`,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { name: `state:${label}`, status: "fail", message: "File does not exist" };
    }
    return { name: `state:${label}`, status: "fail", message: `Invalid JSON: ${String(err).slice(0, 200)}` };
  }
}

async function checkStateFiles(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];
  const stateEntries = Object.entries(CONFIG.STATE) as [string, string][];
  for (const [label, filePath] of stateEntries) {
    results.push(await checkStateFile(label, filePath));
  }
  return results;
}

async function countJsonArray(filePath: string): Promise<number | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data.length;
    if (typeof data === "object" && data !== null) return Object.keys(data).length;
    return null;
  } catch {
    return null;
  }
}

async function checkVideoCounts(): Promise<HealthCheckResult> {
  const propCount = await countJsonArray(CONFIG.STATE.PROPERTIES);
  const classCount = await countJsonArray(CONFIG.STATE.CLASSIFICATIONS);
  const catCount = await countJsonArray(CONFIG.STATE.CATALOG);

  const counts: Record<string, number | null> = {
    properties: propCount,
    classifications: classCount,
    catalog: catCount,
  };

  const available = Object.entries(counts).filter(([, v]) => v !== null) as [string, number][];
  if (available.length < 2) {
    return {
      name: "consistency:video-counts",
      status: "warn",
      message: "Not enough state files to compare counts",
      details: counts,
    };
  }

  const values = available.map(([, v]) => v);
  const allMatch = values.every(v => v === values[0]);
  if (allMatch) {
    return {
      name: "consistency:video-counts",
      status: "pass",
      message: `Counts match across ${available.length} files (${values[0]} items)`,
      details: counts,
    };
  }

  return {
    name: "consistency:video-counts",
    status: "warn",
    message: "Video counts differ across state files",
    details: counts,
  };
}

async function checkDashboard(): Promise<HealthCheckResult> {
  const dashPath = CONFIG.OUTPUT.DASHBOARD;
  try {
    const stat = await fs.stat(dashPath);
    if (stat.size === 0) {
      return { name: "dashboard", status: "warn", message: "Dashboard file exists but is empty" };
    }
    return {
      name: "dashboard",
      status: "pass",
      message: `Dashboard exists (${(stat.size / 1024).toFixed(1)} KB)`,
    };
  } catch {
    return { name: "dashboard", status: "fail", message: "Dashboard file not found" };
  }
}

async function checkInstagramSession(): Promise<HealthCheckResult> {
  // Check for instagrapi session file without calling login
  const sessionPaths = [
    path.resolve("session.json"),
    path.resolve(`${CONFIG.INSTAGRAM_USERNAME}_session.json`),
    path.resolve("sessions", `${CONFIG.INSTAGRAM_USERNAME}.json`),
  ];

  for (const sessionPath of sessionPaths) {
    try {
      const raw = await fs.readFile(sessionPath, "utf8");
      const data = JSON.parse(raw);

      // Check if session has basic expected fields
      const hasAuth = data.authorization_data || data.sessionid || data.ds_user_id;
      if (hasAuth) {
        return {
          name: "instagram:session",
          status: "pass",
          message: `Session file found at ${path.basename(sessionPath)}`,
        };
      }
      return {
        name: "instagram:session",
        status: "warn",
        message: `Session file found but may be incomplete at ${path.basename(sessionPath)}`,
      };
    } catch {
      // Try next path
    }
  }

  // Also check for IG_SESSION_ID env var
  if (process.env.IG_SESSION_ID) {
    return {
      name: "instagram:session",
      status: "pass",
      message: "Instagram session available via IG_SESSION_ID env var",
    };
  }

  return {
    name: "instagram:session",
    status: "warn",
    message: "No Instagram session file found (login may be needed on next run)",
  };
}

// ---------------------------------------------------------------------------
// Main health check
// ---------------------------------------------------------------------------

export async function runHealthCheck(): Promise<HealthReport> {
  const checks: HealthCheckResult[] = [];

  // 1. State files
  checks.push(...await checkStateFiles());

  // 2. Video count consistency
  checks.push(await checkVideoCounts());

  // 3. Dashboard
  checks.push(await checkDashboard());

  // 4. Instagram session
  checks.push(await checkInstagramSession());

  // Determine overall status
  const hasFail = checks.some(c => c.status === "fail");
  const hasWarn = checks.some(c => c.status === "warn");
  const overall: HealthReport["overall"] = hasFail ? "unhealthy" : hasWarn ? "degraded" : "healthy";

  return {
    timestamp: new Date().toISOString(),
    overall,
    checks,
  };
}
