/**
 * json-repair.ts — Utility to repair common Gemini JSON response issues.
 *
 * Gemini sometimes returns JSON wrapped in markdown fences, with trailing
 * commas, or with unescaped control characters inside strings. This module
 * provides a best-effort repair pass so callers can recover without a retry.
 */

/**
 * Strip markdown code fences (```json … ``` or ``` … ```) from a response.
 */
function stripMarkdownFences(raw: string): string {
  let text = raw.trim();

  // Match ```json or ``` at start, and ``` at end
  const fenceStart = /^```(?:json|JSON)?\s*\n?/;
  const fenceEnd = /\n?\s*```\s*$/;

  if (fenceStart.test(text) && fenceEnd.test(text)) {
    text = text.replace(fenceStart, "").replace(fenceEnd, "");
  }

  return text.trim();
}

/**
 * Remove trailing commas before } or ] which are illegal in JSON.
 *
 * E.g.  {"a": 1, "b": 2,}  →  {"a": 1, "b": 2}
 */
function fixTrailingCommas(text: string): string {
  // Trailing comma before closing brace/bracket (with optional whitespace)
  return text.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Fix unescaped newlines and tabs inside JSON string values.
 *
 * Strategy: walk character by character, tracking whether we are inside a
 * quoted string. When we encounter a literal newline or tab within a string,
 * replace it with the escaped version.
 */
function fixUnescapedControlChars(text: string): string {
  const result: string[] = [];
  let inString = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"' && (i === 0 || text[i - 1] !== "\\")) {
      inString = !inString;
      result.push(ch);
      i++;
      continue;
    }

    if (inString) {
      if (ch === "\n") {
        result.push("\\n");
        i++;
        continue;
      }
      if (ch === "\r") {
        result.push("\\r");
        i++;
        continue;
      }
      if (ch === "\t") {
        result.push("\\t");
        i++;
        continue;
      }
    }

    result.push(ch);
    i++;
  }

  return result.join("");
}

/**
 * Attempt to repair a raw Gemini response string so it parses as valid JSON.
 *
 * Applies repairs in order:
 *   1. Strip markdown fences
 *   2. Fix trailing commas
 *   3. Fix unescaped control characters inside strings
 *
 * Returns the cleaned string (caller is responsible for `JSON.parse`).
 */
export function repairJson(raw: string): string {
  let text = stripMarkdownFences(raw);
  text = fixTrailingCommas(text);
  text = fixUnescapedControlChars(text);
  return text;
}

/**
 * Convenience: parse JSON with automatic repair.
 *
 * 1. Try `JSON.parse(raw)` directly (fast path — no repair needed).
 * 2. If that fails, apply `repairJson` and retry.
 * 3. If still failing, throw with both the original error and the repaired text
 *    for debugging.
 */
export function safeJsonParse<T = unknown>(raw: string): T {
  // Fast path
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Fall through to repair
  }

  const repaired = repairJson(raw);
  try {
    return JSON.parse(repaired) as T;
  } catch (err) {
    // Log the raw response for debugging before re-throwing
    console.error("[json-repair] Failed to parse even after repair.");
    console.error("[json-repair] Raw response (first 500 chars):", raw.slice(0, 500));
    console.error("[json-repair] Repaired text (first 500 chars):", repaired.slice(0, 500));
    throw new Error(
      `JSON parse failed after repair: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
