/**
 * src/lib/utils/retry.ts
 *
 * Generic retry-with-exponential-backoff, for infrastructure calls
 * that can genuinely fail transiently (a third-party API timeout, a
 * momentary network blip) — NOT for business-logic failures (a
 * validation error retried is still a validation error). Callers
 * decide which errors are worth retrying via `shouldRetry`; the
 * default only retries network-shaped failures, never anything that
 * looks like a 4xx/validation failure.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 200,
  maxDelayMs: 5000,
  backoffFactor: 2,
};

function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('fetch failed') ||
      message.includes('rate limit')
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === opts.maxAttempts;
      if (isLastAttempt || !shouldRetry(error, attempt)) {
        throw error;
      }

      await sleep(delay);
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelayMs);
    }
  }

  throw lastError;
}
