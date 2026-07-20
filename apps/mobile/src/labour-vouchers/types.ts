/** Types aligned with Nest signed-payment-vouchers + cash-accounts public DTOs. */

export const SIGNED_PAYMENT_VOUCHER_TYPE = {
  Labour: 'labour',
  CashPayment: 'cash_payment',
} as const;

export type SignedPaymentVoucherType =
  (typeof SIGNED_PAYMENT_VOUCHER_TYPE)[keyof typeof SIGNED_PAYMENT_VOUCHER_TYPE];

export const SIGNED_PAYMENT_VOUCHER_STATUS = {
  Draft: 'draft',
  Submitted: 'submitted',
  Approved: 'approved',
  Posted: 'posted',
  Reversed: 'reversed',
  Cancelled: 'cancelled',
  Returned: 'returned',
} as const;

export type SignedPaymentVoucherStatus =
  (typeof SIGNED_PAYMENT_VOUCHER_STATUS)[keyof typeof SIGNED_PAYMENT_VOUCHER_STATUS];

export type SignedPaymentVoucher = {
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
  submittedAt: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateSignedPaymentVoucherInput = {
  voucherType: SignedPaymentVoucherType;
  projectId: string;
  pettyCashAccountId: string;
  recipientName: string;
  recipientMobile?: string | null;
  workDescription: string;
  grossAmount: number;
  deductions?: number;
  requiresWitnessSignature?: boolean;
  requiresRecipientPhoto?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt: string;
  deviceId?: string | null;
};

export type AttachSignaturesInput = {
  recipientSignatureDocumentId?: string;
  engineerSignatureDocumentId?: string;
  witnessSignatureDocumentId?: string;
  recipientPhotoDocumentId?: string;
};

export type CashAccount = {
  id: string;
  accountCode: string;
  accountName: string;
  kind: 'site_cash' | 'petty_cash';
  projectId: string;
  status: 'active' | 'pending_handover' | 'closed';
};

export type SignatureSlot =
  | 'recipient_signature'
  | 'engineer_signature'
  | 'witness_signature'
  | 'recipient_photo';

/** Local form fields used to derive Nest `grossAmount` / `netAmount`. */
export type LabourVoucherFormValues = {
  recipientName: string;
  recipientMobile: string;
  workDescription: string;
  attendanceQuantity: string;
  rate: string;
  deductions: string;
  pettyCashAccountId: string;
  requiresWitnessSignature: boolean;
  requiresRecipientPhoto: boolean;
};

export type LabourVoucherAmounts = {
  quantity: number;
  rate: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
};
