import { execa, ExecaError } from "execa";

export async function runDownloadAgent(): Promise<void> {
  console.log("Running video download (Python/instagrapi)...");
  try {
    await execa("python3", ["scripts/download_videos.py"], {
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
      stdout: "inherit",
      stderr: "inherit",
    });
  } catch (err) {
    // execa rejects when the child exits with a non-zero code. The Python
    // script already printed a clear actionable message before exiting, so we
    // re-throw with the exit code to ensure the pipeline step is marked as
    // failed (rather than swallowing the error silently).
    const exitCode = err instanceof ExecaError ? err.exitCode : undefined;
    throw new Error(
      `download_videos.py exited with code ${exitCode ?? "unknown"}. ` +
        "See output above for the required action (e.g. run `python3 scripts/ig_login.py`).",
    );
  }
}
