// src/__tests__/youtube-auth.test.ts
import { describe, expect, it } from "vitest";
import { type YoutubeAuthEnv, buildOAuthClient } from "../sources/youtube/auth.js";

const valid: YoutubeAuthEnv = { clientId: "id", clientSecret: "secret", refreshToken: "refresh" };

describe("buildOAuthClient", () => {
  it("returns a client with the refresh token set when all fields present", () => {
    const c = buildOAuthClient(valid);
    expect(typeof c.generateAuthUrl).toBe("function");
    expect(c.credentials.refresh_token).toBe("refresh");
  });
  it("throws naming the missing var", () => {
    expect(() => buildOAuthClient({ ...valid, clientId: undefined })).toThrow(/YOUTUBE_CLIENT_ID/);
    expect(() => buildOAuthClient({ ...valid, clientSecret: undefined })).toThrow(/YOUTUBE_CLIENT_SECRET/);
    expect(() => buildOAuthClient({ ...valid, refreshToken: undefined })).toThrow(/YOUTUBE_REFRESH_TOKEN/);
  });
});

import http from "node:http";
import { startLoopbackServer } from "../sources/youtube/auth.js";

const hit = (url: string): Promise<number> =>
  new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      })
      .on("error", reject);
  });

describe("startLoopbackServer", () => {
  it("listens on 127.0.0.1 on a real port and resolves with the code Google sends back", async () => {
    const server = await startLoopbackServer();
    expect(server.redirectUri).toMatch(/^http:\/\/127\.0\.0\.1:[1-9]\d*$/);
    const code = server.waitForCode();
    expect(await hit(`${server.redirectUri}/?code=abc123&scope=x`)).toBe(200);
    expect(await code).toBe("abc123");
  });

  it("rejects with Google's error when consent is refused", async () => {
    const server = await startLoopbackServer();
    const code = server.waitForCode();
    code.catch(() => {});
    await hit(`${server.redirectUri}/?error=access_denied`);
    await expect(code).rejects.toThrow(/access_denied/);
  });

  it("ignores a request with neither a code nor an error, such as a favicon fetch", async () => {
    const server = await startLoopbackServer();
    const code = server.waitForCode();
    expect(await hit(`${server.redirectUri}/favicon.ico`)).toBe(404);
    await hit(`${server.redirectUri}/?code=later`);
    expect(await code).toBe("later");
  });

  it("rejects when nobody completes the consent in time", async () => {
    const server = await startLoopbackServer(50);
    await expect(server.waitForCode()).rejects.toThrow(/timed out/i);
  });
});

describe("buildOAuthClient redirect", () => {
  it("no longer uses the out-of-band redirect Google retired", () => {
    const c = buildOAuthClient(valid) as unknown as { redirectUri?: string };
    expect(String(c.redirectUri ?? "")).not.toContain("urn:ietf");
    const withRedirect = buildOAuthClient(valid, "http://127.0.0.1:5000") as unknown as { redirectUri?: string };
    expect(withRedirect.redirectUri).toBe("http://127.0.0.1:5000");
  });
});

describe("startLoopbackServer state check", () => {
  it("ignores a code that does not carry the expected state, and accepts the one that does", async () => {
    const server = await startLoopbackServer(5000, "s3cret");
    const code = server.waitForCode();
    expect(await hit(`${server.redirectUri}/?code=planted`)).toBe(404);
    expect(await hit(`${server.redirectUri}/?code=planted&state=wrong`)).toBe(404);
    expect(await hit(`${server.redirectUri}/?error=x`)).toBe(404);
    expect(await hit(`${server.redirectUri}/?code=real&state=s3cret`)).toBe(200);
    expect(await code).toBe("real");
  });
});

import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { upsertEnvVar } from "../sources/youtube/auth.js";

describe("upsertEnvVar", () => {
  it("creates a new .env readable only by the owner, since it will hold a token", () => {
    const dir = fsSync.mkdtempSync(path.join(os.tmpdir(), "env-"));
    const p = path.join(dir, ".env");
    upsertEnvVar(p, "K", "v");
    // One handle for both checks, so the file checked is the file read.
    const fd = fsSync.openSync(p, "r");
    try {
      expect(fsSync.fstatSync(fd).mode & 0o777).toBe(0o600);
      expect(fsSync.readFileSync(fd, "utf8")).toBe("K=v\n");
    } finally {
      fsSync.closeSync(fd);
    }
    fsSync.rmSync(dir, { recursive: true, force: true });
  });
});
