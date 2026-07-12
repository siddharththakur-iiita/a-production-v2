/**
 * src/lib/utils/asyncWrapper.ts
 *
 * A Go-style [error, data] tuple wrapper for call sites that want to
 * handle a failure inline without a try/catch block — most useful in
 * webhook handlers and scheduled jobs (this infra layer's own
 * Razorpay webhook handlers, for instance) where a try/catch per
 * awaited call reads worse than a flat check.
 */

export type SafeResult<T> = [error: null, data: T] | [error: Error, data: null];

export async function safeAsync<T>(promise: Promise<T>): Promise<SafeResult<T>> {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

export async function bestEffort(fn: () => Promise<void>, onError?: (error: unknown) => void): Promise<void> {
  try {
    await fn();
  } catch (error) {
    onError?.(error);
  }
}
