// src/utils/vtt.ts
/**
 * Convert a WebVTT caption string to plain text.
 * Strips the WEBVTT header block (including metadata lines such as Kind/Language
 * emitted by yt-dlp), bare cue-index lines, timing lines
 * ("00:00:01.000 --> 00:00:03.000 ..."), NOTE comment blocks emitted by yt-dlp,
 * and inline tags (<c>, <00:00:01.000>, ...).
 * Collapses consecutive duplicate lines (auto-captions repeat the prior line with a
 * newly spoken word appended). Joins the remaining lines with "\n".
 */
export function vttToText(vtt: string): string {
  const out: string[] = [];
  // The WEBVTT header block ends at the first blank line.  Everything before
  // that first blank line is header metadata (e.g. "Kind: captions",
  // "Language: en" produced by yt-dlp) and must be skipped entirely.
  let headerDone = false;
  // awaitingTiming is true immediately after a blank line (the position where
  // WebVTT cue sequence numbers appear).  We only suppress all-digit lines in
  // that state so that cue text that happens to be entirely numeric (e.g. a
  // year like "2024" or a count like "42") is preserved when it follows a
  // timing line rather than a blank separator.
  let awaitingTiming = false;
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!headerDone) {
      if (line === "") {
        headerDone = true;
        // The blank line that ends the header is also the first cue separator,
        // so the very next non-blank line may be a cue sequence number.
        awaitingTiming = true;
      }
      // Skip every line (including WEBVTT itself and Kind/Language/etc.)
      // until the first blank separator has been seen.
      continue;
    }
    if (line === "") {
      awaitingTiming = true;
      continue;
    }
    // NOTE blocks (e.g. "NOTE duration=\"00:00:10.000\"") are yt-dlp comment
    // blocks that appear between cues and must be skipped entirely.
    if (/^NOTE(\s|$)/.test(line)) continue;
    if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s+-->\s+/.test(line)) {         // timing line
      awaitingTiming = false;
      continue;
    }
    // Bare cue sequence numbers sit immediately before a timing line (i.e. right
    // after a blank separator).  Only suppress all-digit lines in that position
    // so that numeric cue text (e.g. "2024", "42") is not silently discarded.
    if (awaitingTiming && /^\d+$/.test(line)) continue;
    awaitingTiming = false;
    const cleaned = line.replace(/<[^>]*>/g, "").trim();              // inline tags
    if (cleaned === "") continue;
    if (out.length > 0 && out[out.length - 1] === cleaned) continue;  // collapse dups
    out.push(cleaned);
  }
  return out.join("\n");
}
