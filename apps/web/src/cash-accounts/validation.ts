import { z } from 'zod';
import { CashAccountKind } from './types';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const objectId = z
  .string()
  .min(1, 'Required')
  .regex(OBJECT_ID_RE, 'Must be a valid ObjectId');

/**
 * Create form — mirrors Nest `CreateCashAccountDto` + service limit rules.
 */
export const cashAccountCreateSchema = z
  .object({
    accountName: z.string().trim().min(1, 'Account name is required').max(200),
    kind: z.enum([CashAccountKind.SiteCash, CashAccountKind.PettyCash]),
    projectId: objectId,
    custodianUserId: objectId,
    ledgerAccountId: objectId,
    maximumHoldingLimit: z.coerce.number().min(0, 'Limit must be ≥ 0'),
    replenishmentLevel: z.coerce.number().min(0, 'Level must be ≥ 0'),
    openingBalance: z.coerce.number().min(0, 'Opening balance must be ≥ 0'),
  })
  .superRefine((values, ctx) => {
    if (values.replenishmentLevel > values.maximumHoldingLimit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['replenishmentLevel'],
        message: 'Replenishment level cannot exceed maximum holding limit',
      });
    }
    if (values.openingBalance > values.maximumHoldingLimit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['openingBalance'],
        message: 'Opening balance cannot exceed maximum holding limit',
      });
    }
  });

export type CashAccountCreateFormValues = z.infer<
  typeof cashAccountCreateSchema
>;

export const custodianTransferSchema = z.object({
  toUserId: objectId,
  /** Form string; convert via `toDeclaredBalance` before API call. */
  declaredBalance: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type CustodianTransferFormValues = z.infer<
  typeof custodianTransferSchema
>;

export function toDeclaredBalance(
  value: string | undefined,
): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return n;
}

export const confirmHandoverSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type ConfirmHandoverFormValues = z.infer<typeof confirmHandoverSchema>;

export const closeCashAccountSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CloseCashAccountFormValues = z.infer<typeof closeCashAccountSchema>;

/**
 * Incoming custodian must differ from current (Nest BadRequest).
 */
export function assertDifferentCustodian(
  currentCustodianUserId: string,
  toUserId: string,
): { ok: true } | { ok: false; message: string } {
  if (!toUserId || !OBJECT_ID_RE.test(toUserId)) {
    return { ok: false, message: 'Incoming custodian is required' };
  }
  if (currentCustodianUserId === toUserId) {
    return {
      ok: false,
      message: 'Incoming custodian must be different from the current custodian',
    };
  }
  return { ok: true };
}

export function assertDeclaredBalanceInput(
  value: string | undefined,
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  if (value == null || value.trim() === '') {
    return { ok: true, value: undefined };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return {
      ok: false,
      message: 'Declared balance must be a non-negative number',
    };
  }
  return { ok: true, value: n };
}
