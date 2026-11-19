// src/net/egress.ts
//
// Sends Dopamine's own traffic out through a chosen network interface instead of the
// default route. A VPN that takes over the default route can make Instagram, YouTube and X
// unreachable; a socket bound to another interface's address goes out that interface on
// macOS. Off unless DOPAMINE_EGRESS_INTERFACE is set.
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
      `DOPAMINE_EGRESS_INTERFACE is "${iface}", but that interface has no IPv4 address right now. ` +
        "Check it is connected (ifconfig), or unset the variable.",
    );
  }
  return address;
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
 */
export async function startEgressProxy(o: {
  localAddress: string;
  port?: number;
  connect?: Connect;
}): Promise<EgressProxy> {
  const connect: Connect = o.connect ?? ((opts) => net.connect(opts));
  const sockets = new Set<net.Socket>();
  const track = (s: net.Socket): void => {
    sockets.add(s);
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
    const upstream = connect({ host: host.replace(/^\[|\]$/g, ""), port, localAddress: o.localAddress, family: 4 });
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
  const port = (server.address() as net.AddressInfo).port;
  return {
    port,
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      }),
  };
}

const MAX_REDIRECTS = 3;
const GET_TIMEOUT_MS = 120_000;

/** GET a URL from the egress address (or the default route when it is null). Null unless it ends in a 200. */
export async function egressGet(
  url: string,
  localAddress: string | null,
  redirectsLeft = MAX_REDIRECTS,
): Promise<Buffer | null> {
  const target = new URL(url);
  const lib = target.protocol === "http:" ? http : https;
  return new Promise((resolve) => {
    const req = lib.get(
      target,
      { ...(localAddress ? { localAddress, family: 4 } : {}), timeout: GET_TIMEOUT_MS },
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
