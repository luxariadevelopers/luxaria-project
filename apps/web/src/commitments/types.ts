/**
 * Mirrors `apps/backend/src/modules/project-commitments` public shapes.
 * Contribution type is Nest's funding instrument classification
 * (there is no separate `instrumentType` on commitments).
 */

export const ContributionType = {
  Capital: 'capital',
  Equity: 'equity',
  Loan: 'loan',
  JointVenture: 'joint_venture',
  Other: 'other',
} as const;

export type ContributionType =
  (typeof ContributionType)[keyof typeof ContributionType];

export const CommitmentStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Approved: 'approved',
  Cancelled: 'cancelled',
  Superseded: 'superseded',
} as const;

export type CommitmentStatus =
  (typeof CommitmentStatus)[keyof typeof CommitmentStatus];

export type PaymentScheduleLine = {
  dueDate: string;
  amount: number;
  label: string | null;
};

export type ExpectedBankAccount = {
  bankName: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
};

export type CommitmentReceiptLine = {
  amount: number;
  receivedAt: string;
  reference: string | null;
  remarks: string | null;
  recordedBy: string | null;
};

export type PublicCommitment = {
  id: string;
  projectId: string;
  participantId: string;
  commitmentNumber: string;
  commitmentAmount: number;
  commitmentDate: string;
  dueDate: string | null;
  contributionType: ContributionType;
  paymentSchedule: PaymentScheduleLine[];
  expectedBankAccount: ExpectedBankAccount;
  agreementReference: string | null;
  remarks: string | null;
  status: CommitmentStatus;
  version: number;
  supersedesId: string | null;
  receivedAmount: number;
  pendingAmount: number;
  receipts: CommitmentReceiptLine[];
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CommitmentSummary = {
  projectId: string;
  participantId: string | null;
  committedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  approvedCommitmentCount: number;
  note: string;
};

export type ListCommitmentsQuery = {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  participantId?: string;
  status?: CommitmentStatus;
};

export type CreateCommitmentInput = {
  participantId: string;
  commitmentAmount: number;
  commitmentDate?: string;
  dueDate?: string | null;
  contributionType: ContributionType;
  paymentSchedule?: Array<{
    dueDate: string;
    amount: number;
    label?: string | null;
  }>;
  expectedBankAccount?: {
    bankName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumberLast4?: string | null;
  };
  agreementReference?: string | null;
  remarks?: string | null;
};

export type AmendCommitmentInput = {
  commitmentAmount: number;
  dueDate?: string | null;
  contributionType?: ContributionType;
  paymentSchedule?: Array<{
    dueDate: string;
    amount: number;
    label?: string | null;
  }>;
  expectedBankAccount?: {
    bankName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumberLast4?: string | null;
  };
  agreementReference?: string | null;
  remarks: string;
};

export type CancelCommitmentInput = {
  cancellationReason: string;
};

export type PaginatedCommitments = {
  items: PublicCommitment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
