/**
 * src/features/tailoring/tailoring.queryKeys.ts
 */
export const tailoringQueryKeys = {
  all: ['tailoring'] as const,

  garmentTypes: () => [...tailoringQueryKeys.all, 'garment-types'] as const,
  measurementTemplates: (garmentTypeId: string) =>
    [...tailoringQueryKeys.all, 'measurement-templates', garmentTypeId] as const,
  productionStages: () => [...tailoringQueryKeys.all, 'production-stages'] as const,

  measurementProfiles: (customerId: string) =>
    [...tailoringQueryKeys.all, 'measurement-profiles', customerId] as const,

  myRequests: (customerId: string) => [...tailoringQueryKeys.all, 'my-requests', customerId] as const,
  staffRequests: () => [...tailoringQueryKeys.all, 'staff-requests'] as const,
  requestDetail: (id: string) => [...tailoringQueryKeys.all, 'detail', id] as const,
  requestStatusHistory: (id: string) => [...tailoringQueryKeys.all, 'detail', id, 'status-history'] as const,

  appointments: (requestId: string) => [...tailoringQueryKeys.all, 'detail', requestId, 'appointments'] as const,
  fabricSelection: (requestId: string) =>
    [...tailoringQueryKeys.all, 'detail', requestId, 'fabric-selection'] as const,
  designBrief: (requestId: string) => [...tailoringQueryKeys.all, 'detail', requestId, 'design-brief'] as const,
  referenceImages: (requestId: string) =>
    [...tailoringQueryKeys.all, 'detail', requestId, 'reference-images'] as const,

  quotations: (requestId: string) => [...tailoringQueryKeys.all, 'detail', requestId, 'quotations'] as const,

  currentStage: (requestId: string) => [...tailoringQueryKeys.all, 'detail', requestId, 'current-stage'] as const,
  stageHistory: (requestId: string) => [...tailoringQueryKeys.all, 'detail', requestId, 'stage-history'] as const,
};
