import { z } from 'zod';
import { isoDateOnlySchema } from '@/validation';
import { isInvoicePayableForPayment } from '@/vendor-invoices/workflowActions';
import type {
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '@/vendor-invoices/types';
import { roundMoney } from '@/vendor-invoices/totals';
import {
  VendorPaymentMode,
  type PayableInvoiceOption,
  type PublicVendorPayment,
} from './types';

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
    return { ok: false, message: 'At least one invoice allocation is required.' };
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
 * Partial payments allowed; amount cannot exceed remaining payable.
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

/** Nest `computeBankAmount`. */
export function computeBankAmount(input: {
  amount: number;
  tds: number;
  retention: number;
  deductions: number;
}): { ok: true; bankAmount: number } | { ok: false; message: string } {
  const bank = roundMoney(
    input.amount - input.tds - input.retention - input.deductions,
  );
  if (bank < -1e-9) {
    return {
      ok: false,
      message: 'TDS + retention + deductions cannot exceed payment amount.',
    };
  }
  return { ok: true, bankAmount: Math.max(0, bank) };
}

export function filterPayableInvoices(
  invoices: readonly PayableInvoiceOption[],
): PayableInvoiceOption[] {
  return invoices.filter((inv) => {
    if (inv.remainingPayable <= 0.005) return false;
    const gate = isInvoicePayableForPayment({
      status: inv.status as VendorInvoiceStatus,
      matchingStatus: inv.matchingStatus as VendorInvoiceMatchingStatus,
      exceptionApproved: inv.exceptionApproved,
    });
    return gate.ok;
  });
}

export const paymentFormSchema = z
  .object({
    vendorId: z.string().min(1, 'Vendor is required'),
    paymentDate: isoDateOnlySchema,
    amount: z.coerce.number().min(0.01, 'Amount must be at least 0.01'),
    paymentMode: z.enum([
      VendorPaymentMode.BankTransfer,
      VendorPaymentMode.Neft,
      VendorPaymentMode.Rtgs,
      VendorPaymentMode.Imps,
      VendorPaymentMode.Upi,
      VendorPaymentMode.Cheque,
      VendorPaymentMode.Other,
    ]),
    bankAccountId: z.string().min(1, 'Bank account is required'),
    transactionReference: z
      .string()
      .trim()
      .min(3, 'Transaction reference must be at least 3 characters')
      .max(120),
    tds: nonNegativeMoney,
    retention: nonNegativeMoney,
    deductions: nonNegativeMoney,
    paymentProof: z.string().max(200),
    notes: z.string().max(2000),
    allocations: z
      .array(
        z.object({
          invoiceId: z.string().min(1),
          invoiceLabel: z.string(),
          remainingPayable: z.coerce.number().min(0),
          selected: z.boolean(),
          amount: z.coerce.number().min(0),
        }),
      )
      .min(1, 'Load payable invoices for this vendor'),
  })
  .superRefine((values, ctx) => {
    const selected = values.allocations.filter(
      (a) => a.selected && a.amount > 0,
    );
    if (selected.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one invoice allocation.',
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
      deductions: values.deductions,
    });
    if (!bank.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: bank.message,
        path: ['deductions'],
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
      invoiceId: a.invoiceId,
      amount: roundMoney(a.amount),
    }));
  return {
    vendorId: values.vendorId,
    projectId,
    allocations,
    paymentDate: values.paymentDate,
    amount: roundMoney(values.amount),
    paymentMode: values.paymentMode,
    bankAccountId: values.bankAccountId,
    transactionReference: values.transactionReference.trim(),
    tds: roundMoney(values.tds),
    retention: roundMoney(values.retention),
    deductions: roundMoney(values.deductions),
    paymentProof: values.paymentProof?.trim() || null,
    notes: values.notes?.trim() || null,
  };
}

/** Soft client check for duplicate txn ref on same bank (list preview). */
export function findDuplicateTransactionReference(
  payments: readonly PublicVendorPayment[],
  bankAccountId: string,
  transactionReference: string,
  excludePaymentId?: string,
): PublicVendorPayment | null {
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
