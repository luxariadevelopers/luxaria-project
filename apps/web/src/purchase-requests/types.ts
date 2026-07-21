/**
 * Mirrors Nest `PublicPurchaseRequest` /
 * `apps/backend/src/modules/purchase-requests`.
 */

export const PurchaseRequestStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Reviewed: 'reviewed',
  Approved: 'approved',
  Sourcing: 'sourcing',
  Closed: 'closed',
  Rejected: 'rejected',
  Returned: 'returned',
  Cancelled: 'cancelled',
} as const;

export type PurchaseRequestStatus =
  (typeof PurchaseRequestStatus)[keyof typeof PurchaseRequestStatus];

export const PurchaseRequestPriority = {
  Low: 'low',
  Normal: 'normal',
  High: 'high',
  Urgent: 'urgent',
} as const;

export type PurchaseRequestPriority =
  (typeof PurchaseRequestPriority)[keyof typeof PurchaseRequestPriority];

export const PurchaseRequestLineStatus = {
  Pending: 'pending',
  Approved: 'approved',
  PartiallyApproved: 'partially_approved',
  Rejected: 'rejected',
} as const;

export type PurchaseRequestLineStatus =
  (typeof PurchaseRequestLineStatus)[keyof typeof PurchaseRequestLineStatus];

/** Nest `MaterialUnit` — material-master schema. */
export const MaterialUnit = {
  Number: 'number',
  Bag: 'bag',
  Kilogram: 'kilogram',
  Ton: 'ton',
  Litre: 'litre',
  Metre: 'metre',
  SquareFoot: 'square_foot',
  CubicFoot: 'cubic_foot',
  Load: 'load',
  Box: 'box',
} as const;

export type MaterialUnit =
  (typeof MaterialUnit)[keyof typeof MaterialUnit];

export const MaterialStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type MaterialStatus =
  (typeof MaterialStatus)[keyof typeof MaterialStatus];

export type UnitConversionFactor = {
  unit: MaterialUnit;
  factorToBase: number;
};

export type PublicPurchaseRequestItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  requestedQuantity: number;
  unit: MaterialUnit;
  currentStock: number;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  estimatedRate: number | null;
  boqItemId: string | null;
  remarks: string | null;
  approvedQuantity: number | null;
  lineStatus: PurchaseRequestLineStatus;
  warnings: string[];
  estimatedAmount: number | null;
};

export type PublicPurchaseRequest = {
  id: string;
  requestNumber: string;
  projectId: string;
  siteId: string | null;
  warehouseSiteId: string | null;
  sourceReorderAlertId: string | null;
  requestedBy: string;
  requiredByDate: string;
  priority: PurchaseRequestPriority;
  items: PublicPurchaseRequestItem[];
  justification: string;
  status: PurchaseRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  reviewNotes: string | null;
  approvalNotes: string | null;
  rejectionReason: string | null;
  isPartiallyApproved: boolean;
  warnings: string[];
  estimatedTotal: number;
  approvedTotal: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PurchaseRequestItemInput = {
  materialId: string;
  requestedQuantity: number;
  unit: MaterialUnit;
  estimatedRate?: number | null;
  boqItemId?: string | null;
  remarks?: string | null;
};

export type CreatePurchaseRequestInput = {
  projectId: string;
  siteId?: string | null;
  warehouseSiteId?: string | null;
  sourceReorderAlertId?: string | null;
  requiredByDate: string;
  priority?: PurchaseRequestPriority;
  items: PurchaseRequestItemInput[];
  justification: string;
};

export type UpdatePurchaseRequestInput = Partial<CreatePurchaseRequestInput>;

/** Nest `ReviewPurchaseRequestDto` — Phase 062 */
export type ReviewPurchaseRequestInput = {
  notes?: string | null;
};

/** Nest `ApprovePurchaseRequestItemDto` — Phase 062 */
export type ApprovePurchaseRequestItemInput = {
  lineId: string;
  approvedQuantity: number;
};

/** Nest `ApprovePurchaseRequestDto` — Phase 062 (partial line approval) */
export type ApprovePurchaseRequestInput = {
  items: ApprovePurchaseRequestItemInput[];
  notes?: string | null;
};

/** Nest `RejectPurchaseRequestDto` — Phase 062 */
export type RejectPurchaseRequestInput = {
  reason: string;
};

/** Nest `ReturnPurchaseRequestDto` — Phase 062 */
export type ReturnPurchaseRequestInput = {
  notes?: string | null;
};

export type ListPurchaseRequestsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  status?: PurchaseRequestStatus;
  priority?: PurchaseRequestPriority;
  requestedBy?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedPurchaseRequests = {
  items: PublicPurchaseRequest[];
  meta: PaginationMeta | null;
};

/** Nest `PublicMaterial` — material-master mapper. */
export type PublicMaterial = {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  specification: string | null;
  brand: string | null;
  baseUnit: MaterialUnit;
  alternateUnits: MaterialUnit[];
  conversionFactors: UnitConversionFactor[];
  standardRate: number;
  minimumStock: number;
  reorderLevel: number;
  maximumStock: number;
  standardWastagePercentage: number;
  ledgerAccountId: string;
  status: MaterialStatus;
  baseUnitLocked: boolean;
};

/** Nest stock-ledger `GET /stock-ledger/balance` payload. */
export type PublicStockBalance = {
  id: string | null;
  materialId: string;
  projectId: string;
  location: string;
  quantityInBaseUnit: number;
  baseUnit: MaterialUnit;
  version: number;
  updatedAt?: string;
};

/** Nest `PublicBoqItem` — subset used by the BOQ line selector. */
export type PublicBoqItemOption = {
  id: string;
  boqCode: string;
  description: string;
  status: string;
};
