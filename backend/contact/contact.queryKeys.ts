/**
 * src/features/contact/contact.queryKeys.ts
 */
export const contactQueryKeys = {
  all: ['contact'] as const,
  myInquiries: (customerId: string) => [...contactQueryKeys.all, 'my-inquiries', customerId] as const,
  staffInquiries: () => [...contactQueryKeys.all, 'staff-inquiries'] as const,
  inquiryDetail: (id: string) => [...contactQueryKeys.all, 'detail', id] as const,
};
