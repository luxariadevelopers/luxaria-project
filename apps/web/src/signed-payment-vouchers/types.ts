import { SignedPaymentVoucherStatus } from '@luxaria/shared-types';

export { SignedPaymentVoucherStatus };

export const SIGNED_PAYMENT_VOUCHER_TYPE = {
  Labour: 'labour',
  CashPayment: 'cash_payment',
} as const;

export type SignedPaymentVoucherType =
  (typeof SIGNED_PAYMENT_VOUCHER_TYPE)[keyof typeof SIGNED_PAYMENT_VOUCHER_TYPE];

export type PublicSignedPaymentVoucher = {
  id: string;
  voucherNumber: string;
  voucherType: SignedPaymentVoucherType;
  projectId: string;
  pettyCashAccountId: string;
  recipientName: string;
  recipientMobile: string | null;
  workDescription: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  recipientSignatureDocumentId: string | null;
  recipientSignatureChecksum: string | null;
  engineerSignatureDocumentId: string | null;
  engineerSignatureChecksum: string | null;
  requiresWitnessSignature: boolean;
  witnessSignatureDocumentId: string | null;
  witnessSignatureChecksum: string | null;
  requiresRecipientPhoto: boolean;
  recipientPhotoDocumentId: string | null;
  recipientPhotoChecksum: string | null;
  voucherPdfDocumentId: string | null;
  voucherPdfChecksum: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string;
  deviceId: string | null;
  status: SignedPaymentVoucherStatus;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  replacesVoucherId: string | null;
  replacementVoucherId: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  reversedBy: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListSignedPaymentVouchersQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  voucherType?: SignedPaymentVoucherType;
  status?: SignedPaymentVoucherStatus;
};

export type PaginatedSignedPaymentVouchers = {
  items: PublicSignedPaymentVoucher[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type CancelSignedPaymentVoucherInput = {
  cancellationReason: string;
};

export type ReverseSignedPaymentVoucherInput = {
  reason: string;
  createReplacement?: boolean;
};
