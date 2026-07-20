/**
 * Mirrors Nest `petty-cash-fund-transfers` public shapes
 * (`toPublicFundTransfer` + balance payload).
 */

export const PettyCashFundTransferStatus = {
  Draft: 'draft',
  Verified: 'verified',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type PettyCashFundTransferStatus =
  (typeof PettyCashFundTransferStatus)[keyof typeof PettyCashFundTransferStatus];

/** Fundable weekly requirements (`approved` | `funded`). */
export const FundableRequirementStatus = {
  Approved: 'approved',
  Funded: 'funded',
} as const;

export type FundableRequirementStatus =
  (typeof FundableRequirementStatus)[keyof typeof FundableRequirementStatus];

export type PublicPettyCashFundTransfer = {
  id: string;
  transferNumber: string;
  projectId: string;
  requestId: string;
  sourceBankAccountId: string;
  destinationPettyCashAccountId: string;
  transferDate: string;
  amount: number;
  transactionReference: string | null;
  paymentProof: string | null;
  status: PettyCashFundTransferStatus;
  journalEntryId: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** `GET /petty-cash-fund-transfers/request/:requestId/balance` */
export type ApprovedRequestBalance = {
  requestId: string;
  approvedAmount: number;
  fundedAmount: number;
  committedTransferAmount: number;
  remainingApprovedBalance: number;
};

export type ListPettyCashFundTransfersQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  requestId?: string;
  status?: PettyCashFundTransferStatus;
};

export type CreatePettyCashFundTransferInput = {
  projectId: string;
  requestId: string;
  sourceBankAccountId: string;
  destinationPettyCashAccountId: string;
  transferDate: string;
  amount: number;
  transactionReference?: string | null;
  paymentProof?: string | null;
};

export type UpdatePettyCashFundTransferInput = Partial<
  Omit<CreatePettyCashFundTransferInput, 'projectId'>
> & {
  projectId?: string;
};

export type CancelPettyCashFundTransferInput = {
  cancellationReason: string;
};

export type PaginatedPettyCashFundTransfers = {
  items: PublicPettyCashFundTransfer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** Minimal row from `GET /petty-cash-requirements` for fundable requests. */
export type FundablePettyCashRequirement = {
  id: string;
  requestNumber: string;
  projectId: string;
  pettyCashAccountId: string;
  status: FundableRequirementStatus | string;
  approvedAmount: number | null;
  fundedAmount: number | null;
  weekStartDate?: string;
  weekEndDate?: string;
};

export type BankAccountOption = {
  id: string;
  label: string;
};
