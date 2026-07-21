import type { EnqueueTransactionInput } from '@/offline/types';
import type { CreateSiteExpenseInput } from './types';

export const SITE_EXPENSE_OFFLINE_TYPE = 'site_expense.create' as const;

/** Offline queue: create+submit site expense voucher (JSON-only; no attachments). */
export function buildSiteExpenseOfflineEnqueue(
  input: CreateSiteExpenseInput & { offlineCapturedAt?: string | null },
): EnqueueTransactionInput {
  if (!input.projectId) throw new Error('projectId is required');
  if (!input.pettyCashAccountId) throw new Error('pettyCashAccountId is required');
  if (!input.expenseCategoryId) throw new Error('expenseCategoryId is required');
  if (!(input.amount > 0)) throw new Error('amount must be greater than 0');
  if (!input.paidTo?.trim()) throw new Error('paidTo is required');
  if (!input.purpose?.trim()) throw new Error('purpose is required');

  return {
    type: SITE_EXPENSE_OFFLINE_TYPE,
    label: `Site expense · ${input.expenseDate}`,
    projectId: input.projectId,
    endpoint: '/site-expense-vouchers',
    method: 'POST',
    payload: {
      projectId: input.projectId,
      pettyCashAccountId: input.pettyCashAccountId,
      expenseDate: input.expenseDate,
      expenseCategoryId: input.expenseCategoryId,
      amount: input.amount,
      paidTo: input.paidTo.trim(),
      purpose: input.purpose.trim(),
      paymentMode: input.paymentMode,
      mobileNumber: input.mobileNumber ?? null,
      submitAfterCreate: true,
    },
  };
}
