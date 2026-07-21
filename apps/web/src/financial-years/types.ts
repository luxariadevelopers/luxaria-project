import type { PaginationMeta, SortOrder } from '@luxaria/shared-types';

export const FinancialYearStatus = {
  Open: 'open',
  Closed: 'closed',
  Locked: 'locked',
} as const;

export type FinancialYearStatus =
  (typeof FinancialYearStatus)[keyof typeof FinancialYearStatus];

export const UnlockRequestStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type UnlockRequestStatus =
  (typeof UnlockRequestStatus)[keyof typeof UnlockRequestStatus];

export type PublicFinancialYear = {
  id: string;
  companyId: string | null;
  name: string;
  startDate: string;
  endDate: string;
  status: FinancialYearStatus;
  isCurrent: boolean;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicFinancialYearUnlockRequest = {
  id: string;
  financialYearId: string;
  reason: string;
  requestedBy: string;
  status: UnlockRequestStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt?: string;
};

export type FinancialYearCompany = {
  id: string;
  companyCode: string;
  legalName: string;
  tradeName: string;
  isPrimary: boolean;
};

export type FinancialYearListQuery = {
  page?: number;
  limit?: number;
  companyId?: string;
  status?: FinancialYearStatus;
  isCurrent?: boolean;
  isLocked?: boolean;
  sortOrder?: SortOrder;
};

export type UnlockRequestListQuery = {
  page?: number;
  limit?: number;
  status?: UnlockRequestStatus;
};

export type PaginatedFinancialYears = {
  items: PublicFinancialYear[];
  meta: PaginationMeta;
};

export type PaginatedUnlockRequests = {
  items: PublicFinancialYearUnlockRequest[];
  meta: PaginationMeta;
};

export type CreateFinancialYearInput = {
  name: string;
  startDate: string;
  endDate: string;
  companyId?: string | null;
  setAsCurrent?: boolean;
};

export type ValidateTransactionDateInput = {
  transactionDate: string;
  forPosting?: boolean;
  companyId?: string | null;
};

export type TransactionDateValidationResult = {
  valid: boolean;
  reason: string | null;
  financialYear: PublicFinancialYear | null;
  forPosting: boolean;
};

export type RequestFinancialYearUnlockInput = {
  reason: string;
};

export type ApproveFinancialYearUnlockInput = {
  approvalNote?: string | null;
};

export type RejectFinancialYearUnlockInput = {
  rejectionReason: string;
};

export type ApprovedFinancialYearUnlock = {
  financialYear: PublicFinancialYear;
  unlockRequest: PublicFinancialYearUnlockRequest;
};
