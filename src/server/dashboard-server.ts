import express from "express";
import compression from "compression";
import path from "node:path";
import fs from "node:fs/promises";

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
// Serve the SvelteKit app (index.html, _app/, data/) at root
// ---------------------------------------------------------------------------
app.use(express.static(path.resolve("dashboard"), { dotfiles: "deny" }));

// ---------------------------------------------------------------------------
// Serve video files
// ---------------------------------------------------------------------------
app.use(
  "/videos",
  express.static(path.resolve("videos"), { dotfiles: "deny", redirect: false }),
);

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for all unknown client-side routes.
// Real static files (app bundle, /data/*, /videos/*) are served by the static
// middleware above. Only genuine asset requests (identified by a known file
// extension) 404 here — so client routes like /videos or /creator/example
// (note the dot) correctly resolve to the SPA shell instead of 404ing.
// ---------------------------------------------------------------------------
const ASSET_RE =
  /\.(?:js|mjs|css|map|json|ico|png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|woff2?|ttf|eot|txt|xml|wasm)$/i;

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
    res
      .type("html")
      .send(await fs.readFile(path.resolve("dashboard/index.html"), "utf-8"));
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
