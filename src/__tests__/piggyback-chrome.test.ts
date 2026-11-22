// src/__tests__/piggyback-chrome.test.ts
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { stopChrome, waitForPort } from "../pipeline/piggyback/chrome.js";

const servers: http.Server[] = [];

/** A stand-in for Chrome's DevTools endpoint on an ephemeral port. */
async function listen(): Promise<number> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ Browser: "Chrome/fake" }));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as AddressInfo).port;
}

/** A free port: bind one, read it back, then release it. */
async function freePort(): Promise<number> {
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))));
});

describe("waitForPort", () => {
  it("resolves once the DevTools endpoint answers", async () => {
    await expect(waitForPort(await listen(), 3_000)).resolves.toBeUndefined();
  });

  it("names the port and the timeout when nothing ever listens", async () => {
    const port = await freePort();
    await expect(waitForPort(port, 500)).rejects.toThrow(new RegExp(`${port}.*500ms`));
  });

  it("fails fast with the exit code when Chrome died, instead of blaming the port", async () => {
    // A dead Chrome used to surface as a misleading "port did not open" only
    // after the full timeout elapsed, hiding the real cause (e.g. profile lock).
    const port = await freePort();
    const started = Date.now();
    await expect(waitForPort(port, 30_000, { exitCode: 21, signalCode: null })).rejects.toThrow(/exit(ed)? .*21/i);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("reports the signal when Chrome was killed rather than exiting", async () => {
    const port = await freePort();
    await expect(waitForPort(port, 30_000, { exitCode: null, signalCode: "SIGKILL" })).rejects.toThrow(/SIGKILL/);
  });

  it("keeps waiting while Chrome is still alive", async () => {
    // exitCode null + signalCode null = still running: the poll must continue
    // to the timeout rather than treating a live process as a dead one.
    const port = await freePort();
    await expect(waitForPort(port, 500, { exitCode: null, signalCode: null })).rejects.toThrow(/did not open/);
  });
});

describe("stopChrome", () => {
  // Chrome starts helpers (its updater, its crash reporter) that inherit its stderr and
  // outlive it. Until the job let go of that pipe, every hourly capture lingered about 23 s.
  it("lets go of the error-output pipe, so a helper that outlives the browser cannot hold the job open", async () => {
    // A unique duration is the marker: portable across sh flavours, unlike `exec -a`.
    const marker = `sleep 29.${process.pid}${Date.now() % 100000}`;
    const child = spawn("sh", ["-c", `${marker} & echo helper started >&2; sleep 30`], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    const helper = await new Promise<string>((resolve) => child.stderr?.once("data", (d) => resolve(String(d))));
    expect(helper).toContain("helper started");
    const started = Date.now();
    const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
    stopChrome(child);
    await closed;
    expect(Date.now() - started).toBeLessThan(3000);
    expect(child.stderr?.destroyed).toBe(true);
    spawn("pkill", ["-f", marker]);
  }, 15_000);
});
