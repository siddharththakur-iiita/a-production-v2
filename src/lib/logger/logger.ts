/**
 * src/lib/logger/logger.ts
 *
 * Structured logging with two output modes:
 *   - development: human-readable, colorized console output.
 *   - production: single-line JSON per entry, safe for log
 *     aggregators (CloudWatch, Datadog, etc.) to parse without a
 *     custom parser — one JSON object per line, no multi-line
 *     pretty-printing.
 * Mode is selected via env/env.ts's isProduction()/isDevelopment(),
 * not reimplemented here.
 */
import { isProduction } from '../env/env';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string };
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL: LogLevel = isProduction() ? 'info' : 'debug';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET_COLOR = '\x1b[0m';

function serializeError(error: unknown): LogEntry['error'] | undefined {
  if (!(error instanceof Error)) return undefined;
  return { name: error.name, message: error.message, stack: error.stack };
}

function emit(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
    ...(error !== undefined ? { error: serializeError(error) } : {}),
  };

  if (isProduction()) {
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
    return;
  }

  const color = LEVEL_COLORS[level];
  const prefix = `${color}[${level.toUpperCase()}]${RESET_COLOR} ${entry.timestamp}`;
  const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

  if (level === 'error') {
    console.error(`${prefix} ${message}${contextStr}`);
    if (entry.error?.stack) console.error(entry.error.stack);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}${contextStr}`);
  } else {
    console.log(`${prefix} ${message}${contextStr}`);
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    emit('debug', message, context);
  },
  info(message: string, context?: LogContext): void {
    emit('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    emit('warn', message, context);
  },
  error(message: string, error?: unknown, context?: LogContext): void {
    emit('error', message, context, error);
  },
  child(boundContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) => emit('debug', message, { ...boundContext, ...context }),
      info: (message: string, context?: LogContext) => emit('info', message, { ...boundContext, ...context }),
      warn: (message: string, context?: LogContext) => emit('warn', message, { ...boundContext, ...context }),
      error: (message: string, error?: unknown, context?: LogContext) =>
        emit('error', message, { ...boundContext, ...context }, error),
    };
  },
};
