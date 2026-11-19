export interface YtDlpOptions {
  /** Local address to send from, so a VPN on the default route does not block YouTube. */
  sourceAddress?: string;
  /** Netscape cookie file; only passed for the age-restricted retry. */
  cookiesFile?: string;
}

function optionArgs(o: YtDlpOptions): string[] {
  return [
    ...(o.sourceAddress ? ["--source-address", o.sourceAddress] : []),
    ...(o.cookiesFile ? ["--cookies", o.cookiesFile] : []),
  ];
}

export function buildCaptionArgs(videoId: string, outTemplate: string, o: YtDlpOptions = {}): string[] {
  return [
    "--write-subs",
    "--write-auto-subs",
    "--sub-langs",
    "en",
    "--skip-download",
    ...optionArgs(o),
    "-o",
    outTemplate,
    `https://www.youtube.com/watch?v=${videoId}`,
  ];
}

export function buildVideoArgs(videoId: string, outTemplate: string, o: YtDlpOptions = {}): string[] {
  return ["-f", "mp4", ...optionArgs(o), "-o", outTemplate, `https://www.youtube.com/watch?v=${videoId}`];
}

/**
 * What to say when yt-dlp fails: its own last ERROR line. Never the command line, which
 * would put the cookie file's path into logs and the retry ledger.
 */
export function ytDlpFailureMessage(r: {
  stderr?: string;
  exitCode?: number;
  timedOut?: boolean;
  command?: string;
}): string {
  const errorLine = (r.stderr ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("ERROR:"))
    .at(-1);
  if (errorLine) return errorLine;
  if (r.timedOut) return "yt-dlp timed out";
  return `yt-dlp exited with code ${r.exitCode ?? "unknown"}`;
}
