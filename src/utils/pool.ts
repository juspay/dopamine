/**
 * Run `fn` over `items` with at most `concurrency` calls in flight.
 *
 * If a call throws, no new item is started, the calls already running are awaited,
 * and then the first error is thrown. Items after the failure are simply not reached.
 */
export async function runPool<T>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  let failed = false;
  let firstError: unknown;

  async function worker(): Promise<void> {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        await fn(items[index], index);
      } catch (err) {
        if (!failed) {
          failed = true;
          firstError = err;
        }
      }
    }
  }

  const n = Math.max(1, Math.min(Math.floor(concurrency) || 1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  if (failed) throw firstError;
}
