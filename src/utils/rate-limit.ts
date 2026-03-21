export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type BackoffResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number
): Promise<BackoffResult<T>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return { success: true, value: await fn() };
    } catch (err) {
      const msg = String(err);
      const isRateLimit =
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.toLowerCase().includes("quota");

      if (attempt < maxRetries - 1) {
        // Exponential for rate limits, linear for transient errors
        const delay = isRateLimit
          ? baseDelayMs * 2 ** attempt
          : baseDelayMs * (attempt + 1);
        console.warn(`  Attempt ${attempt + 1}/${maxRetries}: ${msg.slice(0, 100)}`);
        console.warn(`  Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        console.error(`  Failed after ${maxRetries} attempts: ${msg.slice(0, 200)}`);
        return { success: false, error: msg };
      }
    }
  }
  return { success: false, error: "Max retries exceeded" };
}
