import express from "express";
import path from "node:path";

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
    "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self'",
  );
  next();
});

// ---------------------------------------------------------------------------
// Block access to sensitive files — deny before static middleware
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const lowerPath = req.path.toLowerCase();

  // Block dotfiles (.env, .git, etc.)
  if (lowerPath.includes("/.") || lowerPath.startsWith(".")) {
    res.status(403).send("Forbidden");
    return;
  }

  // Only allow /dashboard/ and /videos/ paths
  if (
    !lowerPath.startsWith("/dashboard") &&
    !lowerPath.startsWith("/videos")
  ) {
    res.status(404).send("Not found");
    return;
  }

  next();
});

// ---------------------------------------------------------------------------
// Serve only the directories the dashboard needs:
//   /dashboard/  -> dashboard/index.html
//   /videos/     -> videos/thumbnails/*.jpg, videos/user_saved/*.mp4
// ---------------------------------------------------------------------------
app.use(
  "/dashboard",
  express.static(path.resolve("dashboard"), { dotfiles: "deny" }),
);
app.use(
  "/videos",
  express.static(path.resolve("videos"), { dotfiles: "deny" }),
);

const PORT = parseInt(process.env.DASHBOARD_PORT ?? "3001", 10);
app.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}/dashboard/`);
  console.log(`Thumbnails: http://localhost:${PORT}/videos/thumbnails/`);
});
