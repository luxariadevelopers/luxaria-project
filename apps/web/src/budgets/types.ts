/** Mirrors Nest `apps/backend/src/modules/budgets`. */

export const BudgetStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Approved: 'approved',
  Superseded: 'superseded',
  Cancelled: 'cancelled',
} as const;

export type BudgetStatus = (typeof BudgetStatus)[keyof typeof BudgetStatus];

export type PublicBudget = {
  id: string;
  budgetNumber: string;
  companyId: string;
  projectId: string | null;
  financialYearId: string;
  name: string;
  version: number;
  status: BudgetStatus;
  totalAmount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BudgetListRow = Pick<
  PublicBudget,
  | 'id'
  | 'budgetNumber'
  | 'name'
  | 'financialYearId'
  | 'projectId'
  | 'version'
  | 'status'
  | 'totalAmount'
  | 'createdAt'
>;

export type ListBudgetsQuery = {
  page?: number;
  limit?: number;
  companyId?: string;
  projectId?: string;
  financialYearId?: string;
  status?: BudgetStatus;
};

export type PaginatedBudgets = {
  items: BudgetListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
