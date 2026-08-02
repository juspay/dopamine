import express from "express";
import compression from "compression";
import path from "node:path";
import fs from "node:fs/promises";
import { LabelPatchSchema, isEmptyLabel, isValidVideoId, removeLabel, upsertLabel } from "../schemas/label.js";
import { loadLabels, saveLabels } from "./labels-store.js";

const app = express();

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'",
  );
  next();
});

// ---------------------------------------------------------------------------
// Block access to dotfiles — deny before static middleware
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const lowerPath = req.path.toLowerCase();

  // Block dotfiles (.env, .git, etc.)
  if (lowerPath.includes("/.") || lowerPath.startsWith(".")) {
    res.status(403).send("Forbidden");
    return;
  }

  next();
});

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------
app.use(compression());

// ---------------------------------------------------------------------------
// Human labels API — MUST be registered before the SPA fallback below, which
// answers every unmatched GET with index.html and would otherwise swallow these.
//
// Writes are read-modify-write, so they are serialised through a promise chain.
// Two concurrent saves would otherwise both read the same file and the second
// would silently drop the first verdict — and a lost verdict is unrecoverable,
// since nothing regenerates it.
// ---------------------------------------------------------------------------
let labelQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = labelQueue.then(fn, fn);
  labelQueue = run.catch(() => {});
  return run;
}

// Fixed-window limiter over the label routes. Every one of them touches disk,
// and the write path is read-modify-write, so a runaway client loop would spin
// the whole queue against the filesystem. Generous enough that fast manual
// labelling never notices it — a human cannot click 240 times a minute.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 240;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    // Opportunistic sweep: without it the map grows once per distinct client
    // for the lifetime of the process.
    if (hits.size > 1000) for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
    next();
    return;
  }
  if (entry.count >= RATE_MAX) {
    res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({ error: "too many label requests" });
    return;
  }
  entry.count++;
  next();
}

app.get("/api/labels", rateLimit, async (_req, res) => {
  try {
    res.json(await loadLabels());
  } catch (err) {
    res.status(500).json({ error: String(err instanceof Error ? err.message : err).slice(0, 300) });
  }
});

app.put("/api/labels/:id", rateLimit, express.json({ limit: "64kb" }), async (req, res) => {
  const id = req.params.id;
  if (!isValidVideoId(id)) {
    res.status(400).json({ error: "invalid video id" });
    return;
  }
  const patch = LabelPatchSchema.safeParse(req.body);
  if (!patch.success) {
    res.status(400).json({ error: patch.error.message.slice(0, 300) });
    return;
  }
  try {
    const saved = await enqueue(async () => {
      const file = await loadLabels();
      const next = upsertLabel(file, id, patch.data, new Date().toISOString());
      // An empty label is an accidental click, not a verdict. Drop it rather
      // than let it read as "reviewed, applies, no projects".
      const cleaned = isEmptyLabel(next.labels[id]) ? removeLabel(next, id) : next;
      await saveLabels(cleaned);
      return cleaned.labels[id] ?? null;
    });
    res.json({ id, label: saved });
  } catch (err) {
    res.status(500).json({ error: String(err instanceof Error ? err.message : err).slice(0, 300) });
  }
});

app.delete("/api/labels/:id", rateLimit, async (req, res) => {
  const id = req.params.id;
  if (!isValidVideoId(id)) {
    res.status(400).json({ error: "invalid video id" });
    return;
  }
  try {
    await enqueue(async () => saveLabels(removeLabel(await loadLabels(), id)));
    res.json({ id, label: null });
  } catch (err) {
    res.status(500).json({ error: String(err instanceof Error ? err.message : err).slice(0, 300) });
  }
});

// ---------------------------------------------------------------------------
// Serve the SvelteKit app (index.html, _app/, data/) at root
// ---------------------------------------------------------------------------
app.use(express.static(path.resolve("dashboard"), { dotfiles: "deny" }));

// ---------------------------------------------------------------------------
// Serve video files
// ---------------------------------------------------------------------------
app.use("/videos", express.static(path.resolve("videos"), { dotfiles: "deny", redirect: false }));

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for all unknown client-side routes.
// Real static files (app bundle, /data/*, /videos/*) are served by the static
// middleware above. Only genuine asset requests (identified by a known file
// extension) 404 here — so client routes like /videos or /creator/example
// (note the dot) correctly resolve to the SPA shell instead of 404ing.
// ---------------------------------------------------------------------------
const ASSET_RE = /\.(?:js|mjs|css|map|json|ico|png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|woff2?|ttf|eot|txt|xml|wasm)$/i;

app.get("*", async (req, res) => {
  if (req.method !== "GET" || !req.accepts("html")) {
    res.status(404).send("Not found");
    return;
  }
  if (ASSET_RE.test(req.path)) {
    res.status(404).send("Not found");
    return;
  }
  try {
    res.type("html").send(await fs.readFile(path.resolve("dashboard/index.html"), "utf-8"));
  } catch {
    res.status(404).send("Not found");
  }
});

const PORT = parseInt(process.env.DASHBOARD_PORT ?? "3001", 10);
const HOST = process.env.DASHBOARD_HOST ?? "127.0.0.1";
app.listen(PORT, HOST, () => {
  console.log(`Dashboard: http://localhost:${PORT}/`);
  console.log(`Thumbnails: http://localhost:${PORT}/videos/thumbnails/`);
});
