/**
 * src/features/address/address.validation.ts
 *
 * Mirrors the app_iso_country_code domain (002_types.sql): a
 * two-letter, upper-case ISO-3166-1 alpha-2 code.
 */
import { z } from 'zod';
import { requireAtLeastOneField } from '../../lib/validation/commonSchemas';

const countrySchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/, 'Country must be a 2-letter uppercase ISO-3166-1 code');

export const createAddressSchema = z.object({
  customerId: z.string().uuid(),
  label: z.string().max(50).optional(),
  line1: z.string().min(1, 'Address line 1 is required').max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: countrySchema.optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = requireAtLeastOneField(
  z.object({
    label: z.string().max(50).nullable().optional(),
    line1: z.string().min(1).max(200).optional(),
    line2: z.string().max(200).nullable().optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    postalCode: z.string().min(1).max(20).optional(),
    country: countrySchema.optional(),
  })
);

export type CreateAddressValidated = z.infer<typeof createAddressSchema>;
export type UpdateAddressValidated = z.infer<typeof updateAddressSchema>;
