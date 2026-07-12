/**
 * src/lib/imagekit/imagekit.errors.ts
 *
 * Extends the same AppError base every business module's own error
 * class already extends (postgrestErrors.ts) — one error hierarchy
 * root for the whole codebase, business modules and infrastructure
 * alike.
 */
import { AppError } from '../supabase/postgrestErrors';

export type ImageKitErrorCode =
  | 'validation_failed'
  | 'file_too_large'
  | 'invalid_file_type'
  | 'upload_failed'
  | 'delete_failed'
  | 'not_found'
  | 'unknown';

export class ImageKitError extends AppError {
  readonly code: ImageKitErrorCode;
  constructor(code: ImageKitErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ImageKitError';
    this.code = code;
  }
}

export function mapImageKitError(error: unknown): ImageKitError {
  if (error instanceof ImageKitError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('file size') || lower.includes('too large')) {
    return new ImageKitError('file_too_large', 'The file exceeds the maximum allowed size.', error);
  }
  if (lower.includes('file type') || lower.includes('unsupported')) {
    return new ImageKitError('invalid_file_type', 'This file type is not supported.', error);
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return new ImageKitError('not_found', 'The requested file could not be found.', error);
  }

  return new ImageKitError('unknown', message, error);
}
