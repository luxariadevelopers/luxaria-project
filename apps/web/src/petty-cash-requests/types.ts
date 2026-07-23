/**
 * Mirrors Nest `PublicPettyCashRequirement` /
 * `apps/backend/src/modules/petty-cash-requirements`.
 */

export const PettyCashRequirementStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  ProjectManagerReview: 'project_manager_review',
  FinanceReview: 'finance_review',
  Approved: 'approved',
  Funded: 'funded',
  Closed: 'closed',
  Rejected: 'rejected',
  Returned: 'returned',
  Cancelled: 'cancelled',
} as const;

export type PettyCashRequirementStatus =
  (typeof PettyCashRequirementStatus)[keyof typeof PettyCashRequirementStatus];

/** Nest `PettyCashExpenseCategory` */
export const PettyCashExpenseCategory = {
  Travel: 'travel',
  Transport: 'transport',
  Food: 'food',
  Materials: 'materials',
  Labour: 'labour',
  Tools: 'tools',
  Utilities: 'utilities',
  SiteMisc: 'site_misc',
  Other: 'other',
} as const;

export type PettyCashExpenseCategory =
  (typeof PettyCashExpenseCategory)[keyof typeof PettyCashExpenseCategory];

export type PublicRequirementItem = {
  id: string;
  expenseCategory: PettyCashExpenseCategory;
  description: string;
  estimatedAmount: number;
};

export type PublicPettyCashRequirement = {
  id: string;
  requestNumber: string;
  projectId: string;
  pettyCashAccountId: string;
  requestedBy: string;
  requestedByName: string | null;
  weekStartDate: string;
  weekEndDate: string;
  currentCashBalance: number;
  previousUnsettledAmount: number;
  warnings: string[];
  requestedAmount: number;
  approvedAmount: number | null;
  fundedAmount: number | null;
  requirementItems: PublicRequirementItem[];
  justification: string;
  status: PettyCashRequirementStatus;
  approvalRequestId: string | null;
  projectManagerReviewedBy: string | null;
  projectManagerReviewedByName: string | null;
  projectManagerReviewedAt: string | null;
  financeReviewedBy: string | null;
  financeReviewedByName: string | null;
  financeReviewedAt: string | null;
  approvedByName: string | null;
  fundedBy: string | null;
  fundedByName: string | null;
  fundedAt: string | null;
  closedBy: string | null;
  closedByName: string | null;
  closedAt: string | null;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RequirementItemInput = {
  expenseCategory: PettyCashExpenseCategory;
  description: string;
  estimatedAmount: number;
};

export type CreatePettyCashRequirementInput = {
  projectId: string;
  pettyCashAccountId: string;
  weekStartDate: string;
  weekEndDate: string;
  requirementItems: RequirementItemInput[];
  justification: string;
};

export type UpdatePettyCashRequirementInput = {
  requirementItems?: RequirementItemInput[];
  justification?: string;
  weekStartDate?: string;
  weekEndDate?: string;
};

export type ReviewActionInput = {
  comment?: string;
};

export type FinanceApproveInput = ReviewActionInput & {
  approvedAmount?: number;
};

export type FundRequirementInput = {
  fundedAmount?: number;
};

export type ListPettyCashRequirementsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  pettyCashAccountId?: string;
  status?: PettyCashRequirementStatus;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedPettyCashRequirements = {
  items: PublicPettyCashRequirement[];
  meta: PaginationMeta;
};

/** Nest `CashAccountKind` — only petty_cash used for request picker. */
export const CashAccountKind = {
  SiteCash: 'site_cash',
  PettyCash: 'petty_cash',
} as const;

export type CashAccountKind =
  (typeof CashAccountKind)[keyof typeof CashAccountKind];

export type PublicCashAccount = {
  id: string;
  accountCode: string;
  accountName: string;
  kind: CashAccountKind | string;
  projectId: string;
  custodianUserId: string;
  ledgerAccountId: string;
  maximumHoldingLimit: number;
  replenishmentLevel: number;
  openingBalance: number;
  status: string;
};

export type CashBalanceView = {
  cashAccountId: string;
  accountCode: string;
  ledgerAccountId: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  maximumHoldingLimit: number;
  replenishmentLevel: number;
  needsReplenishment: boolean;
  isOverLimit: boolean;
  isNegative: boolean;
  asOf: string;
};
