/**
 * Mirrors `apps/backend/src/modules/expense-categories` public shapes.
 */

export const ExpenseCategoryStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type ExpenseCategoryStatus =
  (typeof ExpenseCategoryStatus)[keyof typeof ExpenseCategoryStatus];

export type PublicExpenseCategory = {
  id: string;
  categoryCode: string;
  name: string;
  parentCategoryId: string | null;
  level: number;
  defaultLedgerAccountId: string | null;
  requiresBill: boolean;
  requiresSignature: boolean;
  requiresPhoto: boolean;
  approvalLimit: number | null;
  status: ExpenseCategoryStatus;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ExpenseCategoryTreeNode = PublicExpenseCategory & {
  children: ExpenseCategoryTreeNode[];
};

export type CreateExpenseCategoryInput = {
  categoryCode: string;
  name: string;
  parentCategoryId?: string | null;
  defaultLedgerAccountId?: string | null;
  requiresBill?: boolean;
  requiresSignature?: boolean;
  requiresPhoto?: boolean;
  approvalLimit?: number | null;
};

export type UpdateExpenseCategoryInput = Partial<
  Omit<CreateExpenseCategoryInput, 'categoryCode'>
>;

export type ConfigureEvidenceRulesInput = {
  requiresBill?: boolean;
  requiresSignature?: boolean;
  requiresPhoto?: boolean;
  approvalLimit?: number | null;
};

export type ListExpenseCategoriesQuery = {
  page?: number;
  limit?: number;
  status?: ExpenseCategoryStatus;
  search?: string;
  parentCategoryId?: string;
  rootsOnly?: boolean;
};

export type SeedStandardResult = {
  created: number;
  skipped: number;
  total: number;
};
