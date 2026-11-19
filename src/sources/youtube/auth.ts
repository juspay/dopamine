import { randomBytes } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { OAuth2Client } from "google-auth-library";

export interface YoutubeAuthEnv {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

/** Build an OAuth2Client pre-loaded with credentials. Throws (naming the missing
 *  env var) if any field is absent. */
export function buildOAuthClient(env: YoutubeAuthEnv, redirectUri?: string): OAuth2Client {
  if (!env.clientId) throw new Error("Missing YOUTUBE_CLIENT_ID — set it in .env (Google Cloud OAuth client).");
  if (!env.clientSecret) throw new Error("Missing YOUTUBE_CLIENT_SECRET — set it in .env (Google Cloud OAuth client).");
  if (!env.refreshToken)
    throw new Error("Missing YOUTUBE_REFRESH_TOKEN — run `npm run youtube:auth` once to obtain it.");
  const client = new OAuth2Client({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    // Refreshing a token needs no redirect; only the one-time consent flow passes one.
    ...(redirectUri ? { redirectUri } : {}),
  });
  client.setCredentials({ refresh_token: env.refreshToken });
  return client;
}

/** Upsert KEY=value in a dotenv file (append if absent, replace the line if present). */
export function upsertEnvVar(envPath: string, key: string, value: string): void {
  const line = `${key}=${value}`;
  let body = "";
  try {
    body = fs.readFileSync(envPath, "utf8");
  } catch {
    body = "";
  }
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(body)) body = body.replace(re, line);
  else body = body.length === 0 || body.endsWith("\n") ? body + line + "\n" : body + "\n" + line + "\n";
  // mode applies only when the file is created; an existing file keeps its own.
  fs.writeFileSync(envPath, body, { encoding: "utf8", mode: 0o600 });
}

export interface LoopbackServer {
  redirectUri: string;
  waitForCode(): Promise<string>;
  close(): void;
}

/**
 * The redirect target for a desktop OAuth client: a one-shot server on 127.0.0.1 that
 * receives the authorisation code. Google retired the copy-and-paste ("oob") flow in 2023.
 */
export async function startLoopbackServer(timeoutMs = 300_000, expectedState?: string): Promise<LoopbackServer> {
  let settle: { resolve: (code: string) => void; reject: (err: Error) => void } | undefined;
  const result = new Promise<string>((resolve, reject) => {
    settle = { resolve, reject };
  });
  result.catch(() => {});

  const server = http.createServer((req, res) => {
    const params = new URL(req.url ?? "/", "http://127.0.0.1").searchParams;
    const code = params.get("code");
    const error = params.get("error");
    // Only the redirect Google sends for THIS run carries the state; anything else on the
    // port (a favicon fetch, another page probing loopback) is ignored.
    const stateOk = expectedState === undefined || params.get("state") === expectedState;
    if ((!code && !error) || !stateOk) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(
      code
        ? "<p>Dopamine has what it needs. You can close this tab.</p>"
        : "<p>Google did not grant access. You can close this tab and run the command again.</p>",
    );
    if (code) settle?.resolve(code);
    else settle?.reject(new Error(`Google returned an error: ${error}`));
    close();
  });
  const timer = setTimeout(() => {
    settle?.reject(new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the Google consent.`));
    close();
  }, timeoutMs);
  function close(): void {
    clearTimeout(timer);
    server.close();
    server.closeAllConnections();
  }

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  return { redirectUri: `http://127.0.0.1:${port}`, waitForCode: () => result, close };
}

/** CLI: run the desktop consent flow in the browser and WRITE the refresh token to .env. */
async function main(): Promise<void> {
  // Loaded here, not at module top: the pipeline imports this file and loads .env itself.
  await import("dotenv/config");
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env before running this.");
    process.exit(1);
  }
  const state = randomBytes(16).toString("hex");
  const loopback = await startLoopbackServer(300_000, state);
  const client = new OAuth2Client({ clientId, clientSecret, redirectUri: loopback.redirectUri });
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: ["https://www.googleapis.com/auth/youtube.readonly"],
  });
  console.log("\nOpen this URL in your browser and approve read-only YouTube access:\n\n" + authUrl + "\n");
  console.log("Waiting for Google to send you back here (up to 5 minutes)...");
  const code = await loopback.waitForCode();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      "No refresh_token returned. Revoke prior access at https://myaccount.google.com/permissions and retry.",
    );
    process.exit(1);
  }
  upsertEnvVar(".env", "YOUTUBE_REFRESH_TOKEN", tokens.refresh_token);
  console.log("\n✓ Wrote YOUTUBE_REFRESH_TOKEN to .env");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error("Auth flow failed:", err);
    process.exit(1);
  });
}
