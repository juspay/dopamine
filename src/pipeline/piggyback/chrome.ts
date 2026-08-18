// src/pipeline/piggyback/chrome.ts
import { spawn, type ChildProcess } from "node:child_process";

const CHROME = process.env.IG_PIGGYBACK_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** How long to wait for Chrome to open its DevTools port.
 *
 * A cold Chrome — first launch after an OS update, or one rebuilding a large
 * profile — regularly needs more than the 15s this used to allow, which cost a
 * whole day's harvest on 2026-08-13 when all three retries hit the same wall.
 */
const PORT_TIMEOUT_MS = Number.parseInt(process.env.IG_PIGGYBACK_PORT_TIMEOUT_MS ?? "45000", 10);

const POLL_MS = 300;

/** Enough stderr to explain a failed launch without unbounded retention. */
const STDERR_MAX_LINES = 20;

/** Just the liveness fields of a ChildProcess, so callers (and tests) need not
 *  fabricate a whole process object. */
export interface ChromeLiveness {
  exitCode: number | null;
  signalCode?: NodeJS.Signals | null;
}

const stderrBuffers = new WeakMap<object, string[]>();

/** Tail of Chrome's stderr, when the handle came from `launchChrome`. */
export function chromeStderr(child: object): string {
  return (stderrBuffers.get(child) ?? []).join("\n").trim();
}

/** Launch a headless Chrome bound to the given DevTools port + persistent profile. */
export function launchChrome(port: number, profileDir: string): ChildProcess {
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--window-size=1280,2000",
      "about:blank",
    ],
    // stderr is piped rather than ignored: when Chrome refuses to start (a
    // profile still locked by a crashed instance is the usual cause) its
    // complaint is the only thing that identifies the failure.
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  const lines: string[] = [];
  stderrBuffers.set(child, lines);
  child.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) {
      if (line.trim() === "") continue;
      lines.push(line);
      if (lines.length > STDERR_MAX_LINES) lines.shift();
    }
  });

  return child;
}

/** Poll the DevTools /json/version endpoint until Chrome is ready to accept CDP.
 *
 * Pass the child process to abort as soon as it dies: a Chrome that exits on
 * startup can never open the port, so waiting out the full timeout only delays
 * the retry and reports the port as the culprit instead of the exit code.
 */
export async function waitForPort(port: number, timeoutMs = PORT_TIMEOUT_MS, child?: ChromeLiveness): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child) {
      const detail = chromeStderr(child);
      const suffix = detail === "" ? "" : `; Chrome stderr: ${detail}`;
      if (child.signalCode) {
        throw new Error(`Chrome was killed by ${child.signalCode} before DevTools port ${port} opened${suffix}`);
      }
      if (child.exitCode !== null && child.exitCode !== undefined) {
        throw new Error(`Chrome exited with code ${child.exitCode} before DevTools port ${port} opened${suffix}`);
      }
    }
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, POLL_MS));
  }
  const detail = child ? chromeStderr(child) : "";
  const suffix = detail === "" ? "" : `; Chrome stderr: ${detail}`;
  throw new Error(`Chrome DevTools port ${port} did not open within ${timeoutMs}ms${suffix}`);
}
