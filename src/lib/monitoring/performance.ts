/**
 * src/lib/monitoring/performance.ts
 *
 * A mark/measure-style performance API, complementary to
 * requestTiming.ts's function-wrapping style (withTiming) — useful
 * when the operation being measured isn't a single awaitable call but
 * a sequence of steps within one larger function (e.g. checkout:
 * validate -> price -> apply coupon -> compute tax, each worth timing
 * individually without wrapping each one in its own withTiming call).
 */
import { logger } from '../logger';

const marks = new Map<string, number>();

export function mark(name: string): void {
  marks.set(name, performance.now());
}

export function measure(label: string, startMark: string, context?: Record<string, unknown>): number {
  const start = marks.get(startMark);
  if (start === undefined) {
    logger.warn(`performance.measure: no mark found for "${startMark}"`, { label });
    return 0;
  }

  const durationMs = Math.round(performance.now() - start);
  logger.debug(label, { ...context, durationMs });
  return durationMs;
}

export function clearMark(name: string): void {
  marks.delete(name);
}

export function clearAllMarks(): void {
  marks.clear();
}
