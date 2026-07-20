import { z } from 'zod';
import { isoDateOnlySchema } from '@/validation';
import { ContractorBillStatus } from '@luxaria/shared-types';
import {
  ContractorPaymentMode,
  type PayableBillOption,
  type PublicContractorPayment,
} from './types';

/** Money rounding aligned with Nest `roundMoney`. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const nonNegativeMoney = z.coerce
  .number({ invalid_type_error: 'Amount must be a number' })
  .finite()
  .min(0);

/**
 * Nest `assertAllocationsBalance` — sum(allocations) === amount.
 */
export function assertAllocationsBalance(input: {
  amount: number;
  allocations: ReadonlyArray<{ amount: number }>;
}): { ok: true } | { ok: false; message: string } {
  if (!input.allocations.length) {
    return { ok: false, message: 'At least one bill allocation is required.' };
  }
  const sum = roundMoney(
    input.allocations.reduce((s, a) => s + (a.amount ?? 0), 0),
  );
  if (Math.abs(sum - roundMoney(input.amount)) > 0.005) {
    return {
      ok: false,
      message: `Allocation total (${sum}) must equal payment amount (${input.amount}).`,
    };
  }
  for (const a of input.allocations) {
    if (!Number.isFinite(a.amount) || a.amount <= 0) {
      return { ok: false, message: 'Each allocation amount must be > 0.' };
    }
  }
  return { ok: true };
}

/**
 * Partial payments allowed; amount cannot exceed remaining / approved net payable.
 */
export function assertAllocationWithinPayable(
  amount: number,
  remainingPayable: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(amount) || amount < 0.01) {
    return { ok: false, message: 'Allocation amount must be at least 0.01.' };
  }
  if (amount - remainingPayable > 0.005) {
    return {
      ok: false,
      message: `Allocation (${amount}) exceeds remaining payable (${remainingPayable}).`,
    };
  }
  return { ok: true };
}

/** Nest `computeBankAmount` (tds + retention + advanceRecovery + penalty). */
export function computeBankAmount(input: {
  amount: number;
  tds: number;
  retention: number;
  advanceRecovery: number;
  penalty: number;
}): { ok: true; bankAmount: number } | { ok: false; message: string } {
  const bank = roundMoney(
    input.amount -
      input.tds -
      input.retention -
      input.advanceRecovery -
      input.penalty,
  );
  if (bank < -1e-9) {
    return {
      ok: false,
      message:
        'TDS + retention + advance recovery + penalty cannot exceed payment amount.',
    };
  }
  return { ok: true, bankAmount: Math.max(0, bank) };
}

/** Nest: only posted (or paid with remaining) running bills are payable. */
export function filterPayableBills(
  bills: readonly PayableBillOption[],
): PayableBillOption[] {
  return bills.filter((bill) => {
    if (bill.remainingPayable <= 0.005) return false;
    return (
      bill.status === ContractorBillStatus.Posted ||
      bill.status === ContractorBillStatus.Paid
    );
  });
}

export const paymentFormSchema = z
  .object({
    contractorId: z.string().min(1, 'Contractor is required'),
    paymentDate: isoDateOnlySchema,
    amount: z.coerce.number().min(0.01, 'Amount must be at least 0.01'),
    paymentMode: z.enum([
      ContractorPaymentMode.BankTransfer,
      ContractorPaymentMode.Neft,
      ContractorPaymentMode.Rtgs,
      ContractorPaymentMode.Imps,
      ContractorPaymentMode.Upi,
      ContractorPaymentMode.Cheque,
      ContractorPaymentMode.Other,
    ]),
    bankAccountId: z.string().min(1, 'Bank account is required'),
    transactionReference: z
      .string()
      .trim()
      .min(3, 'Transaction reference must be at least 3 characters')
      .max(120),
    tds: nonNegativeMoney,
    retention: nonNegativeMoney,
    advanceRecovery: nonNegativeMoney,
    penalty: nonNegativeMoney,
    paymentProof: z.string().max(200),
    notes: z.string().max(2000),
    allocations: z
      .array(
        z.object({
          billId: z.string().min(1),
          billLabel: z.string(),
          remainingPayable: z.coerce.number().min(0),
          billRetention: z.coerce.number().min(0),
          billAdvanceRecovery: z.coerce.number().min(0),
          billTds: z.coerce.number().min(0),
          selected: z.boolean(),
          amount: z.coerce.number().min(0),
        }),
      )
      .min(1, 'Load payable running bills for this contractor'),
  })
  .superRefine((values, ctx) => {
    const selected = values.allocations.filter(
      (a) => a.selected && a.amount > 0,
    );
    if (selected.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one bill allocation.',
        path: ['allocations'],
      });
      return;
    }
    const balance = assertAllocationsBalance({
      amount: values.amount,
      allocations: selected,
    });
    if (!balance.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: balance.message,
        path: ['amount'],
      });
    }
    for (let i = 0; i < values.allocations.length; i += 1) {
      const row = values.allocations[i];
      if (!row.selected || row.amount <= 0) continue;
      const within = assertAllocationWithinPayable(
        row.amount,
        row.remainingPayable,
      );
      if (!within.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: within.message,
          path: ['allocations', i, 'amount'],
        });
      }
    }
    const bank = computeBankAmount({
      amount: values.amount,
      tds: values.tds,
      retention: values.retention,
      advanceRecovery: values.advanceRecovery,
      penalty: values.penalty,
    });
    if (!bank.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: bank.message,
        path: ['penalty'],
      });
    }
  });

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export function toCreatePaymentInput(
  values: PaymentFormValues,
  projectId: string,
) {
  const allocations = values.allocations
    .filter((a) => a.selected && a.amount > 0)
    .map((a) => ({
      billId: a.billId,
      amount: roundMoney(a.amount),
    }));
  return {
    contractorId: values.contractorId,
    projectId,
    allocations,
    paymentDate: values.paymentDate,
    amount: roundMoney(values.amount),
    paymentMode: values.paymentMode,
    bankAccountId: values.bankAccountId,
    transactionReference: values.transactionReference.trim(),
    tds: roundMoney(values.tds),
    retention: roundMoney(values.retention),
    advanceRecovery: roundMoney(values.advanceRecovery),
    penalty: roundMoney(values.penalty),
    paymentProof: values.paymentProof?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

/** Soft client check for duplicate txn ref on same bank (list preview). */
export function findDuplicateTransactionReference(
  payments: readonly PublicContractorPayment[],
  bankAccountId: string,
  transactionReference: string,
  excludePaymentId?: string,
): PublicContractorPayment | null {
  const ref = transactionReference.trim().toLowerCase();
  if (!ref || !bankAccountId) return null;
  for (const row of payments) {
    if (excludePaymentId && row.id === excludePaymentId) continue;
    if (row.status === 'cancelled') continue;
    if (row.bankAccountId !== bankAccountId) continue;
    if (row.transactionReference.trim().toLowerCase() === ref) {
      return row;
    }
  }
  return null;
}
