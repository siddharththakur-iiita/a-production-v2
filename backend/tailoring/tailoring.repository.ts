/**
 * src/features/tailoring/tailoring.repository.ts
 *
 * RLS reminder (016_rls.sql), see that file's Section 3 for the full
 * detail:
 *   garment_type/garment_measurement_template/production_stage: public read; staff write
 *   measurement_profile:       owner SELECT/INSERT; staff ALL; NO UPDATE for anyone (immutable)
 *   tailoring_request:         public INSERT; owner SELECT; staff ALL
 *   appointment/fabric_selection/design_brief: owner SELECT; public INSERT
 *                                  (026_design_brief_insert_policy.sql extends this same
 *                                  pattern to design_brief); staff ALL
 *   reference_image:           owner SELECT/INSERT; staff ALL
 *   quotation:                 owner SELECT; owner UPDATE (status IN accepted/rejected only); staff ALL
 *   quotation_line_item:       owner SELECT (via quotation join); staff ALL
 *   tailoring_order_stage_history:  staff-only ALL
 *   tailoring_order_status_history: owner/staff SELECT only; no client INSERT (trigger-populated)
 */
import { supabase } from '../../lib/supabase/client';
import type {
  GarmentTypeRow,
  GarmentMeasurementTemplateRow,
  MeasurementProfileRow,
  MeasurementProfileInsert,
  TailoringRequestRow,
  TailoringRequestInsert,
  TailoringRequestStatus,
  AppointmentRow,
  AppointmentInsert,
  AppointmentStatus,
  FabricSelectionRow,
  FabricSelectionInsert,
  DesignBriefRow,
  DesignBriefInsert,
  ReferenceImageRow,
  ReferenceImageInsert,
  QuotationRow,
  QuotationInsert,
  QuotationStatus,
  QuotationLineItemRow,
  QuotationLineItemInsert,
  ProductionStageRow,
  TailoringOrderStageHistoryRow,
  TailoringOrderStatusHistoryRow,
} from '../../lib/supabase/database.types';

export async function findActiveGarmentTypes(): Promise<GarmentTypeRow[]> {
  const { data, error } = await supabase.from('garment_type').select('*').eq('is_active', true);
  if (error) throw error;
  return data;
}

export async function findMeasurementTemplatesForGarmentType(
  garmentTypeId: string
): Promise<GarmentMeasurementTemplateRow[]> {
  const { data, error } = await supabase
    .from('garment_measurement_template')
    .select('*')
    .eq('garment_type_id', garmentTypeId)
    .eq('is_active', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data;
}

export async function findActiveProductionStages(): Promise<ProductionStageRow[]> {
  const { data, error } = await supabase
    .from('production_stage')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function findMeasurementProfilesForCustomer(customerId: string): Promise<MeasurementProfileRow[]> {
  const { data, error } = await supabase
    .from('measurement_profile')
    .select('*')
    .eq('customer_id', customerId)
    .order('taken_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findMeasurementProfileById(id: string): Promise<MeasurementProfileRow | null> {
  const { data, error } = await supabase.from('measurement_profile').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertMeasurementProfile(input: MeasurementProfileInsert): Promise<MeasurementProfileRow> {
  const { data, error } = await supabase.from('measurement_profile').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findMyTailoringRequests(customerId: string): Promise<TailoringRequestRow[]> {
  const { data, error } = await supabase
    .from('tailoring_request')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findAllTailoringRequestsForStaff(): Promise<TailoringRequestRow[]> {
  const { data, error } = await supabase
    .from('tailoring_request')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findTailoringRequestById(id: string): Promise<TailoringRequestRow | null> {
  const { data, error } = await supabase.from('tailoring_request').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertTailoringRequest(input: TailoringRequestInsert): Promise<TailoringRequestRow> {
  const { data, error } = await supabase.from('tailoring_request').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateTailoringRequestStatusRow(
  id: string,
  status: TailoringRequestStatus
): Promise<TailoringRequestRow> {
  const { data, error } = await supabase
    .from('tailoring_request')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateTailoringRequestMeasurementProfile(
  id: string,
  measurementProfileId: string
): Promise<TailoringRequestRow> {
  const { data, error } = await supabase
    .from('tailoring_request')
    .update({ measurement_profile_id: measurementProfileId })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateTailoringRequestAssignee(id: string, assignedTo: string): Promise<TailoringRequestRow> {
  const { data, error } = await supabase
    .from('tailoring_request')
    .update({ assigned_to: assignedTo })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findRequestStatusHistory(
  tailoringRequestId: string
): Promise<TailoringOrderStatusHistoryRow[]> {
  const { data, error } = await supabase
    .from('tailoring_order_status_history')
    .select('*')
    .eq('tailoring_request_id', tailoringRequestId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findAppointmentsForRequest(tailoringRequestId: string): Promise<AppointmentRow[]> {
  const { data, error } = await supabase
    .from('appointment')
    .select('*')
    .eq('tailoring_request_id', tailoringRequestId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function findAppointmentById(id: string): Promise<AppointmentRow | null> {
  const { data, error } = await supabase.from('appointment').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertAppointment(input: AppointmentInsert): Promise<AppointmentRow> {
  const { data, error } = await supabase.from('appointment').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateAppointmentStatusRow(id: string, status: AppointmentStatus): Promise<AppointmentRow> {
  const { data, error } = await supabase
    .from('appointment')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findFabricSelectionForRequest(
  tailoringRequestId: string
): Promise<FabricSelectionRow | null> {
  const { data, error } = await supabase
    .from('fabric_selection')
    .select('*')
    .eq('tailoring_request_id', tailoringRequestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertFabricSelection(input: FabricSelectionInsert): Promise<FabricSelectionRow> {
  const { data, error } = await supabase.from('fabric_selection').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findDesignBriefForRequest(tailoringRequestId: string): Promise<DesignBriefRow | null> {
  const { data, error } = await supabase
    .from('design_brief')
    .select('*')
    .eq('tailoring_request_id', tailoringRequestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertDesignBrief(input: DesignBriefInsert): Promise<DesignBriefRow> {
  const { data, error } = await supabase.from('design_brief').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateDesignBriefRow(
  id: string,
  patch: { garmentTypeId?: string; embroideryTypeId?: string | null; styleNotes?: string | null }
): Promise<DesignBriefRow> {
  const { data, error } = await supabase
    .from('design_brief')
    .update({
      garment_type_id: patch.garmentTypeId,
      embroidery_type_id: patch.embroideryTypeId,
      style_notes: patch.styleNotes,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findReferenceImagesForRequest(tailoringRequestId: string): Promise<ReferenceImageRow[]> {
  const { data, error } = await supabase
    .from('reference_image')
    .select('*')
    .eq('tailoring_request_id', tailoringRequestId)
    .order('uploaded_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** Same rows as findReferenceImagesForRequest, embedding media_asset.storage_path via the real FK (reference_image.media_asset_id) — mirrors product.repository.ts's findProductImages embedding pattern. */
export async function findReferenceImagesWithStoragePath(
  tailoringRequestId: string
): Promise<(ReferenceImageRow & { media_asset: { storage_path: string } })[]> {
  const { data, error } = await supabase
    .from('reference_image')
    .select('*, media_asset:media_asset_id(storage_path)')
    .eq('tailoring_request_id', tailoringRequestId)
    .order('uploaded_at', { ascending: true });
  if (error) throw error;
  return data as never;
}

export async function insertReferenceImage(input: ReferenceImageInsert): Promise<ReferenceImageRow> {
  const { data, error } = await supabase.from('reference_image').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function findQuotationsForRequest(tailoringRequestId: string): Promise<QuotationRow[]> {
  const { data, error } = await supabase
    .from('quotation')
    .select('*')
    .eq('tailoring_request_id', tailoringRequestId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findQuotationById(id: string): Promise<QuotationRow | null> {
  const { data, error } = await supabase.from('quotation').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertQuotation(input: QuotationInsert): Promise<QuotationRow> {
  const { data, error } = await supabase.from('quotation').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateQuotationStatusRow(id: string, status: QuotationStatus): Promise<QuotationRow> {
  const { data, error } = await supabase.from('quotation').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function findQuotationLineItems(quotationId: string): Promise<QuotationLineItemRow[]> {
  const { data, error } = await supabase
    .from('quotation_line_item')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertQuotationLineItems(items: QuotationLineItemInsert[]): Promise<QuotationLineItemRow[]> {
  const { data, error } = await supabase.from('quotation_line_item').insert(items).select('*');
  if (error) throw error;
  return data;
}

export async function findStageHistoryForRequest(
  tailoringRequestId: string
): Promise<TailoringOrderStageHistoryRow[]> {
  const { data, error } = await supabase
    .from('tailoring_order_stage_history')
    .select('*')
    .eq('tailoring_request_id', tailoringRequestId)
    .order('entered_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertStageHistoryEntry(params: {
  tailoringRequestId: string;
  productionStageId: string;
  notes?: string;
}): Promise<TailoringOrderStageHistoryRow> {
  const { data, error } = await supabase
    .from('tailoring_order_stage_history')
    .insert({
      tailoring_request_id: params.tailoringRequestId,
      production_stage_id: params.productionStageId,
      notes: params.notes,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
