/**
 * Mirrors Nest public shapes for contractor payments
 * (`contractor-payments.mapper.ts` / Swagger tag Contractor Payments).
 *
 * Status / mode enums are not yet in shared-types — keep local const objects
 * aligned with the Nest schema.
 */

export const ContractorPaymentStatus = {
  Draft: 'draft',
  Approval: 'approval',
  Released: 'released',
  Verified: 'verified',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type ContractorPaymentStatus =
  (typeof ContractorPaymentStatus)[keyof typeof ContractorPaymentStatus];

export const ContractorPaymentMode = {
  BankTransfer: 'bank_transfer',
  Neft: 'neft',
  Rtgs: 'rtgs',
  Imps: 'imps',
  Upi: 'upi',
  Cheque: 'cheque',
  Other: 'other',
} as const;

export type ContractorPaymentMode =
  (typeof ContractorPaymentMode)[keyof typeof ContractorPaymentMode];

export type PublicContractorPaymentAllocation = {
  id: string;
  billId: string;
  billNumber: string | null;
  raNumber: number | null;
  amount: number;
};

export type PublicContractorPayment = {
  id: string;
  paymentNumber: string;
  contractorId: string;
  projectId: string;
  billIds: string[];
  allocations: PublicContractorPaymentAllocation[];
  paymentDate: string;
  amount: number;
  paymentMode: ContractorPaymentMode;
  bankAccountId: string;
  transactionReference: string;
  tds: number;
  retention: number;
  advanceRecovery: number;
  penalty: number;
  bankAmount: number;
  paymentProof: string | null;
  status: ContractorPaymentStatus;
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

export type ContractorPaymentAllocationInput = {
  billId: string;
  amount: number;
};

export type CreateContractorPaymentInput = {
  contractorId: string;
  projectId: string;
  allocations: ContractorPaymentAllocationInput[];
  paymentDate: string;
  amount: number;
  paymentMode: ContractorPaymentMode;
  bankAccountId: string;
  transactionReference: string;
  tds?: number;
  retention?: number;
  advanceRecovery?: number;
  penalty?: number;
  paymentProof?: string | null;
  notes?: string | null;
};

export type UpdateContractorPaymentInput = {
  allocations?: ContractorPaymentAllocationInput[];
  paymentDate?: string;
  amount?: number;
  paymentMode?: ContractorPaymentMode;
  bankAccountId?: string;
  transactionReference?: string;
  tds?: number;
  retention?: number;
  advanceRecovery?: number;
  penalty?: number;
  paymentProof?: string | null;
  notes?: string | null;
};

export type ListContractorPaymentsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  contractorId?: string;
  status?: ContractorPaymentStatus;
  billId?: string;
};

export type PaginatedContractorPayments = {
  items: PublicContractorPayment[];
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

/** Posted running bill row for allocation picker. */
export type PayableBillOption = {
  id: string;
  billNumber: string;
  raNumber: number;
  contractorId: string;
  netPayable: number;
  paidAmount: number;
  remainingPayable: number;
  status: string;
  retention: number;
  advanceRecovery: number;
  tds: number;
};
