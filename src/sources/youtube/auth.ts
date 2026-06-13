import fs from "node:fs";
import { OAuth2Client } from "google-auth-library";

export interface YoutubeAuthEnv {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

/** Build an OAuth2Client pre-loaded with credentials. Throws (naming the missing
 *  env var) if any field is absent. */
export function buildOAuthClient(env: YoutubeAuthEnv): OAuth2Client {
  if (!env.clientId) throw new Error("Missing YOUTUBE_CLIENT_ID — set it in .env (Google Cloud OAuth client).");
  if (!env.clientSecret) throw new Error("Missing YOUTUBE_CLIENT_SECRET — set it in .env (Google Cloud OAuth client).");
  if (!env.refreshToken) throw new Error("Missing YOUTUBE_REFRESH_TOKEN — run `npm run youtube:auth` once to obtain it.");
  const client = new OAuth2Client({
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    redirectUri: "urn:ietf:wg:oauth:2.0:oob",
  });
  client.setCredentials({ refresh_token: env.refreshToken });
  return client;
}

/** Upsert KEY=value in a dotenv file (append if absent, replace the line if present). */
export function upsertEnvVar(envPath: string, key: string, value: string): void {
  const line = `${key}=${value}`;
  let body = "";
  try { body = fs.readFileSync(envPath, "utf8"); } catch { body = ""; }
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(body)) body = body.replace(re, line);
  else body = body.length === 0 || body.endsWith("\n") ? body + line + "\n" : body + "\n" + line + "\n";
  fs.writeFileSync(envPath, body, "utf8");
}

/** CLI: run the installed-app consent flow and WRITE the refresh token to .env. */
async function main(): Promise<void> {
  const { createInterface } = await import("node:readline");
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env before running this.");
    process.exit(1);
  }
  const client = new OAuth2Client({ clientId, clientSecret, redirectUri: "urn:ietf:wg:oauth:2.0:oob" });
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.readonly"],
  });
  console.log("\nOpen this URL, authorise, and paste the code:\n\n" + authUrl + "\n");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise<string>((res) => rl.question("Authorisation code: ", (a) => { rl.close(); res(a.trim()); }));
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    console.error("No refresh_token returned. Revoke prior access at https://myaccount.google.com/permissions and retry.");
    process.exit(1);
  }
  upsertEnvVar(".env", "YOUTUBE_REFRESH_TOKEN", tokens.refresh_token);
  console.log("\n✓ Wrote YOUTUBE_REFRESH_TOKEN to .env");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => { console.error("Auth flow failed:", err); process.exit(1); });
}
