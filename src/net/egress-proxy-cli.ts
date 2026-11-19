/**
 * egress-proxy-cli.ts
 *
 * Keeps the egress proxy running on a fixed loopback port, for a browser you drive by hand
 * (the one-time X or Instagram login) or a tool that takes a proxy. Stop it with Ctrl+C.
 *
 *   DOPAMINE_EGRESS_INTERFACE=en0 npm run egress:proxy
 */
import "dotenv/config";
import { CONFIG } from "../pipeline/config.js";
import { resolveEgressAddress, startEgressProxy } from "./egress.js";

async function main(): Promise<void> {
  const localAddress = resolveEgressAddress(CONFIG.EGRESS_INTERFACE);
  if (!localAddress) {
    console.error("Set DOPAMINE_EGRESS_INTERFACE (for example en0) in .env or the environment first.");
    process.exit(1);
  }
  const port = Number.parseInt(process.env.DOPAMINE_EGRESS_PORT ?? "9460", 10);
  const proxy = await startEgressProxy({ localAddress, port });
  console.log(`Egress proxy on ${proxy.url}, leaving through ${CONFIG.EGRESS_INTERFACE}. Ctrl+C to stop.`);
  process.on("SIGINT", () => void proxy.close().then(() => process.exit(0)));
  process.on("SIGTERM", () => void proxy.close().then(() => process.exit(0)));
}

main().catch((err: unknown) => {
  console.error("egress:proxy failed:", String(err).split("\n")[0]);
  process.exit(1);
});
