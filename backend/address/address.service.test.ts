/**
 * src/features/address/__tests__/address.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../address.repository';
import * as service from '../address.service';
import { AddressError } from '../address.errors';
import type { AddressRow } from '../../../lib/supabase/database.types';

vi.mock('../address.repository');

const CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';

function makeAddressRow(overrides: Partial<AddressRow> = {}): AddressRow {
  return {
    id: 'addr-1',
    customer_id: CUSTOMER_ID,
    label: 'Home',
    line1: '21 Marine Drive',
    line2: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    postal_code: '400002',
    country: 'IN',
    is_default: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

describe('address.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createAddress', () => {
    it('rejects invalid input before calling the repository', async () => {
      await expect(
        service.createAddress({
          customerId: CUSTOMER_ID,
          line1: '',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400002',
        })
      ).rejects.toThrow(AddressError);

      expect(repo.insertAddress).not.toHaveBeenCalled();
    });

    it('forces isDefault to true for a customer\'s first address, ignoring the input value', async () => {
      vi.mocked(repo.findAddressesForCustomer).mockResolvedValue([]); // no existing addresses
      vi.mocked(repo.insertAddress).mockResolvedValue(makeAddressRow({ is_default: true }));

      await service.createAddress({
        customerId: CUSTOMER_ID,
        line1: '21 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400002',
        isDefault: false, // deliberately false — should be overridden
      });

      expect(repo.insertAddress).toHaveBeenCalledWith(
        expect.objectContaining({ is_default: true })
      );
    });

    it('respects the requested isDefault value when the customer already has addresses', async () => {
      vi.mocked(repo.findAddressesForCustomer).mockResolvedValue([makeAddressRow({ is_default: true })]);
      vi.mocked(repo.insertAddress).mockResolvedValue(makeAddressRow({ id: 'addr-2', is_default: false }));

      await service.createAddress({
        customerId: CUSTOMER_ID,
        line1: '5 Office Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400003',
        isDefault: false,
      });

      expect(repo.insertAddress).toHaveBeenCalledWith(expect.objectContaining({ is_default: false }));
    });
  });

  describe('updateAddress', () => {
    it('rejects an empty update payload before calling the repository', async () => {
      await expect(service.updateAddress('addr-1', {})).rejects.toThrow(AddressError);
      expect(repo.updateAddressRow).not.toHaveBeenCalled();
    });
  });
});
