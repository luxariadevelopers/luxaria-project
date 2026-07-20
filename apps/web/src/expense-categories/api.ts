import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ConfigureEvidenceRulesInput,
  CreateExpenseCategoryInput,
  ExpenseCategoryTreeNode,
  ListExpenseCategoriesQuery,
  PublicExpenseCategory,
  SeedStandardResult,
  UpdateExpenseCategoryInput,
} from './types';

function toIso(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseCategory(row: PublicExpenseCategory): PublicExpenseCategory {
  return {
    ...row,
    createdAt: row.createdAt ? toIso(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? toIso(row.updatedAt) : undefined,
  };
}

function normaliseTree(
  nodes: ExpenseCategoryTreeNode[],
): ExpenseCategoryTreeNode[] {
  return nodes.map((n) => ({
    ...normaliseCategory(n),
    children: normaliseTree(n.children ?? []),
  }));
}

/** `GET /expense-categories/tree` — `expense_category.view` */
export async function fetchExpenseCategoryTree(
  status?: string,
): Promise<ExpenseCategoryTreeNode[]> {
  const res = await apiGet<ExpenseCategoryTreeNode[]>(
    '/expense-categories/tree',
    { status: status || undefined },
  );
  return normaliseTree(res.data ?? []);
}

/** `GET /expense-categories` — `expense_category.view` */
export async function fetchExpenseCategories(
  query: ListExpenseCategoriesQuery = {},
): Promise<PublicExpenseCategory[]> {
  const res = await apiGet<PublicExpenseCategory[]>('/expense-categories', {
    page: query.page ?? 1,
    limit: query.limit ?? 200,
    status: query.status,
    search: query.search,
    parentCategoryId: query.parentCategoryId,
    rootsOnly: query.rootsOnly,
  });
  return (res.data ?? []).map(normaliseCategory);
}

/** `GET /expense-categories/:id` — `expense_category.view` */
export async function fetchExpenseCategory(
  id: string,
): Promise<PublicExpenseCategory> {
  const res = await apiGet<PublicExpenseCategory>(`/expense-categories/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Expense category unavailable');
  }
  return normaliseCategory(res.data);
}

/** `POST /expense-categories` — `expense_category.manage` */
export async function createExpenseCategory(
  input: CreateExpenseCategoryInput,
): Promise<PublicExpenseCategory> {
  const res = await apiPost<PublicExpenseCategory>(
    '/expense-categories',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create expense category failed');
  }
  return normaliseCategory(res.data);
}

/** `PATCH /expense-categories/:id` — `expense_category.manage` */
export async function updateExpenseCategory(
  id: string,
  input: UpdateExpenseCategoryInput,
): Promise<PublicExpenseCategory> {
  const res = await apiPatch<PublicExpenseCategory>(
    `/expense-categories/${id}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Update expense category failed');
  }
  return normaliseCategory(res.data);
}

/**
 * `PATCH /expense-categories/:id/evidence-rules` — `expense_category.manage`
 */
export async function configureEvidenceRules(
  id: string,
  input: ConfigureEvidenceRulesInput,
): Promise<PublicExpenseCategory> {
  const res = await apiPatch<PublicExpenseCategory>(
    `/expense-categories/${id}/evidence-rules`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Configure evidence rules failed');
  }
  return normaliseCategory(res.data);
}

/** `POST /expense-categories/:id/parent` — `expense_category.manage` */
export async function setExpenseCategoryParent(
  id: string,
  parentCategoryId: string | null,
): Promise<PublicExpenseCategory> {
  const res = await apiPost<PublicExpenseCategory>(
    `/expense-categories/${id}/parent`,
    { parentCategoryId },
  );
  if (!res.data) {
    throw new Error(res.message || 'Move expense category failed');
  }
  return normaliseCategory(res.data);
}

/** `POST /expense-categories/:id/activate` — `expense_category.manage` */
export async function activateExpenseCategory(
  id: string,
): Promise<PublicExpenseCategory> {
  const res = await apiPost<PublicExpenseCategory>(
    `/expense-categories/${id}/activate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Activate failed');
  }
  return normaliseCategory(res.data);
}

/** `POST /expense-categories/:id/deactivate` — `expense_category.manage` */
export async function deactivateExpenseCategory(
  id: string,
): Promise<PublicExpenseCategory> {
  const res = await apiPost<PublicExpenseCategory>(
    `/expense-categories/${id}/deactivate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Deactivate failed');
  }
  return normaliseCategory(res.data);
}

/** `DELETE /expense-categories/:id` — `expense_category.manage` */
export async function deleteExpenseCategory(id: string): Promise<void> {
  await apiDelete(`/expense-categories/${id}`);
}

/** `POST /expense-categories/seed-standard` — `expense_category.manage` */
export async function seedStandardExpenseCategories(): Promise<SeedStandardResult> {
  const res = await apiPost<SeedStandardResult>(
    '/expense-categories/seed-standard',
  );
  if (!res.data) {
    throw new Error(res.message || 'Seed failed');
  }
  return res.data;
}
