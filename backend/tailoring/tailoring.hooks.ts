/**
 * src/features/tailoring/tailoring.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './tailoring.service';
import { tailoringQueryKeys } from './tailoring.queryKeys';
import type { TailoringRequestStatus, AppointmentStatus } from '../../lib/supabase/database.types';
import type {
  AddReferenceImageInput,
  AdvanceProductionStageInput,
  CaptureMeasurementsInput,
  CreateQuotationInput,
  ScheduleAppointmentInput,
  SubmitDesignBriefInput,
  SubmitFabricSelectionInput,
  SubmitInquiryInput,
} from './tailoring.types';

export function useActiveGarmentTypes() {
  return useQuery({
    queryKey: tailoringQueryKeys.garmentTypes(),
    queryFn: () => service.listActiveGarmentTypes(),
  });
}

export function useMeasurementTemplates(garmentTypeId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.measurementTemplates(garmentTypeId ?? ''),
    queryFn: () => service.listMeasurementTemplates(garmentTypeId as string),
    enabled: Boolean(garmentTypeId),
  });
}

export function useActiveProductionStages() {
  return useQuery({
    queryKey: tailoringQueryKeys.productionStages(),
    queryFn: () => service.listActiveProductionStages(),
  });
}

export function useMeasurementProfiles(customerId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.measurementProfiles(customerId ?? ''),
    queryFn: () => service.listMeasurementProfiles(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCaptureMeasurements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      linkToTailoringRequestId,
    }: {
      input: CaptureMeasurementsInput;
      linkToTailoringRequestId?: string;
    }) => service.captureMeasurements(input, linkToTailoringRequestId),
    onSuccess: (created, variables) => {
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.measurementProfiles(created.customerId) });
      if (variables.linkToTailoringRequestId) {
        queryClient.invalidateQueries({
          queryKey: tailoringQueryKeys.requestDetail(variables.linkToTailoringRequestId),
        });
      }
    },
  });
}

export function useSubmitInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitInquiryInput) => service.submitInquiry(input),
    onSuccess: (created) => {
      if (created.customerId) {
        queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.myRequests(created.customerId) });
      }
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.staffRequests() });
    },
  });
}

export function useMyTailoringRequests(customerId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.myRequests(customerId ?? ''),
    queryFn: () => service.listMyTailoringRequests(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useTailoringRequestsForStaff() {
  return useQuery({
    queryKey: tailoringQueryKeys.staffRequests(),
    queryFn: () => service.listTailoringRequestsForStaff(),
  });
}

export function useTailoringRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.requestDetail(id ?? ''),
    queryFn: () => service.getTailoringRequestDetail(id as string),
    enabled: Boolean(id),
  });
}

export function useRequestStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.requestStatusHistory(id ?? ''),
    queryFn: () => service.listRequestStatusHistory(id as string),
    enabled: Boolean(id),
  });
}

export function useAdvanceTailoringRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetStatus }: { id: string; targetStatus: TailoringRequestStatus }) =>
      service.advanceTailoringRequestStatus(id, targetStatus),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.requestDetail(updated.id) });
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.staffRequests() });
    },
  });
}

export function useAssignTailoringRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminUserId }: { id: string; adminUserId: string }) =>
      service.assignTailoringRequest(id, adminUserId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.requestDetail(updated.id) });
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.staffRequests() });
    },
  });
}

export function useAppointmentsForRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.appointments(requestId ?? ''),
    queryFn: () => service.listAppointmentsForRequest(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useScheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleAppointmentInput) => service.scheduleAppointment(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.appointments(variables.tailoringRequestId) });
    },
  });
}

export function useUpdateAppointmentStatus(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, targetStatus }: { appointmentId: string; targetStatus: AppointmentStatus }) =>
      service.updateAppointmentStatus(appointmentId, targetStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.appointments(requestId) });
    },
  });
}

export function useFabricSelection(requestId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.fabricSelection(requestId ?? ''),
    queryFn: () => service.getFabricSelection(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useSubmitFabricSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitFabricSelectionInput) => service.submitFabricSelection(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tailoringQueryKeys.fabricSelection(variables.tailoringRequestId),
      });
    },
  });
}

export function useDesignBrief(requestId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.designBrief(requestId ?? ''),
    queryFn: () => service.getDesignBrief(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useSubmitOrUpdateDesignBrief() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitDesignBriefInput) => service.submitOrUpdateDesignBrief(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.designBrief(variables.tailoringRequestId) });
    },
  });
}

export function useReferenceImages(requestId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.referenceImages(requestId ?? ''),
    queryFn: () => service.listReferenceImages(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useAddReferenceImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddReferenceImageInput) => service.addReferenceImage(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tailoringQueryKeys.referenceImages(variables.tailoringRequestId),
      });
    },
  });
}

export function useQuotationsForRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.quotations(requestId ?? ''),
    queryFn: () => service.listQuotationsForRequest(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuotationInput) => service.createQuotation(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.quotations(variables.tailoringRequestId) });
    },
  });
}

export function useSendQuotation(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => service.sendQuotation(quotationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.quotations(requestId) }),
  });
}

export function useAcceptQuotation(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => service.acceptQuotation(quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.quotations(requestId) });
      queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.requestDetail(requestId) });
    },
  });
}

export function useRejectQuotation(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => service.rejectQuotation(quotationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tailoringQueryKeys.quotations(requestId) }),
  });
}

export function useCurrentStage(requestId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.currentStage(requestId ?? ''),
    queryFn: () => service.getCurrentStage(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useStageHistory(requestId: string | undefined) {
  return useQuery({
    queryKey: tailoringQueryKeys.stageHistory(requestId ?? ''),
    queryFn: () => service.listStageHistory(requestId as string),
    enabled: Boolean(requestId),
  });
}

export function useAdvanceProductionStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdvanceProductionStageInput) => service.advanceProductionStage(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tailoringQueryKeys.currentStage(variables.tailoringRequestId),
      });
      queryClient.invalidateQueries({
        queryKey: tailoringQueryKeys.stageHistory(variables.tailoringRequestId),
      });
    },
  });
}
