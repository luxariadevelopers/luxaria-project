/**
 * Mirrors `apps/backend/src/modules/stock-reservations` public shapes.
 *
 * Nest permissions:
 * - `stock.view` — list / get / available
 * - `stock.reserve` — create / release / cancel
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

/** Nest `StockReservationStatus` */
export const StockReservationStatus = {
  Active: 'active',
  Released: 'released',
  Consumed: 'consumed',
  Cancelled: 'cancelled',
} as const;

export type StockReservationStatus =
  (typeof StockReservationStatus)[keyof typeof StockReservationStatus];

/** Nest `StockReservationSourceType` */
export const StockReservationSourceType = {
  Dpr: 'dpr',
  Contractor: 'contractor',
  Labour: 'labour',
  Equipment: 'equipment',
  PurchaseOrder: 'purchase_order',
  MaterialRequest: 'material_request',
  Manual: 'manual',
} as const;

export type StockReservationSourceType =
  (typeof StockReservationSourceType)[keyof typeof StockReservationSourceType];

export type PublicStockReservation = {
  id: string;
  reservationNumber: string;
  projectId: string;
  materialId: string;
  location: string;
  unit: MaterialUnit;
  quantity: number;
  baseUnitQuantity: number;
  releasedBaseQuantity: number;
  remainingBaseQuantity: number;
  sourceType: StockReservationSourceType;
  sourceId: string | null;
  status: StockReservationStatus;
  expiresAt: string | null;
  notes: string | null;
  createdBy: string;
  releasedBy: string | null;
  releasedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AvailableStock = {
  projectId: string;
  materialId: string;
  location: string;
  onHandBaseQty: number;
  reservedBaseQty: number;
  availableBaseQty: number;
};

export type CreateStockReservationInput = {
  projectId: string;
  materialId: string;
  location?: string;
  unit: MaterialUnit;
  quantity: number;
  sourceType: StockReservationSourceType;
  sourceId?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
};

export type ReleaseStockReservationInput = {
  quantity?: number;
};

export type ListStockReservationsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  materialId?: string;
  status?: StockReservationStatus;
  sourceType?: StockReservationSourceType;
};

export type PaginatedStockReservations = {
  items: PublicStockReservation[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type StockReservationFilterState = {
  status: '' | StockReservationStatus;
  sourceType: '' | StockReservationSourceType;
};
