/**
 * src/features/contact/contact.hooks.ts
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from './contact.service';
import { contactQueryKeys } from './contact.queryKeys';
import type { InquiryStatus } from '../../lib/supabase/database.types';
import type { SubmitInquiryInput } from './contact.types';

export function useSubmitInquiry() {
  return useMutation({ mutationFn: (input: SubmitInquiryInput) => service.submitInquiry(input) });
}

export function useMyInquiries(customerId: string | undefined) {
  return useQuery({
    queryKey: contactQueryKeys.myInquiries(customerId ?? ''),
    queryFn: () => service.listMyInquiries(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useInquiriesForStaff() {
  return useQuery({
    queryKey: contactQueryKeys.staffInquiries(),
    queryFn: () => service.listInquiriesForStaff(),
  });
}

export function useInquiry(id: string | undefined) {
  return useQuery({
    queryKey: contactQueryKeys.inquiryDetail(id ?? ''),
    queryFn: () => service.getInquiryById(id as string),
    enabled: Boolean(id),
  });
}

export function useAdvanceInquiryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetStatus }: { id: string; targetStatus: InquiryStatus }) =>
      service.advanceInquiryStatus(id, targetStatus),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.inquiryDetail(updated.id) });
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.staffInquiries() });
    },
  });
}

export function useAssignInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminUserId }: { id: string; adminUserId: string }) =>
      service.assignInquiry(id, adminUserId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.inquiryDetail(updated.id) });
      queryClient.invalidateQueries({ queryKey: contactQueryKeys.staffInquiries() });
    },
  });
}
