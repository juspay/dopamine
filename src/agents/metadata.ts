import { execa } from "execa";

export async function runMetadataAgent(): Promise<void> {
  console.log("Running metadata collection (Python/instagrapi)...");
  await execa("python3", ["scripts/collect_metadata.py"], {
    cwd: process.cwd(),
    env: process.env as Record<string, string>,
    stdout: "inherit",
    stderr: "inherit",
  });
}
