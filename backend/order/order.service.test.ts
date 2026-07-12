/**
 * src/features/order/__tests__/order.service.test.ts
 *
 * Focused on the real business logic this module adds beyond CRUD:
 * the status-transition state machines and the checkout/refund
 * workflow orchestration.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../order.repository';
import * as service from '../order.service';
import { OrderError } from '../order.errors';
import type { OrderRow, ShipmentRow, ReturnRequestRow } from '../../../lib/supabase/database.types';

vi.mock('../order.repository');

function makeOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'order-1',
    customer_id: 'cust-1',
    order_number: 'AP-2026-000001',
    order_type: 'ready_made',
    status: 'paid',
    subtotal: '1000.00',
    discount_total: '0.00',
    tax_total: '0.00',
    shipping_total: '0.00',
    grand_total: '1000.00',
    currency: 'INR',
    shipping_address_id: 'addr-1',
    shipping_address_snapshot: {},
    billing_address_id: 'addr-1',
    placed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

function makeShipmentRow(overrides: Partial<ShipmentRow> = {}): ShipmentRow {
  return {
    id: 'ship-1',
    order_id: 'order-1',
    carrier: null,
    tracking_number: null,
    status: 'pending',
    shipped_at: null,
    delivered_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

function makeReturnRequestRow(overrides: Partial<ReturnRequestRow> = {}): ReturnRequestRow {
  return {
    id: 'ret-1',
    order_item_id: 'item-1',
    customer_id: 'cust-1',
    reason: 'Wrong size',
    status: 'requested',
    return_tracking_number: null,
    requested_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

describe('order.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('advanceOrderStatus (state machine)', () => {
    it('allows a valid transition (paid -> in_fulfillment)', async () => {
      vi.mocked(repo.findOrderById).mockResolvedValue(makeOrderRow({ status: 'paid' }));
      vi.mocked(repo.updateOrderStatusRow).mockResolvedValue(makeOrderRow({ status: 'in_fulfillment' }));

      const result = await service.advanceOrderStatus('order-1', 'in_fulfillment');

      expect(repo.updateOrderStatusRow).toHaveBeenCalledWith('order-1', 'in_fulfillment');
      expect(result.status).toBe('in_fulfillment');
    });

    it('rejects an invalid transition (paid -> delivered, skipping steps) without calling the repository', async () => {
      vi.mocked(repo.findOrderById).mockResolvedValue(makeOrderRow({ status: 'paid' }));

      const error: OrderError = await service.advanceOrderStatus('order-1', 'delivered').catch((e) => e);

      expect(error).toBeInstanceOf(OrderError);
      expect(error.code).toBe('validation_failed');
      expect(repo.updateOrderStatusRow).not.toHaveBeenCalled();
    });

    it('rejects any transition out of a terminal status (closed)', async () => {
      vi.mocked(repo.findOrderById).mockResolvedValue(makeOrderRow({ status: 'closed' }));

      const error: OrderError = await service.advanceOrderStatus('order-1', 'paid').catch((e) => e);

      expect(error).toBeInstanceOf(OrderError);
      expect(repo.updateOrderStatusRow).not.toHaveBeenCalled();
    });

    it('rejects "cancelled" as a target, directing callers to cancelOrder() instead', async () => {
      const error: OrderError = await service.advanceOrderStatus('order-1', 'cancelled').catch((e) => e);

      expect(error).toBeInstanceOf(OrderError);
      expect(error.message).toContain('cancelOrder()');
      expect(repo.findOrderById).not.toHaveBeenCalled();
    });

    it('throws order_not_found for a nonexistent order', async () => {
      vi.mocked(repo.findOrderById).mockResolvedValue(null);

      const error: OrderError = await service.advanceOrderStatus('missing', 'paid').catch((e) => e);

      expect(error.code).toBe('order_not_found');
    });
  });

  describe('updateShipmentStatus (state machine)', () => {
    it('allows a valid transition (pending -> picked_up)', async () => {
      vi.mocked(repo.findShipmentById).mockResolvedValue(makeShipmentRow({ status: 'pending' }));
      vi.mocked(repo.updateShipmentRow).mockResolvedValue(makeShipmentRow({ status: 'picked_up' }));

      const result = await service.updateShipmentStatus({ shipmentId: 'ship-1', status: 'picked_up' });

      expect(result.status).toBe('picked_up');
    });

    it('rejects skipping steps (pending -> delivered) without calling the repository update', async () => {
      vi.mocked(repo.findShipmentById).mockResolvedValue(makeShipmentRow({ status: 'pending' }));

      const error: OrderError = await service
        .updateShipmentStatus({ shipmentId: 'ship-1', status: 'delivered' })
        .catch((e) => e);

      expect(error).toBeInstanceOf(OrderError);
      expect(repo.updateShipmentRow).not.toHaveBeenCalled();
    });

    it('allows a reattempt from failed_delivery back to in_transit', async () => {
      vi.mocked(repo.findShipmentById).mockResolvedValue(makeShipmentRow({ status: 'failed_delivery' }));
      vi.mocked(repo.updateShipmentRow).mockResolvedValue(makeShipmentRow({ status: 'in_transit' }));

      const result = await service.updateShipmentStatus({ shipmentId: 'ship-1', status: 'in_transit' });

      expect(result.status).toBe('in_transit');
    });
  });

  describe('advanceReturnRequestStatus (state machine)', () => {
    it('allows the full happy-path pipeline step by step', async () => {
      vi.mocked(repo.findReturnRequestById).mockResolvedValue(makeReturnRequestRow({ status: 'requested' }));
      vi.mocked(repo.updateReturnRequestStatusRow).mockResolvedValue(
        makeReturnRequestRow({ status: 'approved' })
      );

      const result = await service.advanceReturnRequestStatus('ret-1', 'approved');

      expect(result.status).toBe('approved');
    });

    it('rejects jumping straight from requested to refund_issued', async () => {
      vi.mocked(repo.findReturnRequestById).mockResolvedValue(makeReturnRequestRow({ status: 'requested' }));

      const error: OrderError = await service
        .advanceReturnRequestStatus('ret-1', 'refund_issued')
        .catch((e) => e);

      expect(error).toBeInstanceOf(OrderError);
      expect(repo.updateReturnRequestStatusRow).not.toHaveBeenCalled();
    });
  });

  describe('issueRefund', () => {
    it('calls the atomic RPC and advances the linked return request to refund_issued', async () => {
      vi.mocked(repo.issueRefundRpc).mockResolvedValue({
        id: 'refund-1',
        order_id: 'order-1',
        payment_id: 'pay-1',
        return_request_id: 'ret-1',
        amount: '500.00',
        reason: 'Damaged item',
        status: 'requested',
        processed_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: null,
        created_by: null,
        updated_by: null,
        version: 1,
      });
      vi.mocked(repo.findRefundItems).mockResolvedValue([]);
      vi.mocked(repo.findReturnRequestById).mockResolvedValue(makeReturnRequestRow({ status: 'inspected' }));
      vi.mocked(repo.updateReturnRequestStatusRow).mockResolvedValue(
        makeReturnRequestRow({ status: 'refund_issued' })
      );

      const result = await service.issueRefund({
        orderId: 'order-1',
        paymentId: 'pay-1',
        returnRequestId: 'ret-1',
        reason: 'Damaged item',
        lineItems: [{ orderItemId: 'item-1', qty: 1, amount: 500 }],
      });

      expect(repo.issueRefundRpc).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1', paymentId: 'pay-1' })
      );
      expect(repo.updateReturnRequestStatusRow).toHaveBeenCalledWith('ret-1', 'refund_issued');
      expect(result.refund.id).toBe('refund-1');
    });

    it('rejects a refund with zero line items before calling the repository', async () => {
      await expect(
        service.issueRefund({
          orderId: 'order-1',
          paymentId: 'pay-1',
          reason: 'Damaged item',
          lineItems: [],
        })
      ).rejects.toThrow(OrderError);

      expect(repo.issueRefundRpc).not.toHaveBeenCalled();
    });
  });

  describe('generateInvoiceForOrder', () => {
    it('returns the existing invoice without attempting a duplicate insert', async () => {
      vi.mocked(repo.findInvoiceForOrder).mockResolvedValue({
        id: 'inv-1',
        order_id: 'order-1',
        invoice_number: 'AP/2026-27/000001',
        issued_at: '2026-01-01T00:00:00Z',
        pdf_media_asset_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: null,
        created_by: null,
        updated_by: null,
        version: 1,
      });

      const result = await service.generateInvoiceForOrder('order-1');

      expect(result.id).toBe('inv-1');
      expect(repo.insertInvoiceForOrder).not.toHaveBeenCalled();
    });
  });
});
