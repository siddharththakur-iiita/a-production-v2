/**
 * src/features/contact/__tests__/contact.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../contact.repository';
import * as service from '../contact.service';
import { ContactError } from '../contact.errors';
import type { InquiryRow } from '../../../lib/supabase/database.types';

vi.mock('../contact.repository');

function makeInquiryRow(overrides: Partial<InquiryRow> = {}): InquiryRow {
  return {
    id: 'inq-1',
    customer_id: null,
    order_id: null,
    inquiry_type: 'general',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    subject: 'Question about bespoke sherwanis',
    message: 'Do you ship internationally?',
    status: 'new',
    handled_by: null,
    source_page: '/contact',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

describe('contact.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('submitInquiry', () => {
    it('rejects an invalid email before calling the RPC', async () => {
      await expect(
        service.submitInquiry({
          name: 'Jane Doe',
          email: 'not-an-email',
          subject: 'Hello',
          message: 'Test message',
        })
      ).rejects.toThrow(ContactError);

      expect(repo.submitInquiryRpc).not.toHaveBeenCalled();
    });

    it('calls the RPC with validated fields on success', async () => {
      vi.mocked(repo.submitInquiryRpc).mockResolvedValue('inq-1');

      const result = await service.submitInquiry({
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'Question',
        message: 'Do you ship internationally?',
      });

      expect(repo.submitInquiryRpc).toHaveBeenCalledWith(
        expect.objectContaining({ p_name: 'Jane Doe', p_email: 'jane@example.com' })
      );
      expect(result).toBe('inq-1');
    });
  });

  describe('advanceInquiryStatus (state machine)', () => {
    it('allows new -> contacted', async () => {
      vi.mocked(repo.findInquiryById).mockResolvedValue(makeInquiryRow({ status: 'new' }));
      vi.mocked(repo.updateInquiryStatusRow).mockResolvedValue(makeInquiryRow({ status: 'contacted' }));

      const result = await service.advanceInquiryStatus('inq-1', 'contacted');

      expect(result.status).toBe('contacted');
    });

    it('allows new -> closed directly (skipping contacted, e.g. spam)', async () => {
      vi.mocked(repo.findInquiryById).mockResolvedValue(makeInquiryRow({ status: 'new' }));
      vi.mocked(repo.updateInquiryStatusRow).mockResolvedValue(makeInquiryRow({ status: 'closed' }));

      const result = await service.advanceInquiryStatus('inq-1', 'closed');

      expect(result.status).toBe('closed');
    });

    it('rejects any transition out of closed', async () => {
      vi.mocked(repo.findInquiryById).mockResolvedValue(makeInquiryRow({ status: 'closed' }));

      const error: ContactError = await service.advanceInquiryStatus('inq-1', 'new').catch((e) => e);

      expect(error).toBeInstanceOf(ContactError);
      expect(repo.updateInquiryStatusRow).not.toHaveBeenCalled();
    });

    it('throws inquiry_not_found for a nonexistent inquiry', async () => {
      vi.mocked(repo.findInquiryById).mockResolvedValue(null);

      const error: ContactError = await service.advanceInquiryStatus('missing', 'closed').catch((e) => e);

      expect(error.code).toBe('inquiry_not_found');
    });
  });
});
