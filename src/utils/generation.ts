// src/utils/generation.ts

interface GenerationResult {
  content?: string;
  finishReason?: string;
  jsonTruncated?: boolean;
  stopReason?: string;
}

/**
 * Throw if the turn ended early instead of parsing what is left: the model hit
 * `maxTokens`, or Neurolink stopped the turn (time limit, step cap, abort,
 * provider error). A cut-off answer is not an empty one: a half-written URL
 * still looks like a URL, repaired JSON still validates, and a stopped tool
 * loop returns a canned "I had to stop" sentence as `content`. Without this the
 * damage lands in state files as plausible-looking data. Thrown inside the
 * agents' retry wrapper, the failure is logged and retried like any other.
 */
export function assertNotTruncated<T extends GenerationResult>(response: T, label: string): T {
  if (response.finishReason === "length" || response.jsonTruncated === true) {
    throw new Error(`${label}: response truncated by maxTokens (finishReason=${response.finishReason ?? "n/a"})`);
  }
  if (response.stopReason !== undefined && response.stopReason !== "completed") {
    throw new Error(`${label}: turn did not complete (stopReason=${response.stopReason})`);
  }
  return response;
}
