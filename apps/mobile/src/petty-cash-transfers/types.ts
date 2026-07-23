/**
 * Mirrors Nest `petty-cash-fund-transfers` public shapes.
 */

export const PettyCashFundTransferStatus = {
  Draft: 'draft',
  Verified: 'verified',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type PettyCashFundTransferStatus =
  (typeof PettyCashFundTransferStatus)[keyof typeof PettyCashFundTransferStatus];

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

export type ListPettyCashFundTransfersQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  requestId?: string;
  status?: PettyCashFundTransferStatus;
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

export type CancelPettyCashFundTransferInput = {
  cancellationReason: string;
};
