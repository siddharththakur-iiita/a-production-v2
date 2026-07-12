/**
 * src/features/tailoring/tailoring.types.ts
 *
 * Domain types for the Tailoring module (010_tailoring.sql, 13
 * tables) — the complete bespoke commission lifecycle: inquiry ->
 * consultation -> measurements -> fabric/design selection ->
 * quotation -> production -> fitting -> delivery. See
 * tailoring.service.ts for the actual workflow logic.
 *
 * Two domain rules shape this module's design, both enforced by the
 * database itself, not just documented here:
 *   - measurement_profile is truly immutable (a BEFORE UPDATE trigger
 *     unconditionally rejects any update) — "editing" measurements
 *     means creating a new profile row, never patching an old one.
 *   - quotation is versioned (one row per revision, auto-numbered);
 *     accepting one automatically expires its siblings and converts
 *     it to an order via the existing app_convert_quotation_to_order
 *     trigger — this module never duplicates that conversion logic.
 */
import type {
  GarmentTypeRow,
  GarmentMeasurementTemplateRow,
  MeasurementProfileRow,
  TailoringRequestRow,
  TailoringRequestStatus,
  TailoringRequestSource,
  AppointmentRow,
  AppointmentStatus,
  AppointmentType,
  FabricSelectionRow,
  DesignBriefRow,
  ReferenceImageRow,
  QuotationRow,
  QuotationStatus,
  QuotationLineItemRow,
  ProductionStageRow,
  TailoringOrderStageHistoryRow,
  TailoringOrderStatusHistoryRow,
} from '../../lib/supabase/database.types';

// ---------------------------------------------------------------------
// Garment type / measurement template (taxonomy)
// ---------------------------------------------------------------------

export interface GarmentType {
  id: string;
  name: string;
  genderId: string | null;
  isActive: boolean;
}

export function mapGarmentTypeRow(row: GarmentTypeRow): GarmentType {
  return { id: row.id, name: row.name, genderId: row.gender_id, isActive: row.is_active };
}

export interface MeasurementField {
  key: string;
  label: string;
  unit: string;
}

export interface GarmentMeasurementTemplate {
  id: string;
  garmentTypeId: string;
  name: string;
  fields: MeasurementField[];
  isActive: boolean;
}

export function mapGarmentMeasurementTemplateRow(row: GarmentMeasurementTemplateRow): GarmentMeasurementTemplate {
  return {
    id: row.id,
    garmentTypeId: row.garment_type_id,
    name: row.name,
    fields: row.fields as unknown as MeasurementField[],
    isActive: row.is_active,
  };
}

// ---------------------------------------------------------------------
// Measurement profile (immutable)
// ---------------------------------------------------------------------

export interface MeasurementProfile {
  id: string;
  customerId: string;
  label: string;
  garmentTypeId: string;
  measurementTemplateId: string;
  measurements: Record<string, number>;
  takenBy: string | null;
  takenAt: string;
}

export function mapMeasurementProfileRow(row: MeasurementProfileRow): MeasurementProfile {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    garmentTypeId: row.garment_type_id,
    measurementTemplateId: row.measurement_template_id,
    measurements: row.measurements as unknown as Record<string, number>,
    takenBy: row.taken_by,
    takenAt: row.taken_at,
  };
}

// ---------------------------------------------------------------------
// Tailoring request
// ---------------------------------------------------------------------

export interface TailoringRequest {
  id: string;
  customerId: string | null;
  referenceProductId: string | null;
  measurementProfileId: string | null;
  assignedTo: string | null;
  status: TailoringRequestStatus;
  source: TailoringRequestSource;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  createdAt: string;
}

export function mapTailoringRequestRow(row: TailoringRequestRow): TailoringRequest {
  return {
    id: row.id,
    customerId: row.customer_id,
    referenceProductId: row.reference_product_id,
    measurementProfileId: row.measurement_profile_id,
    assignedTo: row.assigned_to,
    status: row.status,
    source: row.source,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    createdAt: row.created_at,
  };
}

export interface TailoringRequestDetail extends TailoringRequest {
  appointments: Appointment[];
  fabricSelection: FabricSelection | null;
  designBrief: DesignBrief | null;
  referenceImages: ReferenceImage[];
  quotations: Quotation[];
  currentStage: string | null;
}

// ---------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------

export interface Appointment {
  id: string;
  tailoringRequestId: string;
  type: AppointmentType;
  mode: AppointmentRow['mode'];
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  location: string | null;
  notes: string | null;
}

export function mapAppointmentRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    tailoringRequestId: row.tailoring_request_id,
    type: row.type,
    mode: row.mode,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    location: row.location,
    notes: row.notes,
  };
}

// ---------------------------------------------------------------------
// Fabric selection / Design brief / Reference image
// ---------------------------------------------------------------------

export interface FabricSelection {
  id: string;
  tailoringRequestId: string;
  fabricTypeId: string | null;
  materialId: string | null;
  customFabricDescription: string | null;
  swatchImageUrl: string | null;
}

export function mapFabricSelectionRow(
  row: FabricSelectionRow,
  swatchImageUrl: string | null = null
): FabricSelection {
  return {
    id: row.id,
    tailoringRequestId: row.tailoring_request_id,
    fabricTypeId: row.fabric_type_id,
    materialId: row.material_id,
    customFabricDescription: row.custom_fabric_description,
    swatchImageUrl,
  };
}

export interface DesignBrief {
  id: string;
  tailoringRequestId: string;
  garmentTypeId: string;
  embroideryTypeId: string | null;
  styleNotes: string | null;
}

export function mapDesignBriefRow(row: DesignBriefRow): DesignBrief {
  return {
    id: row.id,
    tailoringRequestId: row.tailoring_request_id,
    garmentTypeId: row.garment_type_id,
    embroideryTypeId: row.embroidery_type_id,
    styleNotes: row.style_notes,
  };
}

export interface ReferenceImage {
  id: string;
  tailoringRequestId: string;
  caption: string | null;
  uploadedBy: ReferenceImageRow['uploaded_by'];
  uploadedAt: string;
  signedImageUrl: string | null;
}

export function mapReferenceImageRow(
  row: ReferenceImageRow,
  signedImageUrl: string | null = null
): ReferenceImage {
  return {
    id: row.id,
    tailoringRequestId: row.tailoring_request_id,
    caption: row.caption,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    signedImageUrl,
  };
}

// ---------------------------------------------------------------------
// Quotation
// ---------------------------------------------------------------------

export interface QuotationLineItem {
  id: string;
  quotationId: string;
  description: string;
  amount: number;
  sortOrder: number;
}

export function mapQuotationLineItemRow(row: QuotationLineItemRow): QuotationLineItem {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    description: row.description,
    amount: Number(row.amount),
    sortOrder: row.sort_order,
  };
}

export interface Quotation {
  id: string;
  tailoringRequestId: string;
  versionNumber: number;
  status: QuotationStatus;
  validUntil: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  lineItems: QuotationLineItem[];
}

export function mapQuotationRow(row: QuotationRow, lineItems: QuotationLineItem[] = []): Quotation {
  return {
    id: row.id,
    tailoringRequestId: row.tailoring_request_id,
    versionNumber: row.version_number,
    status: row.status,
    validUntil: row.valid_until,
    subtotal: Number(row.subtotal),
    taxTotal: Number(row.tax_total),
    total: Number(row.total),
    lineItems,
  };
}

// ---------------------------------------------------------------------
// Production stage / history
// ---------------------------------------------------------------------

export interface ProductionStage {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export function mapProductionStageRow(row: ProductionStageRow): ProductionStage {
  return { id: row.id, name: row.name, sortOrder: row.sort_order, isActive: row.is_active };
}

export interface StageHistoryEntry {
  id: string;
  tailoringRequestId: string;
  productionStageId: string;
  enteredAt: string;
  exitedAt: string | null;
  notes: string | null;
}

export function mapStageHistoryRow(row: TailoringOrderStageHistoryRow): StageHistoryEntry {
  return {
    id: row.id,
    tailoringRequestId: row.tailoring_request_id,
    productionStageId: row.production_stage_id,
    enteredAt: row.entered_at,
    exitedAt: row.exited_at,
    notes: row.notes,
  };
}

export interface RequestStatusHistoryEntry {
  id: string;
  tailoringRequestId: string;
  status: string;
  changedAt: string;
  changedBy: string | null;
  note: string | null;
}

export function mapRequestStatusHistoryRow(row: TailoringOrderStatusHistoryRow): RequestStatusHistoryEntry {
  return {
    id: row.id,
    tailoringRequestId: row.tailoring_request_id,
    status: row.status,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    note: row.note,
  };
}

// ---------------------------------------------------------------------
// Workflow inputs
// ---------------------------------------------------------------------

export interface SubmitInquiryInput {
  customerId?: string;
  referenceProductId?: string;
  source?: TailoringRequestSource;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface ScheduleAppointmentInput {
  tailoringRequestId: string;
  type: AppointmentType;
  mode?: AppointmentRow['mode'];
  scheduledAt: string;
  durationMinutes?: number;
  location?: string;
  notes?: string;
}

export interface SubmitFabricSelectionInput {
  tailoringRequestId: string;
  fabricTypeId?: string;
  materialId?: string;
  customFabricDescription?: string;
  swatchMediaAssetId?: string;
}

export interface SubmitDesignBriefInput {
  tailoringRequestId: string;
  garmentTypeId: string;
  embroideryTypeId?: string;
  styleNotes?: string;
}

export interface AddReferenceImageInput {
  tailoringRequestId: string;
  mediaAssetId: string;
  caption?: string;
  uploadedBy: ReferenceImageRow['uploaded_by'];
}

export interface CaptureMeasurementsInput {
  customerId: string;
  label: string;
  garmentTypeId: string;
  measurementTemplateId: string;
  measurements: Record<string, number>;
}

export interface CreateQuotationInput {
  tailoringRequestId: string;
  validUntil?: string;
  taxTotal?: number;
  lineItems: Array<{ description: string; amount: number; sortOrder?: number }>;
}

export interface AdvanceProductionStageInput {
  tailoringRequestId: string;
  notes?: string;
}
