/**
 * src/features/tailoring/tailoring.service.ts
 *
 * The bespoke commission lifecycle: inquiry -> consultation ->
 * measurements -> fabric/design selection -> quotation -> production
 * -> fitting -> delivery. Two workflows here are genuinely
 * order-of-operations logic, not CRUD:
 *   - Production stage advancement: production_stage is an ORDERED
 *     sequence (sort_order); advancing means finding the current open
 *     stage, resolving the next one by sort order, and inserting a
 *     new tailoring_order_stage_history row — the BEFORE INSERT
 *     trigger (003_functions.sql) then closes the previous one
 *     automatically as part of that same statement.
 *   - Status state machines for tailoring_request and appointment,
 *     application-layer for the same reason as Orders' (the schema
 *     restricts the value *set*, not the transition *graph* — see
 *     order.service.ts's file header for the fuller rationale, which
 *     applies identically here).
 * Quotation acceptance/conversion-to-order is deliberately NOT
 * duplicated here — trg_quotation_status_change (010_tailoring.sql,
 * already SECURITY DEFINER) handles expiring sibling quotations and
 * calling app_convert_quotation_to_order automatically the moment a
 * quotation's status is set to 'accepted'; this service only ever
 * issues that one status UPDATE.
 */
import * as repo from './tailoring.repository';
import { getPrivateSignedUrl } from '../../lib/supabase/storage';
import {
  mapGarmentTypeRow,
  mapGarmentMeasurementTemplateRow,
  mapMeasurementProfileRow,
  mapTailoringRequestRow,
  mapAppointmentRow,
  mapFabricSelectionRow,
  mapDesignBriefRow,
  mapReferenceImageRow,
  mapQuotationRow,
  mapQuotationLineItemRow,
  mapProductionStageRow,
  mapStageHistoryRow,
  mapRequestStatusHistoryRow,
  type GarmentType,
  type GarmentMeasurementTemplate,
  type MeasurementProfile,
  type TailoringRequest,
  type TailoringRequestDetail,
  type Appointment,
  type FabricSelection,
  type DesignBrief,
  type ReferenceImage,
  type Quotation,
  type ProductionStage,
  type StageHistoryEntry,
  type RequestStatusHistoryEntry,
  type SubmitInquiryInput,
  type ScheduleAppointmentInput,
  type SubmitFabricSelectionInput,
  type SubmitDesignBriefInput,
  type AddReferenceImageInput,
  type CaptureMeasurementsInput,
  type CreateQuotationInput,
  type AdvanceProductionStageInput,
} from './tailoring.types';
import {
  submitInquirySchema,
  scheduleAppointmentSchema,
  submitFabricSelectionSchema,
  submitDesignBriefSchema,
  addReferenceImageSchema,
  captureMeasurementsSchema,
  createQuotationSchema,
  advanceProductionStageSchema,
  updateAppointmentStatusSchema,
} from './tailoring.validation';
import { TailoringError, mapTailoringPostgrestError, mapTailoringZodError } from './tailoring.errors';
import type { TailoringRequestStatus, AppointmentStatus } from '../../lib/supabase/database.types';

// =======================================================================
// Taxonomy
// =======================================================================

export async function listActiveGarmentTypes(): Promise<GarmentType[]> {
  try {
    const rows = await repo.findActiveGarmentTypes();
    return rows.map(mapGarmentTypeRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function listMeasurementTemplates(garmentTypeId: string): Promise<GarmentMeasurementTemplate[]> {
  try {
    const rows = await repo.findMeasurementTemplatesForGarmentType(garmentTypeId);
    return rows.map(mapGarmentMeasurementTemplateRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function listActiveProductionStages(): Promise<ProductionStage[]> {
  try {
    const rows = await repo.findActiveProductionStages();
    return rows.map(mapProductionStageRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

// =======================================================================
// Measurement profile (immutable)
// =======================================================================

export async function listMeasurementProfiles(customerId: string): Promise<MeasurementProfile[]> {
  try {
    const rows = await repo.findMeasurementProfilesForCustomer(customerId);
    return rows.map(mapMeasurementProfileRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

/**
 * Creates a NEW measurement profile — there is no "update" function in
 * this module, deliberately: measurement_profile is truly immutable
 * at the database level (see file header). Optionally links it to a
 * tailoring_request as a separate call, advancing that request's own
 * measurement_profile_id pointer to the new row.
 */
export async function captureMeasurements(
  input: CaptureMeasurementsInput,
  linkToTailoringRequestId?: string
): Promise<MeasurementProfile> {
  const parsed = captureMeasurementsSchema.safeParse(input);
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  try {
    const row = await repo.insertMeasurementProfile({
      customer_id: parsed.data.customerId,
      label: parsed.data.label,
      garment_type_id: parsed.data.garmentTypeId,
      measurement_template_id: parsed.data.measurementTemplateId,
      measurements: parsed.data.measurements,
    });

    if (linkToTailoringRequestId) {
      await repo.updateTailoringRequestMeasurementProfile(linkToTailoringRequestId, row.id);
    }

    return mapMeasurementProfileRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

// =======================================================================
// Tailoring request — intake and status lifecycle
// =======================================================================

export async function submitInquiry(input: SubmitInquiryInput): Promise<TailoringRequest> {
  const parsed = submitInquirySchema.safeParse(input);
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  try {
    const row = await repo.insertTailoringRequest({
      customer_id: parsed.data.customerId,
      reference_product_id: parsed.data.referenceProductId,
      source: parsed.data.source,
      guest_name: parsed.data.guestName,
      guest_email: parsed.data.guestEmail,
      guest_phone: parsed.data.guestPhone,
    });
    return mapTailoringRequestRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function listMyTailoringRequests(customerId: string): Promise<TailoringRequest[]> {
  try {
    const rows = await repo.findMyTailoringRequests(customerId);
    return rows.map(mapTailoringRequestRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function listTailoringRequestsForStaff(): Promise<TailoringRequest[]> {
  try {
    const rows = await repo.findAllTailoringRequestsForStaff();
    return rows.map(mapTailoringRequestRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function getTailoringRequestDetail(id: string): Promise<TailoringRequestDetail | null> {
  try {
    const requestRow = await repo.findTailoringRequestById(id);
    if (!requestRow) return null;

    const [appointmentRows, fabricRow, designRow, imageRows, quotationRows, stageHistoryRows] = await Promise.all([
      repo.findAppointmentsForRequest(id),
      repo.findFabricSelectionForRequest(id),
      repo.findDesignBriefForRequest(id),
      repo.findReferenceImagesForRequest(id),
      repo.findQuotationsForRequest(id),
      repo.findStageHistoryForRequest(id),
    ]);

    const quotationsWithItems = await Promise.all(
      quotationRows.map(async (q) => {
        const items = await repo.findQuotationLineItems(q.id);
        return mapQuotationRow(q, items.map(mapQuotationLineItemRow));
      })
    );

    const openStage = stageHistoryRows.find((s) => s.exited_at === null);

    return {
      ...mapTailoringRequestRow(requestRow),
      appointments: appointmentRows.map(mapAppointmentRow),
      fabricSelection: fabricRow ? mapFabricSelectionRow(fabricRow) : null,
      designBrief: designRow ? mapDesignBriefRow(designRow) : null,
      referenceImages: imageRows.map((r) => mapReferenceImageRow(r)),
      quotations: quotationsWithItems,
      currentStage: openStage?.production_stage_id ?? null,
    };
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function listRequestStatusHistory(tailoringRequestId: string): Promise<RequestStatusHistoryEntry[]> {
  try {
    const rows = await repo.findRequestStatusHistory(tailoringRequestId);
    return rows.map(mapRequestStatusHistoryRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

const TAILORING_REQUEST_STATUS_TRANSITIONS: Record<TailoringRequestStatus, TailoringRequestStatus[]> = {
  inquiry_received: ['consultation_scheduled', 'cancelled'],
  consultation_scheduled: ['consultation_completed', 'cancelled'],
  consultation_completed: ['measurements_captured', 'cancelled'],
  measurements_captured: ['design_finalized', 'cancelled'],
  design_finalized: ['quotation_sent', 'cancelled'],
  quotation_sent: ['quotation_accepted', 'cancelled'],
  // quotation_accepted is normally reached automatically via
  // trg_quotation_status_change when a quotation is accepted, not via
  // this function — included in the transition graph so a staff
  // correction is still possible, not as the primary path.
  quotation_accepted: ['in_production', 'cancelled'],
  in_production: ['fitting_scheduled', 'cancelled'],
  fitting_scheduled: ['fitting_completed', 'cancelled'],
  fitting_completed: ['ready_for_delivery', 'cancelled'],
  ready_for_delivery: ['delivered', 'cancelled'],
  delivered: ['closed'],
  closed: [],
  cancelled: [],
};

export async function advanceTailoringRequestStatus(
  id: string,
  targetStatus: TailoringRequestStatus
): Promise<TailoringRequest> {
  const current = await repo.findTailoringRequestById(id);
  if (!current) {
    throw new TailoringError('request_not_found', 'Tailoring request not found.');
  }

  const allowedNext = TAILORING_REQUEST_STATUS_TRANSITIONS[current.status];
  if (!allowedNext.includes(targetStatus)) {
    throw new TailoringError(
      'validation_failed',
      `Cannot move a tailoring request from "${current.status}" to "${targetStatus}".`
    );
  }

  try {
    const row = await repo.updateTailoringRequestStatusRow(id, targetStatus);
    return mapTailoringRequestRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function assignTailoringRequest(id: string, adminUserId: string): Promise<TailoringRequest> {
  try {
    const row = await repo.updateTailoringRequestAssignee(id, adminUserId);
    return mapTailoringRequestRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

// =======================================================================
// Appointment
// =======================================================================

const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [],
  no_show: [],
  cancelled: [],
};

export async function listAppointmentsForRequest(tailoringRequestId: string): Promise<Appointment[]> {
  try {
    const rows = await repo.findAppointmentsForRequest(tailoringRequestId);
    return rows.map(mapAppointmentRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function scheduleAppointment(input: ScheduleAppointmentInput): Promise<Appointment> {
  const parsed = scheduleAppointmentSchema.safeParse(input);
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  try {
    const row = await repo.insertAppointment({
      tailoring_request_id: parsed.data.tailoringRequestId,
      type: parsed.data.type,
      mode: parsed.data.mode,
      scheduled_at: parsed.data.scheduledAt,
      duration_minutes: parsed.data.durationMinutes,
      location: parsed.data.location,
      notes: parsed.data.notes,
    });
    return mapAppointmentRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

/** Validated against APPOINTMENT_STATUS_TRANSITIONS — the same class of state machine as tailoring_request/production stage above, kept consistent rather than treated as a lighter-weight exception. */
export async function updateAppointmentStatus(
  appointmentId: string,
  targetStatus: AppointmentStatus
): Promise<Appointment> {
  const parsed = updateAppointmentStatusSchema.safeParse({ appointmentId, status: targetStatus });
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  const current = await repo.findAppointmentById(parsed.data.appointmentId);
  if (!current) {
    throw new TailoringError('request_not_found', 'Appointment not found.');
  }

  const allowedNext = APPOINTMENT_STATUS_TRANSITIONS[current.status];
  if (!allowedNext.includes(parsed.data.status)) {
    throw new TailoringError(
      'validation_failed',
      `Cannot move an appointment from "${current.status}" to "${parsed.data.status}".`
    );
  }

  try {
    const row = await repo.updateAppointmentStatusRow(parsed.data.appointmentId, parsed.data.status);
    return mapAppointmentRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

// =======================================================================
// Fabric selection / Design brief / Reference image
// =======================================================================

export async function getFabricSelection(tailoringRequestId: string): Promise<FabricSelection | null> {
  try {
    const row = await repo.findFabricSelectionForRequest(tailoringRequestId);
    return row ? mapFabricSelectionRow(row) : null;
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function submitFabricSelection(input: SubmitFabricSelectionInput): Promise<FabricSelection> {
  const parsed = submitFabricSelectionSchema.safeParse(input);
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  try {
    const row = await repo.insertFabricSelection({
      tailoring_request_id: parsed.data.tailoringRequestId,
      fabric_type_id: parsed.data.fabricTypeId,
      material_id: parsed.data.materialId,
      custom_fabric_description: parsed.data.customFabricDescription,
      swatch_media_asset_id: parsed.data.swatchMediaAssetId,
    });
    return mapFabricSelectionRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function getDesignBrief(tailoringRequestId: string): Promise<DesignBrief | null> {
  try {
    const row = await repo.findDesignBriefForRequest(tailoringRequestId);
    return row ? mapDesignBriefRow(row) : null;
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

/**
 * design_brief_tailoring_request_id_key (010_tailoring.sql) enforces
 * at most one design brief per request — this function checks first
 * and updates the existing row instead of attempting (and failing) a
 * duplicate insert, mirroring generateInvoiceForOrder's idempotent
 * pattern in order.service.ts.
 */
export async function submitOrUpdateDesignBrief(input: SubmitDesignBriefInput): Promise<DesignBrief> {
  const parsed = submitDesignBriefSchema.safeParse(input);
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  try {
    const existing = await repo.findDesignBriefForRequest(parsed.data.tailoringRequestId);
    if (existing) {
      const row = await repo.updateDesignBriefRow(existing.id, {
        garmentTypeId: parsed.data.garmentTypeId,
        embroideryTypeId: parsed.data.embroideryTypeId ?? null,
        styleNotes: parsed.data.styleNotes ?? null,
      });
      return mapDesignBriefRow(row);
    }

    const row = await repo.insertDesignBrief({
      tailoring_request_id: parsed.data.tailoringRequestId,
      garment_type_id: parsed.data.garmentTypeId,
      embroidery_type_id: parsed.data.embroideryTypeId,
      style_notes: parsed.data.styleNotes,
    });
    return mapDesignBriefRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

/** Resolves each reference image's signed URL via the private-media bucket (storage.ts getPrivateSignedUrl) using the real media_asset.storage_path, joined through the FK — storage_path is already the full bucket key set at upload time (015_storage.sql's reference-images/{tailoring_request_id}/{filename} convention), consistent with how product images use their storage_path directly with no prefix reconstruction. */
export async function listReferenceImages(tailoringRequestId: string): Promise<ReferenceImage[]> {
  try {
    const rows = await repo.findReferenceImagesWithStoragePath(tailoringRequestId);
    return await Promise.all(
      rows.map(async (row) => {
        const signedUrl = await getPrivateSignedUrl(row.media_asset.storage_path);
        return mapReferenceImageRow(row, signedUrl);
      })
    );
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function addReferenceImage(input: AddReferenceImageInput): Promise<ReferenceImage> {
  const parsed = addReferenceImageSchema.safeParse(input);
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  try {
    const row = await repo.insertReferenceImage({
      tailoring_request_id: parsed.data.tailoringRequestId,
      media_asset_id: parsed.data.mediaAssetId,
      caption: parsed.data.caption,
      uploaded_by: parsed.data.uploadedBy,
    });
    return mapReferenceImageRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

// =======================================================================
// Quotation
// =======================================================================

export async function listQuotationsForRequest(tailoringRequestId: string): Promise<Quotation[]> {
  try {
    const rows = await repo.findQuotationsForRequest(tailoringRequestId);
    return await Promise.all(
      rows.map(async (q) => {
        const items = await repo.findQuotationLineItems(q.id);
        return mapQuotationRow(q, items.map(mapQuotationLineItemRow));
      })
    );
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

/**
 * Creates a new quotation (version_number auto-assigned by
 * trg_quotation_assign_version, 010_tailoring.sql) with its line
 * items. The two inserts are safe as separate calls here — unlike
 * refund/refund_item (see order.repository.ts's issueRefundRpc
 * docstring) — because quotation.subtotal self-heals via a normal
 * (non-deferred) trigger on every line-item write rather than being
 * validated against a pre-set value; there is no atomicity gap to
 * close.
 */
export async function createQuotation(input: CreateQuotationInput): Promise<Quotation> {
  const parsed = createQuotationSchema.safeParse(input);
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  try {
    const quotationRow = await repo.insertQuotation({
      tailoring_request_id: parsed.data.tailoringRequestId,
      valid_until: parsed.data.validUntil,
      tax_total: parsed.data.taxTotal?.toFixed(2),
    });

    const lineItemRows = await repo.insertQuotationLineItems(
      parsed.data.lineItems.map((li) => ({
        quotation_id: quotationRow.id,
        description: li.description,
        amount: li.amount.toFixed(2),
        sort_order: li.sortOrder,
      }))
    );

    return mapQuotationRow(quotationRow, lineItemRows.map(mapQuotationLineItemRow));
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function sendQuotation(quotationId: string): Promise<Quotation> {
  try {
    const row = await repo.updateQuotationStatusRow(quotationId, 'sent');
    const items = await repo.findQuotationLineItems(quotationId);
    return mapQuotationRow(row, items.map(mapQuotationLineItemRow));
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

/**
 * Customer accepts a quotation — permitted directly by the
 * quotation_owner_accept RLS policy (016_rls.sql), WITH CHECK status
 * IN ('accepted','rejected'). Everything else (expiring sibling
 * quotations, converting to an order, advancing
 * tailoring_request.status to quotation_accepted) happens
 * automatically via trg_quotation_status_change — this function only
 * issues the one status UPDATE and never duplicates that logic.
 */
export async function acceptQuotation(quotationId: string): Promise<Quotation> {
  try {
    const row = await repo.updateQuotationStatusRow(quotationId, 'accepted');
    const items = await repo.findQuotationLineItems(quotationId);
    return mapQuotationRow(row, items.map(mapQuotationLineItemRow));
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function rejectQuotation(quotationId: string): Promise<Quotation> {
  try {
    const row = await repo.updateQuotationStatusRow(quotationId, 'rejected');
    const items = await repo.findQuotationLineItems(quotationId);
    return mapQuotationRow(row, items.map(mapQuotationLineItemRow));
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

// =======================================================================
// Production stage progression (ordered sequence, not arbitrary CRUD)
// =======================================================================

export async function getCurrentStage(tailoringRequestId: string): Promise<StageHistoryEntry | null> {
  try {
    const rows = await repo.findStageHistoryForRequest(tailoringRequestId);
    const open = rows.find((r) => r.exited_at === null);
    return open ? mapStageHistoryRow(open) : null;
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

export async function listStageHistory(tailoringRequestId: string): Promise<StageHistoryEntry[]> {
  try {
    const rows = await repo.findStageHistoryForRequest(tailoringRequestId);
    return rows.map(mapStageHistoryRow);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}

/**
 * Advances a request to the next production stage in sort_order
 * sequence. If no stage has been entered yet, starts at the first
 * (lowest sort_order) active stage. If already at the last stage,
 * throws 'no_next_stage' rather than silently no-op'ing — a caller
 * attempting to advance past the end almost certainly means to
 * transition tailoring_request.status to ready_for_delivery instead,
 * and a clear error surfaces that rather than doing nothing silently.
 */
export async function advanceProductionStage(input: AdvanceProductionStageInput): Promise<StageHistoryEntry> {
  const parsed = advanceProductionStageSchema.safeParse(input);
  if (!parsed.success) throw mapTailoringZodError(parsed.error);

  const stages = await repo.findActiveProductionStages(); // already sorted by sort_order ascending
  if (stages.length === 0) {
    throw new TailoringError('no_next_stage', 'No production stages are configured.');
  }

  const current = await getCurrentStage(parsed.data.tailoringRequestId);

  let nextStage;
  if (!current) {
    nextStage = stages[0];
  } else {
    const currentIndex = stages.findIndex((s) => s.id === current.productionStageId);
    if (currentIndex === -1) {
      // The current stage was deactivated after being entered — fall
      // back to the first still-active stage rather than erroring, so
      // deactivating a stage never blocks in-flight requests.
      nextStage = stages[0];
    } else if (currentIndex === stages.length - 1) {
      throw new TailoringError('no_next_stage', 'This request is already at the final production stage.');
    } else {
      nextStage = stages[currentIndex + 1];
    }
  }

  try {
    const row = await repo.insertStageHistoryEntry({
      tailoringRequestId: parsed.data.tailoringRequestId,
      productionStageId: nextStage.id,
      notes: parsed.data.notes,
    });
    return mapStageHistoryRow(row);
  } catch (err) {
    throw mapTailoringPostgrestError(err as never);
  }
}
