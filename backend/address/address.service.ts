/**
 * src/features/address/address.service.ts
 */
import * as repo from './address.repository';
import {
  mapAddressRow,
  type Address,
  type CreateAddressInput,
  type UpdateAddressInput,
} from './address.types';
import { createAddressSchema, updateAddressSchema } from './address.validation';
import { mapAddressPostgrestError, mapAddressZodError } from './address.errors';

export async function listAddressesForCustomer(customerId: string): Promise<Address[]> {
  try {
    const rows = await repo.findAddressesForCustomer(customerId);
    return rows.map(mapAddressRow);
  } catch (err) {
    throw mapAddressPostgrestError(err as never);
  }
}

export async function getAddressById(id: string): Promise<Address | null> {
  try {
    const row = await repo.findAddressById(id);
    return row ? mapAddressRow(row) : null;
  } catch (err) {
    throw mapAddressPostgrestError(err as never);
  }
}

/**
 * Creates an address. If this is the customer's first address, it is
 * forced to isDefault = true regardless of the input — a customer
 * with an address book but no default address is a real checkout UX
 * gap (nothing to pre-select), so this business rule is enforced here
 * rather than left to the caller to remember.
 */
export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const parsed = createAddressSchema.safeParse(input);
  if (!parsed.success) throw mapAddressZodError(parsed.error);

  try {
    const existing = await repo.findAddressesForCustomer(parsed.data.customerId);
    const isFirstAddress = existing.length === 0;

    const row = await repo.insertAddress({
      customer_id: parsed.data.customerId,
      label: parsed.data.label,
      line1: parsed.data.line1,
      line2: parsed.data.line2,
      city: parsed.data.city,
      state: parsed.data.state,
      postal_code: parsed.data.postalCode,
      country: parsed.data.country,
      is_default: isFirstAddress ? true : parsed.data.isDefault,
    });
    return mapAddressRow(row);
  } catch (err) {
    throw mapAddressPostgrestError(err as never);
  }
}

export async function updateAddress(id: string, input: UpdateAddressInput): Promise<Address> {
  const parsed = updateAddressSchema.safeParse(input);
  if (!parsed.success) throw mapAddressZodError(parsed.error);

  try {
    const row = await repo.updateAddressRow(id, {
      label: parsed.data.label,
      line1: parsed.data.line1,
      line2: parsed.data.line2,
      city: parsed.data.city,
      state: parsed.data.state,
      postal_code: parsed.data.postalCode,
      country: parsed.data.country,
    });
    return mapAddressRow(row);
  } catch (err) {
    throw mapAddressPostgrestError(err as never);
  }
}

export async function setDefaultAddress(id: string): Promise<Address> {
  try {
    const row = await repo.setAddressDefault(id);
    return mapAddressRow(row);
  } catch (err) {
    throw mapAddressPostgrestError(err as never);
  }
}

export async function deleteAddress(id: string): Promise<void> {
  try {
    await repo.softDeleteAddress(id);
  } catch (err) {
    throw mapAddressPostgrestError(err as never);
  }
}
