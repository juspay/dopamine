import express from "express";
import cron from "node-cron";
import { runFullPipeline } from "../pipeline/runner.js";
import { runHealthCheck }  from "../pipeline/health-check.js";
import { getLogger }       from "../utils/logger.js";

const app  = express();
const log  = getLogger({ agent: "webhook" });
let running = false;

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (per-IP, 10 requests / minute)
// ---------------------------------------------------------------------------
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;

app.use((req, res, next) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  next();
});

app.use(express.json({ limit: "1mb" }));

app.post("/trigger", async (_req, res) => {
  if (running) {
    res.status(409).json({ status: "running", message: "Pipeline already running" });
    return;
  }
  log.info("Pipeline triggered via /trigger endpoint");
  res.json({ status: "started", message: "Pipeline triggered" });
  running = true;
  try {
    await runFullPipeline();
  } finally {
    running = false;
  }
});

app.get("/status", (_req, res) => {
  res.json({ running });
});

app.get("/health", async (_req, res) => {
  try {
    const report = await runHealthCheck();
    const statusCode = report.overall === "healthy" ? 200 : report.overall === "degraded" ? 200 : 503;
    res.status(statusCode).json(report);
  } catch (err) {
    log.error("Health check failed", { error: String(err) });
    res.status(500).json({ error: "Health check failed", details: String(err) });
  }
});

// Daily 3am cron
cron.schedule("0 3 * * *", async () => {
  if (running) { log.info("Cron: pipeline already running, skipping"); return; }
  log.info("Cron: triggering daily pipeline run");
  running = true;
  try {
    await runFullPipeline();
  } finally {
    running = false;
  }
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => log.info(`Webhook server listening on port ${PORT}`));
