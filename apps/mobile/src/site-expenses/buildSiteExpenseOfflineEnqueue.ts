import type { EnqueueMediaInput, EnqueueTransactionInput } from '@/offline/types';
import type { LocalFile } from '@/utils/fileUpload';
import { assertSignatureReady } from './signatureRequired';
import type { CreateSiteExpenseInput } from './types';

export const SITE_EXPENSE_OFFLINE_TYPE = 'site_expense.create' as const;

export type BuildSiteExpenseOfflineEnqueueInput = CreateSiteExpenseInput & {
  offlineCapturedAt?: string | null;
  /** Category evidence rule — when true, `signature` media is required. */
  requiresSignature?: boolean;
  signature?: LocalFile | null;
};

/**
 * Offline queue: create+submit site expense voucher.
 * Signature media uploads first; document IDs merge into Nest attachments
 * via `mergeSiteExpenseAttachments` in prepareCreateBody.
 */
export function buildSiteExpenseOfflineEnqueue(
  input: BuildSiteExpenseOfflineEnqueueInput,
): EnqueueTransactionInput {
  if (!input.projectId) throw new Error('projectId is required');
  if (!input.pettyCashAccountId) throw new Error('pettyCashAccountId is required');
  if (!input.expenseCategoryId) throw new Error('expenseCategoryId is required');
  if (!(input.amount > 0)) throw new Error('amount must be greater than 0');
  if (!input.paidTo?.trim()) throw new Error('paidTo is required');
  if (!input.purpose?.trim()) throw new Error('purpose is required');

  const requiresSignature = Boolean(input.requiresSignature);
  const sigCheck = assertSignatureReady({
    requiresSignature,
    hasSignature: Boolean(input.signature),
  });
  if (!sigCheck.ok) {
    throw new Error(sigCheck.error);
  }

  const media: EnqueueMediaInput[] = [];
  if (input.signature) {
    media.push({
      localPath: input.signature.uri,
      mimeType: input.signature.mimeType,
      fileName: input.signature.name,
      fieldKey: 'signature',
      uploadMeta: {
        module: 'site_expense_vouchers',
        entityType: 'site_expense_voucher',
        // Voucher id does not exist yet; bind docs to projectId (valid ObjectId) for presign.
        entityId: input.projectId,
        documentType: 'signature',
        size: input.signature.size ?? 1,
        projectId: input.projectId,
      },
    });
  }

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
      offlineCapturedAt: input.offlineCapturedAt ?? new Date().toISOString(),
    },
    media: media.length > 0 ? media : undefined,
  };
}
