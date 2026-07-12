/**
 * src/lib/errors/index.ts
 */
export {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError,
} from './globalErrors';
export { mapUnknownError } from './errorMapper';
export { AppError } from '../supabase/postgrestErrors';
