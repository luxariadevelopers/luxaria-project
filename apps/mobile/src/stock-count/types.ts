/**
 * Mirrors Nest `stock-counts` public shapes (`stock-counts.mapper.ts`).
 *
 * Nest permissions (catalog — not prompt aliases):
 * - `stock.view` — list / get
 * - `stock.adjust` — create / update / submit
 * - `stock.count.director_approve` — large-variance approve (web/backend; not this phase)
 */

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

export const StockCountStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Reviewed: 'reviewed',
  Approved: 'approved',
  AdjustmentPosted: 'adjustment_posted',
  Cancelled: 'cancelled',
} as const;

export type StockCountStatus =
  (typeof StockCountStatus)[keyof typeof StockCountStatus];

export const DEFAULT_STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT = 10;

export const STOCK_COUNT_OFFLINE_TYPE = 'stock_count.create_submit' as const;

export type PublicStockCountItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  baseUnit: MaterialUnit;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  reason: string | null;
  photo: string | null;
  isLargeVariance: boolean;
  stockLedgerEntryId: string | null;
};

export type PublicStockCount = {
  id: string;
  countNumber: string;
  projectId: string;
  countDate: string;
  countedBy: string;
  location: string;
  items: PublicStockCountItem[];
  status: StockCountStatus;
  requiresDirectorApproval: boolean;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  journalEntryId: string | null;
  journalSkippedReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type StockCountItemInput = {
  materialId: string;
  physicalQuantity: number;
  reason?: string | null;
  photo?: string | null;
};

export type CreateStockCountInput = {
  projectId: string;
  countDate: string;
  countedBy?: string;
  location?: string | null;
  notes?: string | null;
  items: StockCountItemInput[];
};

export type ListStockCountsQuery = {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  projectId?: string;
  status?: StockCountStatus;
  location?: string;
};

export type PaginatedStockCounts = {
  items: PublicStockCount[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** Editable count line (client preview; Nest refreshes system qty on submit). */
export type CountLine = {
  key: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  baseUnit: MaterialUnit;
  systemQuantity: number;
  physicalQuantity: number;
  reason: string;
  /** Local photo path while drafting; uploaded document id after sync merge. */
  photoUri: string | null;
  photoName: string | null;
  photoMimeType: string | null;
  photoSize: number | null;
};

export type StockForecastRow = {
  projectId: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  baseUnit: MaterialUnit;
  availableStock: number;
};

export type StockCountDraft = {
  projectId: string;
  countDate: string;
  location: string;
  notes: string;
  lines: CountLine[];
  updatedAt: string;
};
