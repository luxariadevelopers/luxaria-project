import { z } from 'zod';
import { ContributionPaymentMode } from './types';

const BANK_MODES = new Set<string>([
  ContributionPaymentMode.BankTransfer,
  ContributionPaymentMode.Cheque,
]);

export function paymentModeRequiresBankFields(mode: string): boolean {
  return BANK_MODES.has(mode);
}

/**
 * Client preview of Nest headroom rule — amount cannot exceed
 * remaining commitment (`commitmentAmount - receivedAmount`).
 * Server remains authoritative (400).
 */
export function assertAmountWithinCommitmentHeadroom(
  amount: number,
  pendingHeadroom: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(amount) || amount < 0.01) {
    return { ok: false, message: 'Amount must be at least 0.01.' };
  }
  if (amount > pendingHeadroom + 0.0001) {
    return {
      ok: false,
      message: `Amount exceeds remaining commitment (${pendingHeadroom}).`,
    };
  }
  return { ok: true };
}

/**
 * Nest 409 message for duplicate bank txn refs.
 * Used to surface a clear conflict without inventing API fields.
 */
export const DUPLICATE_TXN_REF_MESSAGE =
  'Duplicate transaction reference for this bank account';

export function isDuplicateTransactionReferenceMessage(
  message: string,
): boolean {
  return message.toLowerCase().includes('duplicate transaction reference');
}

export const contributionReceiptCreateSchema = z
  .object({
    participantId: z.string().min(1, 'Participant is required'),
    commitmentId: z.string().min(1, 'Commitment allocation is required'),
    receivedDate: z.string().min(1, 'Received date is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be at least 0.01'),
    paymentMode: z.enum([
      ContributionPaymentMode.BankTransfer,
      ContributionPaymentMode.Cheque,
      ContributionPaymentMode.Cash,
      ContributionPaymentMode.LoanAdjustment,
      ContributionPaymentMode.JournalAdjustment,
    ]),
    bankAccountId: z.string().optional().nullable(),
    transactionReference: z.string().optional().nullable(),
    remarks: z.string().optional(),
    pendingHeadroom: z.coerce.number().min(0),
  })
  .superRefine((values, ctx) => {
    if (paymentModeRequiresBankFields(values.paymentMode)) {
      if (!values.bankAccountId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank account is required for bank transfer / cheque.',
          path: ['bankAccountId'],
        });
      }
      if (!values.transactionReference?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transaction reference is required for bank transfer / cheque.',
          path: ['transactionReference'],
        });
      }
    }
    const headroom = assertAmountWithinCommitmentHeadroom(
      values.amount,
      values.pendingHeadroom,
    );
    if (!headroom.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: headroom.message,
        path: ['amount'],
      });
    }
  });

export type ContributionReceiptCreateFormValues = z.infer<
  typeof contributionReceiptCreateSchema
>;

export const contributionReceiptCancelSchema = z.object({
  cancellationReason: z
    .string()
    .min(5, 'Cancellation reason must be at least 5 characters'),
});

export type ContributionReceiptCancelFormValues = z.infer<
  typeof contributionReceiptCancelSchema
>;
