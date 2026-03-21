import express from "express";
import path from "node:path";

const app = express();

// Serve entire project root so relative paths in dashboard/index.html resolve:
// ../videos/thumbnails/*.jpg -> /videos/thumbnails/*.jpg
// ../videos/user_saved/*.mp4 -> /videos/user_saved/*.mp4
app.use(express.static(path.resolve(".")));

const PORT = parseInt(process.env.DASHBOARD_PORT ?? "3001", 10);
app.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}/dashboard/`);
  console.log(`Thumbnails: http://localhost:${PORT}/videos/thumbnails/`);
});
