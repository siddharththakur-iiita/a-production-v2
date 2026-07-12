/**
 * src/features/tailoring/__tests__/tailoring.service.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as repo from '../tailoring.repository';
import * as service from '../tailoring.service';
import { TailoringError } from '../tailoring.errors';
import type {
  ProductionStageRow,
  TailoringOrderStageHistoryRow,
  TailoringRequestRow,
  AppointmentRow,
} from '../../../lib/supabase/database.types';

vi.mock('../tailoring.repository');

function makeStageRow(id: string, sortOrder: number, name: string): ProductionStageRow {
  return {
    id,
    name,
    sort_order: sortOrder,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

const STAGES = [
  makeStageRow('stage-1', 1, 'Pattern Making'),
  makeStageRow('stage-2', 2, 'Cutting'),
  makeStageRow('stage-3', 3, 'Stitching'),
];

function makeStageHistoryRow(
  overrides: Partial<TailoringOrderStageHistoryRow> = {}
): TailoringOrderStageHistoryRow {
  return {
    id: 'hist-1',
    tailoring_request_id: 'req-1',
    production_stage_id: 'stage-1',
    entered_at: '2026-01-01T00:00:00Z',
    exited_at: null,
    notes: null,
    updated_by: null,
    ...overrides,
  };
}

function makeTailoringRequestRow(overrides: Partial<TailoringRequestRow> = {}): TailoringRequestRow {
  return {
    id: 'req-1',
    customer_id: 'cust-1',
    reference_product_id: null,
    measurement_profile_id: null,
    assigned_to: null,
    status: 'inquiry_received',
    source: 'web',
    guest_name: null,
    guest_email: null,
    guest_phone: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

function makeAppointmentRow(overrides: Partial<AppointmentRow> = {}): AppointmentRow {
  return {
    id: 'appt-1',
    tailoring_request_id: 'req-1',
    type: 'consultation',
    mode: 'in_person',
    scheduled_at: '2026-02-01T10:00:00Z',
    duration_minutes: 60,
    status: 'requested',
    location: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: 1,
    ...overrides,
  };
}

describe('tailoring.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('advanceProductionStage (ordered sequence)', () => {
    it('starts at the first stage when no stage has been entered yet', async () => {
      vi.mocked(repo.findActiveProductionStages).mockResolvedValue(STAGES);
      vi.mocked(repo.findStageHistoryForRequest).mockResolvedValue([]);
      vi.mocked(repo.insertStageHistoryEntry).mockResolvedValue(
        makeStageHistoryRow({ production_stage_id: 'stage-1' })
      );

      const result = await service.advanceProductionStage({ tailoringRequestId: 'req-1' });

      expect(repo.insertStageHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({ productionStageId: 'stage-1' })
      );
      expect(result.productionStageId).toBe('stage-1');
    });

    it('advances to the next stage by sort_order when a current open stage exists', async () => {
      vi.mocked(repo.findActiveProductionStages).mockResolvedValue(STAGES);
      vi.mocked(repo.findStageHistoryForRequest).mockResolvedValue([
        makeStageHistoryRow({ production_stage_id: 'stage-1', exited_at: null }),
      ]);
      vi.mocked(repo.insertStageHistoryEntry).mockResolvedValue(
        makeStageHistoryRow({ production_stage_id: 'stage-2' })
      );

      const result = await service.advanceProductionStage({ tailoringRequestId: 'req-1' });

      expect(repo.insertStageHistoryEntry).toHaveBeenCalledWith(
        expect.objectContaining({ productionStageId: 'stage-2' })
      );
      expect(result.productionStageId).toBe('stage-2');
    });

    it('throws no_next_stage when already at the final stage, without inserting anything', async () => {
      vi.mocked(repo.findActiveProductionStages).mockResolvedValue(STAGES);
      vi.mocked(repo.findStageHistoryForRequest).mockResolvedValue([
        makeStageHistoryRow({ production_stage_id: 'stage-3', exited_at: null }),
      ]);

      const error: TailoringError = await service
        .advanceProductionStage({ tailoringRequestId: 'req-1' })
        .catch((e) => e);

      expect(error).toBeInstanceOf(TailoringError);
      expect(error.code).toBe('no_next_stage');
      expect(repo.insertStageHistoryEntry).not.toHaveBeenCalled();
    });

    it('falls back to the first active stage if the current stage was deactivated', async () => {
      vi.mocked(repo.findActiveProductionStages).mockResolvedValue(STAGES);
      vi.mocked(repo.findStageHistoryForRequest).mockResolvedValue([
        makeStageHistoryRow({ production_stage_id: 'stage-old-deactivated', exited_at: null }),
      ]);
      vi.mocked(repo.insertStageHistoryEntry).mockResolvedValue(
        makeStageHistoryRow({ production_stage_id: 'stage-1' })
      );

      const result = await service.advanceProductionStage({ tailoringRequestId: 'req-1' });

      expect(result.productionStageId).toBe('stage-1');
    });
  });

  describe('advanceTailoringRequestStatus (state machine)', () => {
    it('allows a valid transition (inquiry_received -> consultation_scheduled)', async () => {
      vi.mocked(repo.findTailoringRequestById).mockResolvedValue(
        makeTailoringRequestRow({ status: 'inquiry_received' })
      );
      vi.mocked(repo.updateTailoringRequestStatusRow).mockResolvedValue(
        makeTailoringRequestRow({ status: 'consultation_scheduled' })
      );

      const result = await service.advanceTailoringRequestStatus('req-1', 'consultation_scheduled');

      expect(result.status).toBe('consultation_scheduled');
    });

    it('rejects skipping steps (inquiry_received -> in_production)', async () => {
      vi.mocked(repo.findTailoringRequestById).mockResolvedValue(
        makeTailoringRequestRow({ status: 'inquiry_received' })
      );

      const error: TailoringError = await service
        .advanceTailoringRequestStatus('req-1', 'in_production')
        .catch((e) => e);

      expect(error).toBeInstanceOf(TailoringError);
      expect(repo.updateTailoringRequestStatusRow).not.toHaveBeenCalled();
    });

    it('rejects any transition out of a terminal status (closed)', async () => {
      vi.mocked(repo.findTailoringRequestById).mockResolvedValue(makeTailoringRequestRow({ status: 'closed' }));

      const error: TailoringError = await service
        .advanceTailoringRequestStatus('req-1', 'in_production')
        .catch((e) => e);

      expect(error).toBeInstanceOf(TailoringError);
      expect(repo.updateTailoringRequestStatusRow).not.toHaveBeenCalled();
    });
  });

  describe('updateAppointmentStatus (state machine)', () => {
    it('allows a valid transition (requested -> confirmed)', async () => {
      vi.mocked(repo.findAppointmentById).mockResolvedValue(makeAppointmentRow({ status: 'requested' }));
      vi.mocked(repo.updateAppointmentStatusRow).mockResolvedValue(makeAppointmentRow({ status: 'confirmed' }));

      const result = await service.updateAppointmentStatus('appt-1', 'confirmed');

      expect(result.status).toBe('confirmed');
    });

    it('rejects a transition out of a terminal status (completed)', async () => {
      vi.mocked(repo.findAppointmentById).mockResolvedValue(makeAppointmentRow({ status: 'completed' }));

      const error: TailoringError = await service.updateAppointmentStatus('appt-1', 'confirmed').catch((e) => e);

      expect(error).toBeInstanceOf(TailoringError);
      expect(repo.updateAppointmentStatusRow).not.toHaveBeenCalled();
    });
  });

  describe('submitOrUpdateDesignBrief (idempotent upsert)', () => {
    it('updates the existing design brief instead of attempting a duplicate insert', async () => {
      vi.mocked(repo.findDesignBriefForRequest).mockResolvedValue({
        id: 'brief-1',
        tailoring_request_id: 'req-1',
        garment_type_id: 'gt-1',
        embroidery_type_id: null,
        style_notes: 'Old notes',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });
      vi.mocked(repo.updateDesignBriefRow).mockResolvedValue({
        id: 'brief-1',
        tailoring_request_id: 'req-1',
        garment_type_id: 'gt-1',
        embroidery_type_id: null,
        style_notes: 'New notes',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      });

      const result = await service.submitOrUpdateDesignBrief({
        tailoringRequestId: 'req-1',
        garmentTypeId: 'gt-1',
        styleNotes: 'New notes',
      });

      expect(repo.updateDesignBriefRow).toHaveBeenCalled();
      expect(repo.insertDesignBrief).not.toHaveBeenCalled();
      expect(result.styleNotes).toBe('New notes');
    });
  });

  describe('submitFabricSelection', () => {
    it('rejects input with none of fabricTypeId/materialId/customFabricDescription', async () => {
      await expect(service.submitFabricSelection({ tailoringRequestId: 'req-1' })).rejects.toThrow();

      expect(repo.insertFabricSelection).not.toHaveBeenCalled();
    });
  });
});
