// src/pipeline/piggyback/harvester.ts
//
// Scheduled-Chrome piggyback: open the logged-in saved page in a headless
// Chrome and read the saved-feed responses Instagram's OWN web client fetches
// (via CDP). Zero API calls originate from us — we only observe. Captured
// items are unioned through ingestMetadata and their videos downloaded from the
// CDN video_url. This is the block-resistant primary capture path.
import "dotenv/config"; // load .env before CONFIG evaluates (mirrors runner.ts / the py scripts)
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import CDP from "chrome-remote-interface";
import { CONFIG } from "../config.js";
import { ingestMetadata } from "../ingest.js";
import { isSavedFeedUrl, webResponseToEntries } from "./map-web-media.js";
import { launchChrome, waitForPort } from "./chrome.js";
import type { MetadataEntry } from "../../types/index.js";

const PORT = parseInt(process.env.IG_PIGGYBACK_PORT ?? "9455", 10);
const PROFILE = process.env.IG_PIGGYBACK_PROFILE_DIR ?? path.join(os.homedir(), ".dopamine-ig-profile");
const SCROLLS = parseInt(process.env.IG_PIGGYBACK_SCROLLS ?? "3", 10);
const USER = process.env.INSTAGRAM_USERNAME ?? "";
const SAVED_URL = `https://www.instagram.com/${USER}/saved/all-posts/`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Download new videos straight from their (fresh, signed) CDN url — no IG API. */
async function downloadNew(entries: MetadataEntry[]): Promise<number> {
  let n = 0;
  for (const e of entries) {
    if (e.media_type !== 2 || !e.video_url) continue;
    // username/pk come from the untrusted IG response — strip anything that
    // isn't a safe basename char so a crafted value can't escape VIDEOS_DIR via
    // path separators or "..".
    const safeBase = `${e.username ?? ""}_${e.pk}`.replace(/[^A-Za-z0-9._-]/g, "_");
    const dest = path.join(CONFIG.VIDEOS_DIR, `${safeBase}.mp4`);
    try {
      await fs.access(dest);
      continue; // already have it
    } catch {
      /* missing → download */
    }
    try {
      const r = await fetch(e.video_url);
      if (!r.ok) continue;
      await fs.mkdir(CONFIG.VIDEOS_DIR, { recursive: true });
      // Persisting a saved reel's bytes to disk IS the harvester's purpose, and
      // `dest` is sanitized above — the http-to-file flow is intentional here.
      await fs.writeFile(dest, Buffer.from(await r.arrayBuffer())); // codeql[js/http-to-file-access]
      n++;
    } catch (err) {
      console.error(`[piggyback] download failed ${e.pk}: ${String(err).split("\n")[0]}`);
    }
  }
  return n;
}

export async function harvest(): Promise<void> {
  if (!USER) throw new Error("INSTAGRAM_USERNAME must be set to build the saved-page URL");
  const chrome = launchChrome(PORT, PROFILE);
  let client: CDP.Client | undefined;
  try {
    await waitForPort(PORT);
    client = await CDP({ port: PORT });
    const { Network, Page, Runtime } = client;
    await Network.enable({});
    await Page.enable();

    const savedRequestIds: string[] = [];
    Network.on("responseReceived", (params) => {
      if (isSavedFeedUrl(params.response.url)) savedRequestIds.push(params.requestId);
    });

    await Page.navigate({ url: SAVED_URL });
    await sleep(3500); // initial load + first saved-feed fetch
    for (let i = 0; i < SCROLLS; i++) {
      await Runtime.evaluate({ expression: "window.scrollTo(0, document.body.scrollHeight)" });
      await sleep(1800);
    }
    await sleep(1500); // let in-flight responses settle

    const loc = await Runtime.evaluate({ expression: "location.pathname" });
    if (String(loc.result?.value ?? "").includes("/accounts/login")) {
      console.error(
        `[piggyback] NOT LOGGED IN. Re-seed the profile:\n` +
          `  open -a "Google Chrome" --args --user-data-dir="${PROFILE}" https://www.instagram.com/\n` +
          `  (log in once, then close Chrome and re-run.)`,
      );
      process.exitCode = 2;
      return;
    }

    const entries: MetadataEntry[] = [];
    for (const requestId of savedRequestIds) {
      try {
        const { body, base64Encoded } = await Network.getResponseBody({ requestId });
        const text = base64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
        entries.push(...webResponseToEntries(JSON.parse(text)));
      } catch {
        /* body evicted / not JSON — skip */
      }
    }

    // dedup within this harvest by pk
    const byPk = new Map(entries.map((e) => [e.pk, e]));
    const batch = [...byPk.values()];
    console.log(`[piggyback] captured ${batch.length} saved item(s) from ${savedRequestIds.length} response(s)`);

    await fs.mkdir(path.dirname(CONFIG.STATE.METADATA_INCOMING), { recursive: true });
    await fs.writeFile(CONFIG.STATE.METADATA_INCOMING, JSON.stringify(batch, null, 2), "utf8");
    const { added, updated, total } = await ingestMetadata(batch);
    const dl = await downloadNew(batch);
    console.log(`[piggyback] ingest +${added} new, ~${updated} refreshed, ${total} total; downloaded ${dl} mp4(s)`);
  } finally {
    if (client) await client.close().catch(() => {});
    chrome.kill();
  }
}

if (process.argv[1]?.endsWith("harvester.js")) {
  harvest().catch((err) => {
    console.error("[piggyback] harvest failed:", err);
    process.exit(1);
  });
}
