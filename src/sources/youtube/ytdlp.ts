export function buildCaptionArgs(videoId: string, outTemplate: string): string[] {
  return [
    "--write-subs", "--write-auto-subs", "--sub-langs", "en", "--skip-download",
    "-o", outTemplate, `https://www.youtube.com/watch?v=${videoId}`,
  ];
}

export function buildVideoArgs(videoId: string, outTemplate: string): string[] {
  return ["-f", "mp4", "-o", outTemplate, `https://www.youtube.com/watch?v=${videoId}`];
}
