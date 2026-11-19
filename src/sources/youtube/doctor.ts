/**
 * doctor.ts — `npm run youtube:doctor`
 *
 * Says whether YouTube ingestion can work from this machine right now, and what is missing:
 * the Data API, youtube.com on the default route and through the egress interface, yt-dlp,
 * the OAuth credentials and the Watch Later cookie file. Reads nothing private and changes nothing.
 */
import fs from "node:fs/promises";
import https from "node:https";
import { execa } from "execa";
import { resolveEgressAddress } from "../../net/egress.js";
import { type YoutubeAuthEnv, buildOAuthClient } from "./auth.js";

export type ProbeStatus = "ok" | "reset" | "timeout" | "dns" | "http_error" | "unreachable";

export function classifyProbe(r: { status?: number; error?: string }): ProbeStatus {
  if (r.status !== undefined) return r.status < 500 ? "ok" : "http_error";
  const e = r.error ?? "";
  if (/ECONNRESET|reset/i.test(e)) return "reset";
  if (/timeout|ETIMEDOUT|aborted/i.test(e)) return "timeout";
  if (/ENOTFOUND|EAI_AGAIN/i.test(e)) return "dns";
  return "unreachable";
}

export interface Check {
  api: ProbeStatus;
  webDefault: ProbeStatus;
  /** null when no egress interface is configured. */
  webEgress: ProbeStatus | null;
  ytDlp: string | null;
  credentials: boolean;
  /** "rejected": present, but Google refused to exchange it (expired or revoked). */
  refreshToken: "ok" | "missing" | "rejected";
  cookies: "ok" | "unset" | "missing" | "exposed";
}

export function verdict(c: Check): { ready: boolean; problems: string[] } {
  const problems: string[] = [];
  let ready = true;
  if (c.api !== "ok") {
    ready = false;
    problems.push(`The YouTube Data API is not reachable (${c.api}), so liked videos cannot be listed.`);
  }
  if (c.webDefault !== "ok" && c.webEgress !== "ok") {
    ready = false;
    problems.push(
      c.webEgress === null
        ? `youtube.com is not reachable on the default route (${c.webDefault}). If a VPN is the cause, set DOPAMINE_EGRESS_INTERFACE (for example en0) in .env.`
        : `youtube.com is not reachable on the default route (${c.webDefault}) or through the egress interface (${c.webEgress}).`,
    );
  }
  if (c.ytDlp === null) {
    ready = false;
    problems.push("yt-dlp was not found on PATH. Install or upgrade it: pip install -U yt-dlp");
  }
  if (!c.credentials) {
    ready = false;
    problems.push("YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are not both set in .env.");
  }
  if (c.refreshToken !== "ok") {
    ready = false;
    problems.push(
      c.refreshToken === "missing"
        ? "YOUTUBE_REFRESH_TOKEN is not set. Run: npm run youtube:auth"
        : "Google rejected the refresh token (it expires weekly while the consent screen is in Testing). Run: npm run youtube:auth",
    );
  }
  if (c.cookies !== "ok") {
    const why = {
      unset: "YT_COOKIES_FILE is not set",
      missing: "the cookie file is missing",
      exposed: "the cookie file is readable by others (chmod 600 it)",
    }[c.cookies];
    problems.push(`Watch Later will be skipped: ${why}. Liked videos and playlists still work.`);
  }
  return { ready, problems };
}

function probe(host: string, localAddress: string | null): Promise<ProbeStatus> {
  return new Promise((resolve) => {
    const req = https.request(
      { host, path: "/", method: "HEAD", timeout: 8000, ...(localAddress ? { localAddress, family: 4 } : {}) },
      (res) => {
        res.resume();
        resolve(classifyProbe({ status: res.statusCode ?? 0 }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (err) => resolve(classifyProbe({ error: String(err) })));
    req.end();
  });
}

/** Asks Google for an access token, which is the only way to know the refresh token still works. */
async function tokenStatus(env: YoutubeAuthEnv): Promise<Check["refreshToken"]> {
  if (!env.clientId || !env.clientSecret || !env.refreshToken) return "missing";
  try {
    const { token } = await buildOAuthClient(env).getAccessToken();
    return token ? "ok" : "rejected";
  } catch {
    return "rejected";
  }
}

async function main(): Promise<void> {
  await import("dotenv/config");
  const { CONFIG } = await import("../../pipeline/config.js");
  const egress = resolveEgressAddress(CONFIG.EGRESS_INTERFACE);
  const ytDlp = await execa("yt-dlp", ["--version"], { reject: false }).then(
    (r) => (r.exitCode === 0 ? r.stdout.trim() : null),
    () => null,
  );
  let cookies: Check["cookies"] = "unset";
  if (CONFIG.YT_COOKIES_FILE) {
    cookies = await fs.stat(CONFIG.YT_COOKIES_FILE).then(
      (s) => ((s.mode & 0o077) === 0 ? "ok" : "exposed"),
      () => "missing" as const,
    );
  }
  const check: Check = {
    api: await probe("www.googleapis.com", null),
    webDefault: await probe("www.youtube.com", null),
    webEgress: egress ? await probe("www.youtube.com", egress) : null,
    ytDlp,
    credentials: Boolean(CONFIG.YOUTUBE.clientId && CONFIG.YOUTUBE.clientSecret),
    refreshToken: await tokenStatus(CONFIG.YOUTUBE),
    cookies,
  };
  console.log(`YouTube Data API:            ${check.api}`);
  console.log(`youtube.com, default route:  ${check.webDefault}`);
  console.log(
    `youtube.com, via ${CONFIG.EGRESS_INTERFACE ?? "(no egress interface)"}: ${check.webEgress ?? "not configured"}`,
  );
  console.log(`yt-dlp:                      ${check.ytDlp ?? "not found"}`);
  console.log(`OAuth client in .env:        ${check.credentials ? "yes" : "no"}`);
  console.log(`Refresh token:               ${check.refreshToken}`);
  console.log(`Watch Later cookie file:     ${check.cookies}`);
  const v = verdict(check);
  for (const p of v.problems) console.log(`- ${p}`);
  console.log(v.ready ? "\nReady: YouTube ingestion can run." : "\nNot ready: fix the lines above.");
  process.exit(v.ready ? 0 : 1);
}

if (process.argv[1]?.endsWith("doctor.js")) {
  main().catch((err: unknown) => {
    console.error("youtube:doctor failed:", String(err).split("\n")[0]);
    process.exit(2);
  });
}
