import { apiGet, apiPost } from '@/api/client';
import type {
  CashAccountOption,
  CreateSiteExpenseInput,
  ExpenseCategoryOption,
  PublicSiteExpenseVoucher,
} from './types';

const BASE = '/site-expense-vouchers';

export async function listSiteExpenses(params: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<PublicSiteExpenseVoucher[]> {
  const res = await apiGet<PublicSiteExpenseVoucher[]>(BASE, {
    projectId: params.projectId,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  return res.data ?? [];
}

export async function getSiteExpense(id: string): Promise<PublicSiteExpenseVoucher> {
  const res = await apiGet<PublicSiteExpenseVoucher>(`${BASE}/${id}`);
  if (!res.data) throw new Error(res.message || 'Expense not found');
  return res.data;
}

export async function createSiteExpense(
  input: CreateSiteExpenseInput,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(BASE, input);
  if (!res.data) throw new Error(res.message || 'Could not create expense');
  return res.data;
}

export async function submitSiteExpense(id: string): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/submit`);
  if (!res.data) throw new Error(res.message || 'Could not submit expense');
  return res.data;
}

export async function listCashAccounts(): Promise<CashAccountOption[]> {
  const res = await apiGet<Array<Record<string, unknown>>>('/cash-accounts', {
    page: 1,
    limit: 50,
  });
  return (res.data ?? []).map((row) => ({
    id: String(row.id),
    accountName: String(row.accountName ?? row.name ?? row.id),
    accountCode: row.accountCode ? String(row.accountCode) : undefined,
  }));
}

export async function listExpenseCategories(): Promise<ExpenseCategoryOption[]> {
  const res = await apiGet<Array<Record<string, unknown>>>('/expense-categories', {
    page: 1,
    limit: 100,
  });
  return (res.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? row.categoryName ?? row.id),
    code: row.code ? String(row.code) : undefined,
  }));
}
