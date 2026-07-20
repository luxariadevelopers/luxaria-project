/**
 * Mirrors `apps/backend/src/modules/stock-counts` public shapes
 * (`stock-counts.mapper.ts` / Swagger tag Stock Counts).
 *
 * Nest permissions:
 * - `stock.view` — list/get; approve endpoint gate
 * - `stock.adjust` — create/update/submit/review/post/cancel; approve when not large
 * - `stock.count.director_approve` — approve when `requiresDirectorApproval`
 *
 * Prompt aliases `stock_count.view|create|approve|post` are not catalogued.
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

/** Nest `StockCountStatus` */
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

/** Nest default `STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT` */
export const DEFAULT_STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT = 10;

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

export type UpdateStockCountInput = {
  countDate?: string;
  location?: string | null;
  notes?: string | null;
  items?: StockCountItemInput[];
};

export type ApproveStockCountInput = {
  comment?: string | null;
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

export type StockCountFilterState = {
  status: '' | StockCountStatus;
  location: string;
  search: string;
};

/** Editable count line before submit (client preview of Nest difference rules). */
export type CountGridRow = {
  key: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  baseUnit: MaterialUnit;
  systemQuantity: number;
  physicalQuantity: number;
  reason: string;
  photo: string;
};
