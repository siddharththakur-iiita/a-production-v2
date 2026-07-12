/**
 * src/features/tailoring/tailoring.validation.ts
 *
 * Mirrors the CHECK constraints in 010_tailoring.sql.
 */
import { z } from 'zod';
import { requireAtLeastOneField } from '../../lib/validation/commonSchemas';

const sourceSchema = z.enum(['web', 'whatsapp', 'in_person', 'phone']);

export const submitInquirySchema = z
  .object({
    customerId: z.string().uuid().optional(),
    referenceProductId: z.string().uuid().optional(),
    source: sourceSchema.optional(),
    guestName: z.string().max(200).optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().max(20).optional(),
  })
  .refine((data) => data.customerId || data.guestEmail || data.guestPhone, {
    message: 'Either customerId or a guest email/phone is required',
  });

const appointmentTypeSchema = z.enum(['consultation', 'measurement', 'fitting', 'final_fitting', 'delivery']);
const appointmentModeSchema = z.enum(['in_person', 'virtual']);

export const scheduleAppointmentSchema = z.object({
  tailoringRequestId: z.string().uuid(),
  type: appointmentTypeSchema,
  mode: appointmentModeSchema.optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(1).max(480).optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const submitFabricSelectionSchema = z
  .object({
    tailoringRequestId: z.string().uuid(),
    fabricTypeId: z.string().uuid().optional(),
    materialId: z.string().uuid().optional(),
    customFabricDescription: z.string().max(2000).optional(),
    swatchMediaAssetId: z.string().uuid().optional(),
  })
  .refine((data) => data.fabricTypeId || data.materialId || data.customFabricDescription, {
    message: 'At least one of fabricTypeId, materialId, or customFabricDescription is required',
  });

export const submitDesignBriefSchema = z.object({
  tailoringRequestId: z.string().uuid(),
  garmentTypeId: z.string().uuid(),
  embroideryTypeId: z.string().uuid().optional(),
  styleNotes: z.string().max(5000).optional(),
});

export const addReferenceImageSchema = z.object({
  tailoringRequestId: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  caption: z.string().max(500).optional(),
  uploadedBy: z.enum(['customer', 'staff']),
});

export const captureMeasurementsSchema = z.object({
  customerId: z.string().uuid(),
  label: z.string().min(1, 'A label is required').max(100),
  garmentTypeId: z.string().uuid(),
  measurementTemplateId: z.string().uuid(),
  measurements: z.record(z.number()).refine((m) => Object.keys(m).length > 0, {
    message: 'At least one measurement value is required',
  }),
});

export const createQuotationSchema = z.object({
  tailoringRequestId: z.string().uuid(),
  validUntil: z.string().datetime().optional(),
  taxTotal: z.number().min(0).optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1, 'Description is required').max(500),
        amount: z.number(),
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .min(1, 'At least one line item is required'),
});

export const advanceProductionStageSchema = z.object({
  tailoringRequestId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  appointmentId: z.string().uuid(),
  status: z.enum(['requested', 'confirmed', 'completed', 'no_show', 'cancelled']),
});

export const updateGarmentMeasurementTemplateFieldsSchema = requireAtLeastOneField(
  z.object({
    name: z.string().min(1).max(200).optional(),
    fields: z
      .array(z.object({ key: z.string().min(1), label: z.string().min(1), unit: z.string().min(1) }))
      .min(1)
      .optional(),
  })
);

export type SubmitInquiryValidated = z.infer<typeof submitInquirySchema>;
export type ScheduleAppointmentValidated = z.infer<typeof scheduleAppointmentSchema>;
export type SubmitFabricSelectionValidated = z.infer<typeof submitFabricSelectionSchema>;
export type CaptureMeasurementsValidated = z.infer<typeof captureMeasurementsSchema>;
export type CreateQuotationValidated = z.infer<typeof createQuotationSchema>;
