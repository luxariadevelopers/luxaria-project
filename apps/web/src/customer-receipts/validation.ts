import { z } from 'zod';
import { computeAllocationTotals } from './allocation';
import {
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
} from './types';

const BANK_REQUIRED_MODES = new Set<string>([
  CustomerReceiptPaymentMode.BankTransfer,
  CustomerReceiptPaymentMode.Neft,
  CustomerReceiptPaymentMode.Rtgs,
  CustomerReceiptPaymentMode.Imps,
  CustomerReceiptPaymentMode.Upi,
  CustomerReceiptPaymentMode.Cheque,
]);

export function paymentModeRequiresBankFields(mode: string): boolean {
  return BANK_REQUIRED_MODES.has(mode);
}

/**
 * Nest 409 from `assertUniqueTxnRef`:
 * "transactionReference already used for this company bank account"
 */
export const DUPLICATE_TXN_REF_MESSAGE =
  'transactionReference already used for this company bank account';

export function isDuplicateTransactionReferenceMessage(
  message: string,
): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('transactionreference already used') ||
    lower.includes('duplicate transaction reference')
  );
}

export const customerReceiptCreateSchema = z
  .object({
    customerId: z.string().min(1, 'Customer is required'),
    bookingId: z.string().min(1, 'Booking is required'),
    receiptDate: z.string().min(1, 'Receipt date is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be at least 0.01'),
    paymentMode: z.enum([
      CustomerReceiptPaymentMode.BankTransfer,
      CustomerReceiptPaymentMode.Neft,
      CustomerReceiptPaymentMode.Rtgs,
      CustomerReceiptPaymentMode.Imps,
      CustomerReceiptPaymentMode.Upi,
      CustomerReceiptPaymentMode.Cheque,
      CustomerReceiptPaymentMode.Cash,
      CustomerReceiptPaymentMode.Other,
    ]),
    companyBankAccountId: z.string().optional().nullable(),
    transactionReference: z.string().optional().nullable(),
    sourceType: z.enum([
      CustomerReceiptSourceType.OwnFund,
      CustomerReceiptSourceType.BankLoan,
      CustomerReceiptSourceType.RefundAdjustment,
      CustomerReceiptSourceType.Other,
    ]),
    loanBank: z.string().optional().nullable(),
    scheduleAllocation: z
      .array(
        z.object({
          demandId: z.string().min(1),
          amount: z.coerce.number().min(0),
        }),
      )
      .optional(),
    receiptDocument: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    postImmediately: z.boolean().optional(),
  })
  .superRefine((values, ctx) => {
    if (paymentModeRequiresBankFields(values.paymentMode)) {
      if (!values.companyBankAccountId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Company bank account is required for this payment mode',
          path: ['companyBankAccountId'],
        });
      }
      const txn = values.transactionReference?.trim() ?? '';
      if (!txn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transaction reference is required for this payment mode',
          path: ['transactionReference'],
        });
      } else if (txn.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'transactionReference must be at least 3 characters',
          path: ['transactionReference'],
        });
      }
    }

    if (
      values.sourceType === CustomerReceiptSourceType.BankLoan &&
      !values.loanBank?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'loanBank is required when sourceType is bank_loan',
        path: ['loanBank'],
      });
    }

    const activeAllocations = (values.scheduleAllocation ?? []).filter(
      (line) => line.amount > 0,
    );
    const totals = computeAllocationTotals({
      amount: values.amount,
      allocations: activeAllocations,
    });
    if (!totals.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: totals.message,
        path: ['scheduleAllocation'],
      });
    }
  });

export type CustomerReceiptCreateFormValues = z.infer<
  typeof customerReceiptCreateSchema
>;
