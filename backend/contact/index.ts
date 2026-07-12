/**
 * src/features/contact/index.ts
 */
export {
  useSubmitInquiry,
  useMyInquiries,
  useInquiriesForStaff,
  useInquiry,
  useAdvanceInquiryStatus,
  useAssignInquiry,
} from './contact.hooks';

export {
  submitInquiry,
  listMyInquiries,
  listInquiriesForStaff,
  getInquiryById,
  advanceInquiryStatus,
  assignInquiry,
} from './contact.service';

export { contactQueryKeys } from './contact.queryKeys';

export type { Inquiry, SubmitInquiryInput } from './contact.types';

export { ContactError } from './contact.errors';
export type { ContactErrorCode } from './contact.errors';
