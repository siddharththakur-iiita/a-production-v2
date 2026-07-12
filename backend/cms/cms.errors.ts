/**
 * src/features/cms/cms.errors.ts
 *
 * Constraint names referenced here come directly from 011_cms.sql.
 */
import { AppError, classifyPostgrestError } from '../../lib/supabase/postgrestErrors';
import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';

export type CmsErrorCode =
  | 'validation_failed'
  | 'not_found'
  | 'page_key_already_in_use'
  | 'menu_key_already_in_use'
  | 'redirect_path_already_in_use'
  | 'contact_label_already_in_use'
  | 'promo_already_exists_for_item'
  | 'self_parent_not_allowed'
  | 'product_flag_mismatch'
  | 'permission_denied'
  | 'unknown';

export class CmsError extends AppError {
  readonly code: CmsErrorCode;
  constructor(code: CmsErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'CmsError';
    this.code = code;
  }
}

export function mapCmsZodError(error: z.ZodError): CmsError {
  const first = error.errors[0];
  return new CmsError('validation_failed', first?.message ?? 'Invalid CMS input.', error);
}

export function mapCmsPostgrestError(error: PostgrestError): CmsError {
  if (error.code === 'P0001' && error.message.includes('is not flagged')) {
    return new CmsError(
      'product_flag_mismatch',
      'This product does not have the matching featured/trending flag set.',
      error
    );
  }

  const classified = classifyPostgrestError(error);

  switch (classified.kind) {
    case 'not_found':
      return new CmsError('not_found', 'The requested content was not found.', error);

    case 'unique_violation':
      switch (classified.constraintName) {
        case 'page_key_key':
          return new CmsError('page_key_already_in_use', 'This page key is already in use.', error);
        case 'navigation_menu_key_key':
          return new CmsError('menu_key_already_in_use', 'This menu key is already in use.', error);
        case 'seo_redirect_from_path_key':
          return new CmsError(
            'redirect_path_already_in_use',
            'A redirect already exists for this source path.',
            error
          );
        case 'contact_info_label_key':
          return new CmsError('contact_label_already_in_use', 'This contact info label is already in use.', error);
        case 'mega_menu_promo_navigation_item_id_key':
          return new CmsError(
            'promo_already_exists_for_item',
            'This navigation item already has a promo — update it instead.',
            error
          );
        default:
          return new CmsError('unknown', error.message, error);
      }

    case 'check_violation':
      if (classified.constraintName === 'navigation_item_no_self_parent_check') {
        return new CmsError('self_parent_not_allowed', 'A navigation item cannot be its own parent.', error);
      }
      if (
        classified.constraintName === 'seo_redirect_from_path_format_check' ||
        classified.constraintName === 'seo_redirect_to_path_format_check'
      ) {
        return new CmsError('validation_failed', 'Redirect paths must start with /.', error);
      }
      return new CmsError('validation_failed', 'A CMS field failed validation.', error);

    case 'permission_denied':
      return new CmsError('permission_denied', 'You do not have permission to modify this content.', error);

    default:
      return new CmsError('unknown', error.message, error);
  }
}
