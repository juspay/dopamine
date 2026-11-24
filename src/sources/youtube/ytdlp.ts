export interface YtDlpOptions {
  /** Local address to send from, so a VPN on the default route does not block YouTube. */
  sourceAddress?: string;
  /** Netscape cookie file; only passed for the age-restricted retry. */
  cookiesFile?: string;
}

/**
 * YouTube answers requests whose JavaScript challenge is unsolved with throttling and HTTP 429.
 * yt-dlp solves it with a JavaScript runtime but looks only for Deno by default, so every call
 * names Node: the binary this pipeline already runs on. Needs the yt-dlp-ejs add-on
 * (pip install -U "yt-dlp[default]").
 */
export function jsRuntimeArgs(): string[] {
  return ["--js-runtimes", `node:${process.execPath}`];
}

function optionArgs(o: YtDlpOptions): string[] {
  return [
    ...jsRuntimeArgs(),
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

/**
 * A ready-made mp4 with sound when YouTube offers one. Otherwise the best mp4 video up to 720p
 * joined with its audio (yt-dlp runs ffmpeg), so a video served only as separate streams is
 * not saved silent. "-f mp4" alone picks a video-only stream for those.
 */
export const VIDEO_FORMAT = "b[ext=mp4]/bv*[ext=mp4][height<=720]+ba[ext=m4a]/bv*[height<=720]+ba/b";

export function buildVideoArgs(videoId: string, outTemplate: string, o: YtDlpOptions = {}): string[] {
  return [
    "-f",
    VIDEO_FORMAT,
    "--merge-output-format",
    "mp4",
    ...optionArgs(o),
    "-o",
    outTemplate,
    `https://www.youtube.com/watch?v=${videoId}`,
  ];
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
