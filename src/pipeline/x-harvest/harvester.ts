// src/pipeline/x-harvest/harvester.ts
//
// Scheduled X bookmark capture. Opens the bookmarks page in a Chrome profile that is already
// logged in and reads the responses X's own page fetches (via CDP). Nothing is requested on
// our behalf and nothing is clicked. The pipeline never runs this; it reads the file it leaves.
//
// Exit codes (see exitCodeFor): 0 captured or cooling off; 3 X refused, a cool-off is
// recorded; 4 X's page did not behave as expected; 5 the browser never started. Only 5 is
// safe to retry, because only then was nothing sent to X.
import "dotenv/config";
import { type ChildProcess, spawn } from "node:child_process";
import CDP from "chrome-remote-interface";
import { egressAddressOrDefault, startEgressProxy } from "../../net/egress.js";
import type { XPost } from "../../sources/x/parse.js";
import { CONFIG } from "../config.js";
import { chromeArgs, waitForPort } from "../piggyback/chrome.js";
import { loadState, writeJsonAtomic } from "../state.js";
import {
  BrowserStartError,
  type HarvestStatus,
  type PageDriver,
  browserArgs,
  capture,
  clampScrolls,
  coolingOffUntil,
  exitCodeFor,
  mergeIncoming,
  statusAfter,
} from "./capture.js";

const CHROME = process.env.IG_PIGGYBACK_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BOOKMARKS_REQUEST = /\/i\/api\/graphql\/[^/]+\/Bookmarks(?:[?/]|$)/;
const X_API = /^https:\/\/(?:[a-z0-9-]+\.)?(?:x|twitter)\.com\/i\/api\//;
const INITIAL_MS = 7000;
const KNOWN_RUN_STOP = 20;
const COOLOFF_NOTE = "about a day";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** 2 to 4.5 seconds, so scrolling is not machine-regular. */
const pauseMs = () => 2000 + Math.floor(Math.random() * 2500);

function makeDriver(client: CDP.Client): PageDriver {
  const { Network, Page, Runtime } = client;
  const wanted = new Map<string, number>();
  const ready: Array<{ status: number; body: unknown }> = [];
  const pending = new Set<Promise<void>>();
  let limited = false;
  Network.on("responseReceived", (p) => {
    if (!X_API.test(p.response.url)) return;
    if (p.response.status === 429) limited = true;
    if (BOOKMARKS_REQUEST.test(p.response.url)) wanted.set(p.requestId, p.response.status);
  });
  const settle = (status: number, body: unknown): void => {
    ready.push({ status, body });
  };
  Network.on("loadingFinished", (p) => {
    const status = wanted.get(p.requestId);
    if (status === undefined) return;
    wanted.delete(p.requestId);
    // A refusal needs no body: its status is the whole message.
    if (status !== 200) return settle(status, null);
    const job = Network.getResponseBody({ requestId: p.requestId })
      .then(({ body, base64Encoded }) =>
        settle(200, JSON.parse(base64Encoded ? Buffer.from(body, "base64").toString("utf8") : body)),
      )
      // A body that cannot be fetched or parsed is passed on as unreadable, never dropped:
      // the capture then fails as a format change instead of quietly missing a page.
      .catch(() => settle(200, null))
      .finally(() => pending.delete(job));
    pending.add(job);
  });
  return {
    async open(url) {
      await Network.enable({});
      await Page.enable();
      await Page.navigate({ url });
    },
    async scroll() {
      await Runtime.evaluate({ expression: "window.scrollBy(0, Math.round(window.innerHeight * 0.9))" });
    },
    async state() {
      const r = await Runtime.evaluate({
        expression:
          "JSON.stringify({path: location.pathname, text: (document.body ? document.body.innerText : '').slice(0, 4000)})",
      });
      return JSON.parse(String(r.result?.value ?? '{"path":"","text":""}')) as { path: string; text: string };
    },
    async drain() {
      // Wait, briefly, for bodies still on their way, so the last page is not lost.
      await Promise.race([Promise.allSettled([...pending]), sleep(5000)]);
      return ready.splice(0, ready.length);
    },
    rateLimited: () => limited,
    wait: sleep,
  };
}

export async function harvest(): Promise<number> {
  const now = new Date();
  const previous = await loadState<HarvestStatus | null>(CONFIG.STATE.X_HARVEST_STATUS, null);
  const until = coolingOffUntil(previous, now);
  if (until) {
    console.log(`[x-harvest] cooling off until ${until} after "${previous?.last_stop}". Not running.`);
    return 0;
  }

  const stored = await loadState<XPost[]>(CONFIG.STATE.X_INCOMING, []);
  const known = new Set((Array.isArray(stored) ? stored : []).map((p) => p?.id).filter((id) => typeof id === "string"));

  const egress = egressAddressOrDefault(CONFIG.EGRESS_INTERFACE);
  const proxy = egress
    ? await startEgressProxy({
        localAddress: () => egressAddressOrDefault(CONFIG.EGRESS_INTERFACE),
        routeAllTraffic: true,
      })
    : undefined;
  const args = browserArgs(
    chromeArgs(CONFIG.X_HARVEST_PORT, CONFIG.X_PROFILE_DIR, { proxyUrl: proxy?.url }),
    CONFIG.X_HARVEST_HEADLESS,
  );
  const chrome: ChildProcess = spawn(CHROME, args, { stdio: "ignore" });
  let client: CDP.Client | undefined;
  try {
    try {
      await waitForPort(CONFIG.X_HARVEST_PORT, undefined, chrome);
      client = await CDP({ port: CONFIG.X_HARVEST_PORT });
    } catch (err) {
      throw new BrowserStartError(String(err instanceof Error ? err.message : err).split("\n")[0]);
    }
    const scrolls = clampScrolls(CONFIG.X_HARVEST_SCROLLS);
    const result = await capture(makeDriver(client), {
      scrolls,
      known,
      // Stopping early on known posts is only safe once a run has walked the whole feed.
      knownRunStop: previous?.reached_end ? KNOWN_RUN_STOP : null,
      pauseMs,
      initialMs: INITIAL_MS,
    });

    // Whatever was read is kept, even when X then refused: the next run need not repeat it.
    const merged = mergeIncoming(stored, result.posts);
    if (result.posts.length > 0) await writeJsonAtomic(CONFIG.STATE.X_INCOMING, merged.posts);

    const status = statusAfter(
      { stop: result.stop, captured: result.posts.length, added: merged.added, reachedEnd: result.reachedEnd },
      now,
      previous,
    );
    try {
      await writeJsonAtomic(CONFIG.STATE.X_HARVEST_STATUS, status);
    } catch (err) {
      // The exit code still tells the wrapper to cool off, which keeps its own marker.
      console.error(`[x-harvest] could not write the status file: ${String(err).split("\n")[0]}`);
    }

    if (result.stop !== "done") {
      console.error(
        `[x-harvest] STOPPED: ${result.stop}. Nothing was retried and no capture will run for ${COOLOFF_NOTE}. ` +
          `Kept ${result.posts.length} bookmark(s) read before the stop. Open the profile by hand to see what X is asking for (docs/x-harvest-setup.md).`,
      );
      return exitCodeFor(result.stop);
    }
    console.log(
      `[x-harvest] captured ${result.posts.length} bookmark(s) from ${result.responses} response(s); ` +
        `${merged.added} new, ${merged.posts.length} stored${result.unparsed > 0 ? `; ${result.unparsed} entr(ies) could not be read` : ""}`,
    );
    if (!result.reachedEnd && !previous?.reached_end) {
      console.warn(
        `[x-harvest] stopped at the scroll limit (${scrolls}) before the end of the feed. Older bookmarks are not captured yet; ` +
          "each run continues until one reaches the end. Raise X_HARVEST_SCROLLS (up to 100) to go faster.",
      );
    }
    return 0;
  } finally {
    if (client) await client.close().catch(() => {});
    chrome.kill();
    await proxy?.close();
  }
}

if (process.argv[1]?.endsWith("x-harvest/harvester.js")) {
  harvest().then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error("[x-harvest] failed:", String(err instanceof Error ? err.message : err).split("\n")[0]);
      process.exit(exitCodeFor(err instanceof Error ? err : new Error(String(err))));
    },
  );
}
