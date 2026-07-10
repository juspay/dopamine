// src/pipeline/piggyback/chrome.ts
import { spawn, type ChildProcess } from "node:child_process";

const CHROME = process.env.IG_PIGGYBACK_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Launch a headless Chrome bound to the given DevTools port + persistent profile. */
export function launchChrome(port: number, profileDir: string): ChildProcess {
  return spawn(
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
    { stdio: "ignore" },
  );
}

/** Poll the DevTools /json/version endpoint until Chrome is ready to accept CDP. */
export async function waitForPort(port: number, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error(`Chrome DevTools port ${port} did not open within ${timeoutMs}ms`);
}
