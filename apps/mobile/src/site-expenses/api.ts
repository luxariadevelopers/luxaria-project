import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  CancelSiteExpenseInput,
  CreateSiteExpenseInput,
  ExpenseCategoryOption,
  PublicSiteExpenseVoucher,
  RejectSiteExpenseInput,
  ReturnSiteExpenseInput,
  UpdateSiteExpenseInput,
  CashAccountOption,
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

/** `PATCH /site-expense-vouchers/:id` — draft/returned; attach signatures before submit. */
export async function updateSiteExpense(
  id: string,
  input: UpdateSiteExpenseInput,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPatch<PublicSiteExpenseVoucher>(`${BASE}/${id}`, input);
  if (!res.data) throw new Error(res.message || 'Could not update expense');
  return res.data;
}

export async function submitSiteExpense(id: string): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/submit`);
  if (!res.data) throw new Error(res.message || 'Could not submit expense');
  return res.data;
}

/** `POST /site-expense-vouchers/:id/verify` — `expense.approve` */
export async function verifySiteExpense(id: string): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/verify`);
  if (!res.data) throw new Error(res.message || 'Verify failed');
  return res.data;
}

/** `POST /site-expense-vouchers/:id/approve` — `expense.approve` */
export async function approveSiteExpense(id: string): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/approve`);
  if (!res.data) throw new Error(res.message || 'Approve failed');
  return res.data;
}

/** `POST /site-expense-vouchers/:id/post` — `expense.post` */
export async function postSiteExpense(id: string): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/post`, {});
  if (!res.data) throw new Error(res.message || 'Post failed');
  return res.data;
}

/** `POST /site-expense-vouchers/:id/reject` — `expense.approve` */
export async function rejectSiteExpense(
  id: string,
  input: RejectSiteExpenseInput,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/reject`, input);
  if (!res.data) throw new Error(res.message || 'Reject failed');
  return res.data;
}

/** `POST /site-expense-vouchers/:id/return` — `expense.approve` */
export async function returnSiteExpense(
  id: string,
  input: ReturnSiteExpenseInput = {},
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/return`, input);
  if (!res.data) throw new Error(res.message || 'Return failed');
  return res.data;
}

/** `POST /site-expense-vouchers/:id/cancel` — `expense.create` */
export async function cancelSiteExpense(
  id: string,
  input: CancelSiteExpenseInput,
): Promise<PublicSiteExpenseVoucher> {
  const res = await apiPost<PublicSiteExpenseVoucher>(`${BASE}/${id}/cancel`, input);
  if (!res.data) throw new Error(res.message || 'Cancel failed');
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
    code: row.code
      ? String(row.code)
      : row.categoryCode
        ? String(row.categoryCode)
        : undefined,
    requiresSignature: Boolean(row.requiresSignature),
    requiresBill: Boolean(row.requiresBill),
    requiresPhoto: Boolean(row.requiresPhoto),
  }));
}

export type PresignUploadResult = {
  documentId: string;
  uploadUrl: string;
  method: 'PUT' | 'POST';
};

export async function presignExpenseDocumentUpload(input: {
  projectId: string;
  voucherId: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  documentType: string;
}): Promise<PresignUploadResult> {
  const response = await apiPost<{
    document: { id: string };
    upload: { url: string; method?: string };
  }>('/documents/presign-upload', {
    projectId: input.projectId,
    module: 'site_expense_vouchers',
    entityType: 'site_expense_voucher',
    entityId: input.voucherId,
    originalFileName: input.originalFileName,
    mimeType: input.mimeType,
    size: input.size,
    documentType: input.documentType,
  });
  const payload = response.data;
  if (!payload?.document?.id || !payload.upload?.url) {
    throw new Error(response.message || 'Presign upload failed');
  }
  return {
    documentId: payload.document.id,
    uploadUrl: payload.upload.url,
    method: (payload.upload.method as 'PUT' | 'POST' | undefined) ?? 'PUT',
  };
}

export async function confirmExpenseDocumentUpload(
  documentId: string,
): Promise<void> {
  await apiPost(`/documents/${documentId}/confirm-upload`, {});
}
