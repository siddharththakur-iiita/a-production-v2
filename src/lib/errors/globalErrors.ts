/**
 * src/lib/errors/globalErrors.ts
 *
 * Generic, module-agnostic error classes for infrastructure code that
 * isn't tied to one of the 15 business modules' own {Module}Error
 * classes — e.g. an Edge Function's top-level request validation
 * before a request has even been routed to a specific module's
 * service layer. All extend the same AppError base every other error
 * class in this codebase already extends.
 */
import { AppError } from '../supabase/postgrestErrors';

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required for this action.', cause?: unknown) {
    super(message, cause);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.', cause?: unknown) {
    super(message, cause);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.', cause?: unknown) {
    super(message, cause);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ConflictError';
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected internal error occurred.', cause?: unknown) {
    super(message, cause);
    this.name = 'InternalError';
  }
}
