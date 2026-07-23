/**
 * Mirrors `apps/backend/src/modules/contribution-receipts` public shapes.
 */

export const ContributionPaymentMode = {
  BankTransfer: 'bank_transfer',
  Cheque: 'cheque',
  Cash: 'cash',
  LoanAdjustment: 'loan_adjustment',
  JournalAdjustment: 'journal_adjustment',
} as const;

export type ContributionPaymentMode =
  (typeof ContributionPaymentMode)[keyof typeof ContributionPaymentMode];

export const ContributionReceiptStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Verified: 'verified',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type ContributionReceiptStatus =
  (typeof ContributionReceiptStatus)[keyof typeof ContributionReceiptStatus];

export type PublicContributionReceipt = {
  id: string;
  receiptNumber: string;
  projectId: string;
  participantId: string;
  commitmentId: string;
  receivedDate: string;
  amount: number;
  paymentMode: ContributionPaymentMode;
  bankAccountId: string | null;
  transactionReference: string | null;
  receiptDocument: string | null;
  receiptPdfPath: string | null;
  remarks: string | null;
  status: ContributionReceiptStatus;
  journalEntryId: string | null;
  balancesApplied: boolean;
  accountingNote: string;
  submittedBy: string | null;
  submittedAt: string | null;
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

export type ContributionBalances = {
  project: {
    projectId: string;
    receivedAmount: number;
    postedReceiptCount: number;
    lastReceiptAt: string | null;
  };
  participant: {
    projectId: string;
    participantId: string;
    receivedAmount: number;
    postedReceiptCount: number;
    lastReceiptAt: string | null;
  } | null;
};

export type ListContributionReceiptsQuery = {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  participantId?: string;
  commitmentId?: string;
  status?: ContributionReceiptStatus;
};

export type CreateContributionReceiptInput = {
  participantId: string;
  commitmentId: string;
  receivedDate?: string;
  amount: number;
  paymentMode: ContributionPaymentMode;
  bankAccountId?: string | null;
  transactionReference?: string | null;
  remarks?: string | null;
};

export type CancelContributionReceiptInput = {
  cancellationReason: string;
};

export type PaginatedContributionReceipts = {
  items: PublicContributionReceipt[];
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

export type ParticipantOption = {
  id: string;
  label: string;
};

export type CommitmentOption = {
  id: string;
  label: string;
  pendingAmount: number;
  participantId: string;
};
