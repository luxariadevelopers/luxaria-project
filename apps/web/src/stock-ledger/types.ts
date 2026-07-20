/**
 * Mirrors `apps/backend/src/modules/stock-ledger` public shapes
 * (`stock-ledger.mapper.ts` / Swagger tag Stock Ledger).
 *
 * Nest permissions: `stock.view` (list/get/balance), `stock.adjust` (post/reverse).
 * Prompt alias `stock_ledger.view` is not in the catalog — use `stock.view`.
 */

/** Nest `MaterialUnit` */
export type MaterialUnit =
  | 'number'
  | 'bag'
  | 'kilogram'
  | 'ton'
  | 'litre'
  | 'metre'
  | 'square_foot'
  | 'cubic_foot'
  | 'load'
  | 'box';

/** Nest `StockTransactionType` */
export const StockTransactionType = {
  OpeningStock: 'opening_stock',
  PurchaseReceipt: 'purchase_receipt',
  TransferIn: 'transfer_in',
  TransferOut: 'transfer_out',
  MaterialIssue: 'material_issue',
  ReturnFromWork: 'return_from_work',
  ReturnToVendor: 'return_to_vendor',
  Wastage: 'wastage',
  Damage: 'damage',
  TheftOrShortage: 'theft_or_shortage',
  Adjustment: 'adjustment',
  Reversal: 'reversal',
} as const;

export type StockTransactionType =
  (typeof StockTransactionType)[keyof typeof StockTransactionType];

/** `GET /stock-ledger` / `GET /stock-ledger/:id` — PublicStockLedgerEntry */
export type PublicStockLedgerEntry = {
  id: string;
  transactionNumber: string;
  projectId: string;
  materialId: string;
  transactionType: StockTransactionType;
  quantityIn: number;
  quantityOut: number;
  unit: MaterialUnit;
  baseUnitQuantity: number;
  baseUnit: MaterialUnit;
  referenceType: string;
  referenceId: string | null;
  transactionDate: string;
  location: string | null;
  batch: string | null;
  createdBy: string;
  reversalOfId: string | null;
  reversedById: string | null;
  notes: string | null;
  createdAt?: string;
};

export type ListStockLedgerQuery = {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  projectId?: string;
  materialId?: string;
  transactionType?: StockTransactionType;
  location?: string;
  batch?: string;
};

export type PaginatedStockLedger = {
  items: PublicStockLedgerEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/**
 * Client filters — Nest list has no dateFrom/dateTo; range is validated and
 * applied client-side on the fetched page.
 */
export type StockLedgerFilterState = {
  materialId: string;
  transactionType: '' | StockTransactionType;
  location: string;
  batch: string;
  /** YYYY-MM-DD inclusive; empty = unbounded */
  dateFrom: string;
  /** YYYY-MM-DD inclusive; empty = unbounded */
  dateTo: string;
  search: string;
};

/** Row with client-computed running balance (base unit, filtered set). */
export type StockLedgerRow = PublicStockLedgerEntry & {
  runningBalance: number | null;
};
