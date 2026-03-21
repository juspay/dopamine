import express from "express";
import cron from "node-cron";
import { runFullPipeline } from "../pipeline/runner.js";

const app  = express();
let running = false;

app.use(express.json());

app.post("/trigger", async (_req, res) => {
  if (running) {
    res.status(409).json({ status: "running", message: "Pipeline already running" });
    return;
  }
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

// Daily 3am cron
cron.schedule("0 3 * * *", async () => {
  if (running) { console.log("Cron: pipeline already running, skipping"); return; }
  console.log("Cron: triggering daily pipeline run");
  running = true;
  try {
    await runFullPipeline();
  } finally {
    running = false;
  }
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => console.log(`Webhook server on port ${PORT}`));
