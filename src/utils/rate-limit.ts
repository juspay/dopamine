export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type BackoffResult<T> = { success: true; value: T } | { success: false; error: string };

/** Longest single wait between attempts, so the exponential rate-limit backoff stays bounded. */
export const MAX_RETRY_DELAY_MS = 90_000;

/**
 * Juspay's Google Cloud accepts Vertex AI calls only from its network, so while the work VPN is
 * down every call is refused ("Request is prohibited by organization's policy", surfaced by
 * NeuroLink as "Google Vertex AI Permission Denied"). That says nothing about the item, so it
 * must never be saved as the item's result.
 */
const AI_REFUSAL = /Vertex AI Permission Denied|prohibited by organization'?s policy/i;

/** Thrown once AI calls have been refused for longer than the outage wait: the step stops, and
 * items it did not reach are left for the next run instead of being saved as failed. */
export class AiUnavailableError extends Error {
  constructor(lastError: string) {
    super(
      `AI is unavailable: Vertex AI has refused calls for over ${AI_OUTAGE.waitMs / 60_000} minutes. Is the VPN connected? Last error: ${lastError.slice(0, 150)}`,
    );
    this.name = "AiUnavailableError";
  }
}

export function isAiUnavailable(err: unknown): err is AiUnavailableError {
  return err instanceof AiUnavailableError;
}

/** How a refusal is handled: re-ask every `pollMs`, for at most `waitMs` of one unbroken outage. */
export const AI_OUTAGE = { pollMs: 30_000, waitMs: 30 * 60_000 };

// One outage per process: once the run gives up on AI, every later AI call stops at once.
let outageSince: number | null = null;
let aiDeferred = false;

/** Forgets any outage (each run is its own process; tests share one). */
export function resetAiOutage(): void {
  outageSince = null;
  aiDeferred = false;
}

/** Waits out a refused AI call; throws AiUnavailableError once the outage outlasts the wait. */
async function waitOutRefusal(msg: string): Promise<void> {
  const now = Date.now();
  if (outageSince === null) {
    outageSince = now;
    console.warn(
      `  [ai] Vertex AI refused the call (is the VPN connected?). Waiting for it, up to ${AI_OUTAGE.waitMs / 60_000} minutes.`,
    );
  }
  if (now - outageSince >= AI_OUTAGE.waitMs) {
    aiDeferred = true;
    console.error("  [ai] AI is still refused; this run's remaining AI work is left for the next run.");
    throw new AiUnavailableError(msg);
  }
  await sleep(AI_OUTAGE.pollMs);
}

function noteAiBack(): void {
  if (outageSince === null) return;
  console.log(`  [ai] AI calls work again after ${Math.round((Date.now() - outageSince) / 1000)}s.`);
  outageSince = null;
}

/** Exponential for rate limits, linear for transient errors, capped at `maxDelayMs`. */
function retryDelay(msg: string, attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const isRateLimit = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.toLowerCase().includes("quota");
  return Math.min(maxDelayMs, isRateLimit ? baseDelayMs * 2 ** attempt : baseDelayMs * (attempt + 1));
}

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number,
  maxDelayMs: number = MAX_RETRY_DELAY_MS,
): Promise<BackoffResult<T>> {
  if (aiDeferred) throw new AiUnavailableError("an earlier call in this run");
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const value = await fn();
      noteAiBack();
      return { success: true, value };
    } catch (err) {
      const msg = String(err);
      // A refusal does not use up an attempt: the call is asked again until AI is back.
      if (AI_REFUSAL.test(msg)) {
        await waitOutRefusal(msg);
        continue;
      }
      if (attempt === maxRetries - 1) {
        console.error(`  Failed after ${maxRetries} attempts: ${msg.slice(0, 200)}`);
        return { success: false, error: msg };
      }
      const delay = retryDelay(msg, attempt, baseDelayMs, maxDelayMs);
      console.warn(`  Attempt ${attempt + 1}/${maxRetries}: ${msg.slice(0, 100)}`);
      console.warn(`  Retrying in ${delay / 1000}s...`);
      await sleep(delay);
      attempt++;
    }
  }
  return { success: false, error: "Max retries exceeded" };
}
