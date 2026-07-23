/**
 * Mirrors Nest `stock-transfers` public shape /
 * `apps/backend/src/modules/stock-transfers`.
 */

export const StockTransferStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Posted: 'posted',
  Cancelled: 'cancelled',
} as const;

export type StockTransferStatus =
  (typeof StockTransferStatus)[keyof typeof StockTransferStatus];

export const StockTransferScope = {
  WarehouseToWarehouse: 'warehouse_to_warehouse',
  SiteToSite: 'site_to_site',
  ProjectToProject: 'project_to_project',
  WarehouseToSite: 'warehouse_to_site',
} as const;

export type StockTransferScope =
  (typeof StockTransferScope)[keyof typeof StockTransferScope];

/** Nest `MaterialUnit`. */
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

export type StockTransferItem = {
  id: string;
  materialId: string;
  unit: MaterialUnit;
  quantity: number;
  baseUnitQuantity: number;
  batch: string | null;
  serialNumbers: string[];
  sourceLedgerId: string | null;
  destLedgerId: string | null;
};

export type StockTransfer = {
  id: string;
  transferNumber: string;
  scope: StockTransferScope | string;
  sourceProjectId: string;
  destProjectId: string;
  sourceWarehouseId: string | null;
  destWarehouseId: string | null;
  sourceSiteId: string | null;
  destSiteId: string | null;
  sourceLocation: string;
  destLocation: string;
  transferDate: string;
  items: StockTransferItem[];
  status: StockTransferStatus | string;
  notes: string | null;
  createdBy: string;
  postedBy: string | null;
  postedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateStockTransferItemInput = {
  materialId: string;
  unit: MaterialUnit;
  quantity: number;
  batch?: string | null;
  serialNumbers?: string[];
};

export type CreateStockTransferInput = {
  scope: StockTransferScope;
  sourceProjectId: string;
  destProjectId: string;
  sourceWarehouseId?: string | null;
  destWarehouseId?: string | null;
  sourceSiteId?: string | null;
  destSiteId?: string | null;
  sourceLocation?: string;
  destLocation?: string;
  transferDate: string;
  items: CreateStockTransferItemInput[];
  notes?: string | null;
};
