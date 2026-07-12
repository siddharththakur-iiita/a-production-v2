/**
 * src/features/customer/__tests__/customer.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../customer.repository';
import * as service from '../customer.service';
import { CustomerError } from '../customer.errors';
import type { ReferralRow } from '../../../lib/supabase/database.types';

vi.mock('../customer.repository');

const REFERRER_ID = '11111111-1111-1111-1111-111111111111';
const REFERRED_ID = '22222222-2222-2222-2222-222222222222';

function makeReferralRow(overrides: Partial<ReferralRow> = {}): ReferralRow {
  return {
    id: 'ref-1',
    referrer_customer_id: REFERRER_ID,
    referred_customer_id: REFERRED_ID,
    code: 'freshly-generated-uuid',
    status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('customer.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('redeemReferralCode', () => {
    it('rejects a code that is not a valid UUID shape before calling the repository', async () => {
      await expect(
        service.redeemReferralCode({ code: 'not-a-uuid', referredCustomerId: REFERRED_ID })
      ).rejects.toThrow(CustomerError);

      expect(repo.insertReferral).not.toHaveBeenCalled();
    });

    it('rejects self-referral (code equals referredCustomerId) before calling the repository', async () => {
      const error: CustomerError = await service
        .redeemReferralCode({ code: REFERRED_ID, referredCustomerId: REFERRED_ID })
        .catch((e) => e);

      expect(error).toBeInstanceOf(CustomerError);
      expect(error.code).toBe('self_referral_not_allowed');
      expect(repo.insertReferral).not.toHaveBeenCalled();
    });

    it('inserts a referral with the code resolved as referrer_customer_id and a freshly generated row code', async () => {
      vi.mocked(repo.insertReferral).mockResolvedValue(makeReferralRow());

      const result = await service.redeemReferralCode({ code: REFERRER_ID, referredCustomerId: REFERRED_ID });

      expect(repo.insertReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer_customer_id: REFERRER_ID,
          referred_customer_id: REFERRED_ID,
        })
      );
      const insertedArg = vi.mocked(repo.insertReferral).mock.calls[0][0];
      expect(insertedArg.code).not.toBe(REFERRER_ID);
      expect(result.status).toBe('pending');
    });
  });

  describe('getMyReferralIdentifier', () => {
    it('returns the customer id unchanged (the shareable identifier IS the customer_id)', () => {
      expect(service.getMyReferralIdentifier(REFERRER_ID)).toBe(REFERRER_ID);
    });
  });

  describe('issueLoyaltyAdjustment', () => {
    it('rejects a zero pointsDelta before calling the repository', async () => {
      await expect(
        service.issueLoyaltyAdjustment({
          loyaltyAccountId: '33333333-3333-3333-3333-333333333333',
          pointsDelta: 0,
          reason: 'Goodwill',
        })
      ).rejects.toThrow(CustomerError);

      expect(repo.insertLoyaltyTransaction).not.toHaveBeenCalled();
    });
  });

  describe('createCustomerTier', () => {
    it('rejects an empty name before calling the repository', async () => {
      await expect(service.createCustomerTier({ name: '' })).rejects.toThrow(CustomerError);
      expect(repo.insertCustomerTier).not.toHaveBeenCalled();
    });
  });
});
