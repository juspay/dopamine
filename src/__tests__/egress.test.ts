// src/__tests__/egress.test.ts
import http from "node:http";
import net from "node:net";
import type os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type EgressProxy,
  egressAddressOrDefault,
  egressGet,
  resolveEgressAddress,
  routeAllTrafficThrough,
  startEgressProxy,
  startProxyForAllTraffic,
} from "../net/egress.js";
import { chromeArgs } from "../pipeline/piggyback/chrome.js";

type Interfaces = ReturnType<typeof os.networkInterfaces>;
const v4 = (address: string, internal = false) =>
  ({ address, family: "IPv4", internal, netmask: "", mac: "", cidr: null }) as os.NetworkInterfaceInfo;
const v6 = (address: string) =>
  ({
    address,
    family: "IPv6",
    internal: false,
    netmask: "",
    mac: "",
    cidr: null,
    scopeid: 0,
  }) as os.NetworkInterfaceInfo;

describe("resolveEgressAddress", () => {
  const interfaces: Interfaces = {
    en0: [v6("fe80::1"), v4("192.168.1.7")],
    lo0: [v4("127.0.0.1", true)],
    en5: [v6("fe80::2")],
  };

  it("returns null when no interface is configured, so nothing changes by default", () => {
    expect(resolveEgressAddress(undefined, interfaces)).toBeNull();
    expect(resolveEgressAddress("", interfaces)).toBeNull();
  });

  it("returns the interface's IPv4 address", () => {
    expect(resolveEgressAddress("en0", interfaces)).toBe("192.168.1.7");
  });

  it("throws a message that names the interface when it is missing or has no usable address", () => {
    expect(() => resolveEgressAddress("en9", interfaces)).toThrow(/en9/);
    expect(() => resolveEgressAddress("en5", interfaces)).toThrow(/en5/);
    expect(() => resolveEgressAddress("lo0", interfaces)).toThrow(/lo0/);
  });
});

describe("chromeArgs", () => {
  it("adds no proxy flag unless a proxy is given", () => {
    expect(chromeArgs(9455, "/p").some((a) => a.startsWith("--proxy-server"))).toBe(false);
  });

  it("sends the browser through the proxy when one is given", () => {
    expect(chromeArgs(9455, "/p", { proxyUrl: "http://127.0.0.1:5555" })).toContain(
      "--proxy-server=http://127.0.0.1:5555",
    );
  });

  it("keeps the flags the harvester has always used", () => {
    const args = chromeArgs(9455, "/p");
    expect(args).toContain("--headless=new");
    expect(args).toContain("--remote-debugging-port=9455");
    expect(args).toContain("--user-data-dir=/p");
  });
});

describe("egress proxy", () => {
  let proxy: EgressProxy | undefined;
  let upstream: http.Server | undefined;
  afterEach(async () => {
    await proxy?.close();
    proxy = undefined;
    await new Promise<void>((r) => (upstream ? upstream.close(() => r()) : r()));
    upstream = undefined;
  });

  const startUpstream = async (): Promise<number> => {
    upstream = http.createServer((req, res) => {
      if (req.url === "/moved") {
        res.writeHead(302, { location: "/file" }).end();
        return;
      }
      res.writeHead(req.url === "/missing" ? 404 : 200).end(`hello ${req.url}`);
    });
    await new Promise<void>((r) => upstream?.listen(0, "127.0.0.1", () => r()));
    return (upstream.address() as net.AddressInfo).port;
  };

  it("listens on loopback only and tunnels a CONNECT, opening the outbound socket from the egress address", async () => {
    const port = await startUpstream();
    const seen: Array<string | undefined> = [];
    proxy = await startEgressProxy({
      localAddress: "127.0.0.1",
      connect: (opts) => {
        seen.push(opts.localAddress);
        return net.connect(opts);
      },
    });
    expect(proxy.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    const reply = await new Promise<string>((resolve, reject) => {
      const s = net.connect(proxy?.port ?? 0, "127.0.0.1", () => {
        s.write(`CONNECT 127.0.0.1:${port} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n\r\n`);
      });
      let buf = "";
      let sent = false;
      s.on("data", (d) => {
        buf += d.toString();
        if (!sent && buf.includes("\r\n\r\n")) {
          sent = true;
          s.write("GET /through HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n");
        }
      });
      s.on("end", () => resolve(buf));
      s.on("error", reject);
    });
    expect(reply).toMatch(/^HTTP\/1\.1 200/);
    expect(reply).toContain("hello /through");
    expect(seen).toEqual(["127.0.0.1"]);
  });

  it("asks for the egress address on every connection, so a network change mid-run is followed", async () => {
    const port = await startUpstream();
    const addresses: Array<string | null> = ["127.0.0.1", null];
    const seen: Array<string | undefined> = [];
    proxy = await startEgressProxy({
      localAddress: () => addresses.shift() ?? null,
      connect: (opts) => {
        seen.push(opts.localAddress);
        return net.connect(opts);
      },
    });
    const tunnel = () =>
      new Promise<string>((resolve, reject) => {
        const s = net.connect(proxy?.port ?? 0, "127.0.0.1", () =>
          s.write(`CONNECT 127.0.0.1:${port} HTTP/1.1\r\n\r\n`),
        );
        let buf = "";
        s.on("data", (d) => {
          buf += d.toString();
          if (buf.includes("\r\n\r\n")) s.end();
        });
        s.on("close", () => resolve(buf));
        s.on("error", reject);
      });
    expect(await tunnel()).toMatch(/^HTTP\/1\.1 200/);
    expect(await tunnel()).toMatch(/^HTTP\/1\.1 200/);
    // The second connection found no address and went out over the default route.
    expect(seen).toEqual(["127.0.0.1", undefined]);
  });

  it("answers 502 when the target cannot be reached, instead of hanging", async () => {
    proxy = await startEgressProxy({ localAddress: "127.0.0.1" });
    const reply = await new Promise<string>((resolve, reject) => {
      const s = net.connect(proxy?.port ?? 0, "127.0.0.1", () => s.write("CONNECT 127.0.0.1:1 HTTP/1.1\r\n\r\n"));
      let buf = "";
      s.on("data", (d) => {
        buf += d.toString();
      });
      s.on("close", () => resolve(buf));
      s.on("error", reject);
    });
    expect(reply).toMatch(/^HTTP\/1\.1 502/);
  });

  it("refuses anything that is not a CONNECT", async () => {
    proxy = await startEgressProxy({ localAddress: "127.0.0.1" });
    const status = await new Promise<number>((resolve, reject) => {
      http
        .get({ host: "127.0.0.1", port: proxy?.port, path: "http://example.invalid/" }, (res) =>
          resolve(res.statusCode ?? 0),
        )
        .on("error", reject);
    });
    expect(status).toBe(405);
  });
});

describe("egressGet", () => {
  let upstream: http.Server | undefined;
  afterEach(async () => {
    await new Promise<void>((r) => (upstream ? upstream.close(() => r()) : r()));
    upstream = undefined;
  });
  const start = async (): Promise<string> => {
    upstream = http.createServer((req, res) => {
      if (req.url === "/moved") return void res.writeHead(302, { location: "/file" }).end();
      if (req.url === "/loop") return void res.writeHead(302, { location: "/loop" }).end();
      res.writeHead(req.url === "/missing" ? 404 : 200).end(`bytes of ${req.url}`);
    });
    await new Promise<void>((r) => upstream?.listen(0, "127.0.0.1", () => r()));
    return `http://127.0.0.1:${(upstream.address() as net.AddressInfo).port}`;
  };

  it("returns the body for a 200 and follows a redirect", async () => {
    const base = await start();
    expect((await egressGet(`${base}/file`, "127.0.0.1"))?.toString()).toBe("bytes of /file");
    expect((await egressGet(`${base}/moved`, "127.0.0.1"))?.toString()).toBe("bytes of /file");
  });

  it("returns null for a non-200 and for a redirect loop", async () => {
    const base = await start();
    expect(await egressGet(`${base}/missing`, "127.0.0.1")).toBeNull();
    expect(await egressGet(`${base}/loop`, "127.0.0.1")).toBeNull();
  });

  it("works without an egress address", async () => {
    const base = await start();
    expect((await egressGet(`${base}/file`, null))?.toString()).toBe("bytes of /file");
  });
});

describe("routeAllTrafficThrough", () => {
  it("points HTTPS at the proxy for this process and its children, and keeps local and Google Cloud hosts direct", () => {
    const env: NodeJS.ProcessEnv = { NO_PROXY: "corp.example, localhost" };
    const applied: NodeJS.ProcessEnv[] = [];
    routeAllTrafficThrough("http://127.0.0.1:9999", env, (e) => applied.push(e));
    expect(env.HTTPS_PROXY).toBe("http://127.0.0.1:9999");
    expect(env.https_proxy).toBe("http://127.0.0.1:9999");
    expect(env.NODE_USE_ENV_PROXY).toBe("1");
    expect(env.NO_PROXY).toBe("corp.example,localhost,127.0.0.1,::1,googleapis.com");
    expect(env.no_proxy).toBe(env.NO_PROXY);
    expect(env.HTTP_PROXY).toBeUndefined();
    expect(applied).toEqual([env]);
  });
});

describe("startProxyForAllTraffic", () => {
  it("does nothing when no interface is set", async () => {
    expect(await startProxyForAllTraffic(undefined)).toBeNull();
  });
  it("goes on over the default route when the interface has no address", async () => {
    const before = process.env.HTTPS_PROXY;
    expect(await startProxyForAllTraffic("no-such-interface0")).toBeNull();
    expect(process.env.HTTPS_PROXY).toBe(before);
  });
});

describe("egressAddressOrDefault", () => {
  it("returns the interface's address when it has one", () => {
    expect(egressAddressOrDefault("en0", { en0: [v4("192.168.1.5")] } as Interfaces)).toBe("192.168.1.5");
    expect(egressAddressOrDefault(undefined, {} as Interfaces)).toBeNull();
  });
  it("falls back to the default route, warning at most once, when the interface has no address", () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(egressAddressOrDefault("en0", { en0: [v6("fe80::1")] } as Interfaces)).toBeNull();
      expect(egressAddressOrDefault("en0", {} as Interfaces)).toBeNull();
      expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
    } finally {
      warn.mockRestore();
    }
  });
});
