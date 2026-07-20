import { z } from 'zod';
import type { StatementColumnMapping } from './types';

const mongoIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createSessionSchema = z
  .object({
    bankAccountId: mongoIdSchema,
    statementFrom: z.string().min(1, 'Statement from date is required'),
    statementTo: z.string().min(1, 'Statement to date is required'),
    statementOpeningBalance: z.coerce
      .number()
      .finite('Opening balance must be a number'),
    statementClosingBalance: z.coerce
      .number()
      .finite('Closing balance must be a number'),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    const from = Date.parse(value.statementFrom);
    const to = Date.parse(value.statementTo);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid statement date range',
        path: ['statementFrom'],
      });
      return;
    }
    if (from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'statementFrom must be on or before statementTo',
        path: ['statementTo'],
      });
    }
  });

export type CreateSessionFormValues = z.infer<typeof createSessionSchema>;

/**
 * Client-side column mapping rules aligned with Nest
 * `BankStatementImportService.parseBuffer`.
 */
export function validateColumnMapping(
  mapping: Partial<StatementColumnMapping>,
): { ok: true; mapping: StatementColumnMapping } | { ok: false; message: string } {
  const date = mapping.date?.trim() ?? '';
  if (!date) {
    return { ok: false, message: 'columnMapping.date is required' };
  }
  const debit = mapping.debit?.trim() || undefined;
  const credit = mapping.credit?.trim() || undefined;
  const amount = mapping.amount?.trim() || undefined;
  if (!debit && !credit && !amount) {
    return {
      ok: false,
      message: 'columnMapping must include debit/credit and/or amount',
    };
  }
  return {
    ok: true,
    mapping: {
      date,
      description: mapping.description?.trim() || undefined,
      debit,
      credit,
      amount,
      balance: mapping.balance?.trim() || undefined,
      transactionId: mapping.transactionId?.trim() || undefined,
      chequeNumber: mapping.chequeNumber?.trim() || undefined,
    },
  };
}

/** Nest rejects a second import unless `replaceExisting=true`. */
export function duplicateImportMessage(lineCount: number): string | null {
  if (lineCount <= 0) return null;
  return 'Session already has statement lines; pass replaceExisting=true to replace';
}

export const autoMatchSchema = z.object({
  dateToleranceDays: z.coerce.number().min(0).default(3),
});

export type AutoMatchFormValues = z.infer<typeof autoMatchSchema>;

export const manualMatchNotesSchema = z.object({
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

/**
 * Preview Nest amount reconciliation for manual match selection.
 * Bank debit (withdrawal) pairs with book credit; bank credit with book debit.
 */
export function validateManualMatchAmounts(
  statement: ReadonlyArray<{ debit: number; credit: number }>,
  book: ReadonlyArray<{ debit: number; credit: number }>,
): { ok: true } | { ok: false; message: string } {
  if (statement.length < 1) {
    return { ok: false, message: 'Select at least one statement line' };
  }
  if (book.length < 1) {
    return { ok: false, message: 'Select at least one book line' };
  }
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const stmtDebit = round2(statement.reduce((s, l) => s + l.debit, 0));
  const stmtCredit = round2(statement.reduce((s, l) => s + l.credit, 0));
  const bookDebit = round2(book.reduce((s, b) => s + b.debit, 0));
  const bookCredit = round2(book.reduce((s, b) => s + b.credit, 0));
  if (stmtDebit === bookCredit || stmtCredit === bookDebit) {
    return { ok: true };
  }
  const bankNet = round2(stmtCredit - stmtDebit);
  const bookNet = round2(bookDebit - bookCredit);
  if (bankNet !== bookNet) {
    return {
      ok: false,
      message: `Amounts do not reconcile (statement net ${bankNet} vs book net ${bookNet})`,
    };
  }
  return { ok: true };
}

const STATEMENT_EXTENSIONS = ['.csv', '.txt', '.xls', '.xlsx'] as const;

export function validateStatementFile(
  file: File | null | undefined,
  maxBytes = 10 * 1024 * 1024,
): { ok: true; file: File } | { ok: false; message: string } {
  if (!file) {
    return { ok: false, message: 'Statement file is required' };
  }
  if (file.size <= 0) {
    return { ok: false, message: 'Statement file is required' };
  }
  if (file.size > maxBytes) {
    return { ok: false, message: 'File exceeds 10 MB limit' };
  }
  const lower = file.name.toLowerCase();
  if (!STATEMENT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return {
      ok: false,
      message: 'Supported formats: CSV, TXT, XLS, XLSX',
    };
  }
  return { ok: true, file };
}
