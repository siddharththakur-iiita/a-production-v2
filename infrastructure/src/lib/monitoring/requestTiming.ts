/**
 * src/lib/monitoring/requestTiming.ts
 *
 * Wraps an async operation with timing, logged via the shared logger
 * (lib/logger) — used to time RPC calls, third-party API calls
 * (Razorpay/ImageKit/Resend), and Edge Function request handlers
 * uniformly, rather than each call site hand-rolling its own
 * Date.now()-diff logging.
 */
import { logger } from '../logger';

export interface TimedResult<T> {
  result: T;
  durationMs: number;
}

export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<TimedResult<T>> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);
    logger.debug(`${label} completed`, { ...context, durationMs });
    return { result, durationMs };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    logger.error(`${label} failed`, error, { ...context, durationMs });
    throw error;
  }
}

export async function withSlowWarning<T>(
  label: string,
  fn: () => Promise<T>,
  thresholdMs: number,
  context?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round(performance.now() - start);

  if (durationMs > thresholdMs) {
    logger.warn(`${label} took longer than expected`, { ...context, durationMs, thresholdMs });
  }

  return result;
}
