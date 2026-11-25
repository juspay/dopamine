// src/net/egress.ts
//
// Sends Dopamine's own traffic out through a chosen network interface instead of the
// default route. A VPN that takes over the default route can make Instagram, YouTube and X
// unreachable; a socket Node binds to another interface's address goes out that interface on
// macOS. yt-dlp's own --source-address does not reliably get past the VPN, so each run routes
// all HTTPS through a loopback proxy built on such sockets. Off unless DOPAMINE_EGRESS_INTERFACE is set.
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";

/** The IPv4 address of `iface`, or null when no interface is configured. */
export function resolveEgressAddress(
  iface: string | undefined,
  interfaces: ReturnType<typeof os.networkInterfaces> = os.networkInterfaces(),
): string | null {
  if (!iface) return null;
  const address = interfaces[iface]?.find((a) => a.family === "IPv4" && !a.internal)?.address;
  if (!address) {
    throw new Error(
      `DOPAMINE_EGRESS_INTERFACE is "${iface}", but that interface has no IPv4 address right now. Check it is connected (ifconfig), or unset the variable.`,
    );
  }
  return address;
}

let warnedNoAddress = false;

/**
 * The egress address, or null (the default route) when the interface is set but has no address
 * right now, say while the Mac is off that network. Warns once per process instead of failing,
 * so a run still reaches what the default route can reach.
 */
export function egressAddressOrDefault(
  iface: string | undefined,
  interfaces: ReturnType<typeof os.networkInterfaces> = os.networkInterfaces(),
): string | null {
  try {
    return resolveEgressAddress(iface, interfaces);
  } catch (err) {
    if (!warnedNoAddress) {
      console.error(`[egress] ${String(err instanceof Error ? err.message : err)} Using the default route.`);
      warnedNoAddress = true;
    }
    return null;
  }
}

export interface EgressProxy {
  port: number;
  url: string;
  close(): Promise<void>;
}

type Connect = (opts: net.TcpNetConnectOpts) => net.Socket;

const CONNECT_TIMEOUT_MS = 20_000;

/**
 * A CONNECT-only HTTP proxy on loopback whose outbound sockets leave from `localAddress`.
 * A browser pointed at it (`--proxy-server`) reaches HTTPS sites through that interface.
 * Given a function, it asks for the address on every connection, so a proxy that outlives a
 * network change (a new Wi-Fi address) keeps working; null means the default route.
 */
export async function startEgressProxy(o: {
  localAddress: string | (() => string | null);
  port?: number;
  connect?: Connect;
  /** Never keep the process alive: for a proxy that lives as long as the run that uses it. */
  background?: boolean;
  /** Also send this process's and its children's HTTPS traffic through it (routeAllTrafficThrough). */
  routeAllTraffic?: boolean;
}): Promise<EgressProxy> {
  const connect: Connect = o.connect ?? ((opts) => net.connect(opts));
  const sockets = new Set<net.Socket>();
  const track = (s: net.Socket): void => {
    sockets.add(s);
    if (o.background) s.unref();
    s.on("close", () => sockets.delete(s));
  };

  const server = http.createServer((_req, res) => {
    res.writeHead(405, { connection: "close" }).end("This proxy only tunnels HTTPS (CONNECT).");
  });
  server.on("connection", track);

  server.on("connect", (req, client: net.Socket, head: Buffer) => {
    const [host, portText] = (req.url ?? "").split(/:(?=\d+$)/);
    const port = Number.parseInt(portText ?? "", 10);
    if (!host || !Number.isInteger(port)) {
      client.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      return;
    }
    const from = typeof o.localAddress === "function" ? o.localAddress() : o.localAddress;
    const upstream = connect({
      host: host.replace(/^\[|\]$/g, ""),
      port,
      family: 4,
      ...(from ? { localAddress: from } : {}),
    });
    track(upstream);
    upstream.setTimeout(CONNECT_TIMEOUT_MS, () => upstream.destroy(new Error("connect timeout")));
    let open = false;
    upstream.once("connect", () => {
      open = true;
      upstream.setTimeout(0);
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length > 0) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    upstream.on("error", () => {
      if (!open && client.writable) client.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      else client.destroy();
    });
    client.on("error", () => upstream.destroy());
    client.on("close", () => upstream.destroy());
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(o.port ?? 0, "127.0.0.1", () => resolve());
  });
  if (o.background) server.unref();
  const port = (server.address() as net.AddressInfo).port;
  const url = `http://127.0.0.1:${port}`;
  if (o.routeAllTraffic) routeAllTrafficThrough(url);
  return {
    port,
    url,
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      }),
  };
}

/** This machine's own servers (the browser's control port, local tools) never go through the proxy. */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

/**
 * Google Cloud APIs (Vertex AI and its token endpoint) stay on the default route: the project
 * refuses calls from the Wi-Fi address with "Permission Denied" and accepts them over the VPN.
 * Measured 2026-11-25: the same Vertex call failed through the proxy and succeeded without it.
 */
const DEFAULT_ROUTE_HOSTS = ["googleapis.com"];

/**
 * Sends every HTTPS request this process and its child processes make through `proxyUrl`:
 * Node's own fetch and https (the AI SDKs included), child Node processes, and any child that
 * reads HTTPS_PROXY (yt-dlp, the Instagram scripts). Plain HTTP is left on the default route,
 * because the proxy only tunnels HTTPS, and so are local and Google Cloud hosts (see above).
 */
export function routeAllTrafficThrough(
  proxyUrl: string,
  env: NodeJS.ProcessEnv = process.env,
  apply: (e: NodeJS.ProcessEnv) => void = (e) => void http.setGlobalProxyFromEnv(e),
): void {
  const existing = (env.NO_PROXY ?? env.no_proxy ?? "").split(",").map((h) => h.trim());
  const noProxy = [...new Set([...existing, ...LOCAL_HOSTS, ...DEFAULT_ROUTE_HOSTS].filter(Boolean))].join(",");
  Object.assign(env, {
    HTTPS_PROXY: proxyUrl,
    https_proxy: proxyUrl,
    NO_PROXY: noProxy,
    no_proxy: noProxy,
    NODE_USE_ENV_PROXY: "1",
  });
  apply(env);
}

/**
 * When DOPAMINE_EGRESS_INTERFACE names an interface, starts a background proxy that leaves
 * through it and routes all traffic through that proxy. Returns null when no interface is set.
 * An interface without an address is reported and the run goes on over the default route.
 */
export async function startProxyForAllTraffic(iface: string | undefined): Promise<EgressProxy | null> {
  if (!egressAddressOrDefault(iface)) return null;
  const proxy = await startEgressProxy({
    localAddress: () => egressAddressOrDefault(iface),
    background: true,
    routeAllTraffic: true,
  });
  console.log(`[egress] all HTTPS traffic leaves through ${iface}`);
  return proxy;
}

const MAX_REDIRECTS = 3;
const GET_TIMEOUT_MS = 120_000;

/**
 * GET a URL from the egress address (or the default route when it is null). Null unless it ends
 * in a 200. Once all HTTPS goes through the egress proxy, an https URL is not bound here: the
 * proxy picks the current address, and an address bound now may be gone by the time it is used.
 */
export async function egressGet(
  url: string,
  localAddress: string | null,
  redirectsLeft = MAX_REDIRECTS,
): Promise<Buffer | null> {
  const target = new URL(url);
  const lib = target.protocol === "http:" ? http : https;
  const bind = localAddress && !(target.protocol === "https:" && process.env.HTTPS_PROXY) ? localAddress : null;
  return new Promise((resolve) => {
    const req = lib.get(
      target,
      { ...(bind ? { localAddress: bind, family: 4 } : {}), timeout: GET_TIMEOUT_MS },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          res.resume();
          if (redirectsLeft <= 0) return resolve(null);
          return resolve(egressGet(new URL(location, target).toString(), localAddress, redirectsLeft - 1));
        }
        if (status !== 200) {
          res.resume();
          return resolve(null);
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
  });
}
