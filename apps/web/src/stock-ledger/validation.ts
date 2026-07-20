import { z } from 'zod';
import { StockTransactionType, type StockLedgerFilterState } from './types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONGO_OBJECT_ID = /^[a-fA-F0-9]{24}$/;

const transactionTypeSchema = z.enum([
  StockTransactionType.OpeningStock,
  StockTransactionType.PurchaseReceipt,
  StockTransactionType.TransferIn,
  StockTransactionType.TransferOut,
  StockTransactionType.MaterialIssue,
  StockTransactionType.ReturnFromWork,
  StockTransactionType.ReturnToVendor,
  StockTransactionType.Wastage,
  StockTransactionType.Damage,
  StockTransactionType.TheftOrShortage,
  StockTransactionType.Adjustment,
  StockTransactionType.Reversal,
]);

/** Nest location max 120; date range is client-only (list DTO has no dates). */
export const stockLedgerFiltersSchema = z
  .object({
    materialId: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || MONGO_OBJECT_ID.test(v),
        'Material id must be a valid ObjectId',
      ),
    transactionType: z.union([z.literal(''), transactionTypeSchema]),
    location: z
      .string()
      .trim()
      .max(120, 'Location must be at most 120 characters'),
    batch: z.string().trim().max(120, 'Batch must be at most 120 characters'),
    dateFrom: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || DATE_ONLY.test(v),
        'From date must be YYYY-MM-DD',
      ),
    dateTo: z
      .string()
      .trim()
      .refine((v) => v === '' || DATE_ONLY.test(v), 'To date must be YYYY-MM-DD'),
    search: z.string().trim().max(200, 'Search must be at most 200 characters'),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateTo'],
        message: 'To date must be on or after from date',
      });
    }
  });

export type StockLedgerFiltersParsed = z.infer<typeof stockLedgerFiltersSchema>;

export function parseStockLedgerFilters(
  value: StockLedgerFilterState,
):
  | { ok: true; value: StockLedgerFiltersParsed }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof StockLedgerFilterState, string>>;
    } {
  const parsed = stockLedgerFiltersSchema.safeParse(value);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  const fieldErrors: Partial<Record<keyof StockLedgerFilterState, string>> =
    {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (
      key === 'materialId' ||
      key === 'transactionType' ||
      key === 'location' ||
      key === 'batch' ||
      key === 'dateFrom' ||
      key === 'dateTo' ||
      key === 'search'
    ) {
      fieldErrors[key] = issue.message;
    }
  }
  return { ok: false, fieldErrors };
}

export function emptyStockLedgerFilters(): StockLedgerFilterState {
  return {
    materialId: '',
    transactionType: '',
    location: '',
    batch: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  };
}
