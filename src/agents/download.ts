import { execa } from "execa";

export async function runDownloadAgent(): Promise<void> {
  console.log("Running video download (Python/instagrapi)...");
  await execa("python3", ["scripts/download_videos.py"], {
    cwd: process.cwd(),
    env: process.env as Record<string, string>,
    stdout: "inherit",
    stderr: "inherit",
  });
}
