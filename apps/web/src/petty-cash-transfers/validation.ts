import { z } from 'zod';
import {
  PettyCashFundTransferStatus,
  type PublicPettyCashFundTransfer,
} from './types';

/**
 * Client preview of Nest approved-remainder rule —
 * `amount ≤ remainingApprovedBalance`.
 * Server remains authoritative (400).
 */
export function assertAmountWithinApprovedRemainder(
  amount: number,
  remainingApprovedBalance: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(amount) || amount < 0.01) {
    return { ok: false, message: 'Amount must be at least 0.01.' };
  }
  if (amount > remainingApprovedBalance + 0.0001) {
    return {
      ok: false,
      message: `Amount exceeds approved request balance (remaining ${remainingApprovedBalance}).`,
    };
  }
  return { ok: true };
}

/**
 * Nest 409 when reusing an idempotency key that already created a transfer.
 * Also used for soft client detection of duplicate bank txn refs in the list.
 */
export const DUPLICATE_TXN_REF_MESSAGE =
  'Duplicate transaction reference for this bank account';

export function isDuplicateTransactionReferenceMessage(
  message: string,
): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('duplicate transaction reference') ||
    lower.includes('idempotency key already exists')
  );
}

/**
 * Soft client check — Nest does not unique-index txn refs on fund transfers.
 * Blocks create when another active transfer already uses the same bank + ref.
 */
export function findDuplicateTransactionReference(
  transfers: readonly PublicPettyCashFundTransfer[],
  sourceBankAccountId: string,
  transactionReference: string,
  excludeTransferId?: string,
): PublicPettyCashFundTransfer | null {
  const ref = transactionReference.trim().toLowerCase();
  if (!ref || !sourceBankAccountId) return null;
  for (const row of transfers) {
    if (excludeTransferId && row.id === excludeTransferId) continue;
    if (row.status === PettyCashFundTransferStatus.Cancelled) continue;
    if (row.sourceBankAccountId !== sourceBankAccountId) continue;
    if ((row.transactionReference ?? '').trim().toLowerCase() === ref) {
      return row;
    }
  }
  return null;
}

export const transferCreateSchema = z
  .object({
    requestId: z.string().min(1, 'Approved request is required'),
    sourceBankAccountId: z.string().min(1, 'Source bank account is required'),
    destinationPettyCashAccountId: z
      .string()
      .min(1, 'Destination petty-cash account is required'),
    transferDate: z.string().min(1, 'Transfer date is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be at least 0.01'),
    transactionReference: z
      .string()
      .min(1, 'Transaction reference is required'),
    paymentProof: z.string().optional().nullable(),
    remainingApprovedBalance: z.coerce.number().min(0),
  })
  .superRefine((values, ctx) => {
    const headroom = assertAmountWithinApprovedRemainder(
      values.amount,
      values.remainingApprovedBalance,
    );
    if (!headroom.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: headroom.message,
        path: ['amount'],
      });
    }
  });

export type TransferCreateFormValues = z.infer<typeof transferCreateSchema>;

export const transferCancelSchema = z.object({
  cancellationReason: z
    .string()
    .min(5, 'Cancellation reason must be at least 5 characters'),
});

export type TransferCancelFormValues = z.infer<typeof transferCancelSchema>;
