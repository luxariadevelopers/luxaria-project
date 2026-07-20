/**
 * Mirrors Nest public shapes for vendor payments
 * (`vendor-payments.mapper.ts` / Swagger tag Vendor Payments).
 *
 * `VendorPaymentStatus` / `VendorPaymentMode` are not yet in shared-types —
 * keep local const objects aligned with the Nest schema.
 */

export const VendorPaymentStatus = {
  Draft: 'draft',
  Approval: 'approval',
  Released: 'released',
  Verified: 'verified',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type VendorPaymentStatus =
  (typeof VendorPaymentStatus)[keyof typeof VendorPaymentStatus];

export const VendorPaymentMode = {
  BankTransfer: 'bank_transfer',
  Neft: 'neft',
  Rtgs: 'rtgs',
  Imps: 'imps',
  Upi: 'upi',
  Cheque: 'cheque',
  Other: 'other',
} as const;

export type VendorPaymentMode =
  (typeof VendorPaymentMode)[keyof typeof VendorPaymentMode];

export type PublicVendorPaymentAllocation = {
  id: string;
  invoiceId: string;
  invoiceDocumentNumber: string | null;
  invoiceNumber: string | null;
  amount: number;
};

export type PublicVendorPayment = {
  id: string;
  paymentNumber: string;
  vendorId: string;
  projectId: string;
  invoiceIds: string[];
  allocations: PublicVendorPaymentAllocation[];
  paymentDate: string;
  amount: number;
  paymentMode: VendorPaymentMode;
  bankAccountId: string;
  transactionReference: string;
  tds: number;
  retention: number;
  deductions: number;
  bankAmount: number;
  paymentProof: string | null;
  status: VendorPaymentStatus;
  journalEntryId: string | null;
  notes: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  releasedBy: string | null;
  releasedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type VendorPaymentAllocationInput = {
  invoiceId: string;
  amount: number;
};

export type CreateVendorPaymentInput = {
  vendorId: string;
  projectId: string;
  allocations: VendorPaymentAllocationInput[];
  paymentDate: string;
  amount: number;
  paymentMode: VendorPaymentMode;
  bankAccountId: string;
  transactionReference: string;
  tds?: number;
  retention?: number;
  deductions?: number;
  paymentProof?: string | null;
  notes?: string | null;
};

export type UpdateVendorPaymentInput = {
  allocations?: VendorPaymentAllocationInput[];
  paymentDate?: string;
  amount?: number;
  paymentMode?: VendorPaymentMode;
  bankAccountId?: string;
  transactionReference?: string;
  tds?: number;
  retention?: number;
  deductions?: number;
  paymentProof?: string | null;
  notes?: string | null;
};

export type ListVendorPaymentsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  vendorId?: string;
  status?: VendorPaymentStatus;
  invoiceId?: string;
};

export type PaginatedVendorPayments = {
  items: PublicVendorPayment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type BankAccountOption = {
  id: string;
  label: string;
};

/** Payable invoice row for allocation picker. */
export type PayableInvoiceOption = {
  id: string;
  documentNumber: string;
  invoiceNumber: string;
  vendorId: string;
  remainingPayable: number;
  status: string;
  matchingStatus: string;
  exceptionApproved: boolean;
};
