/**
 * Mirrors `apps/backend/src/modules/warehouse-locations` public shapes
 * (`warehouse-locations.mapper.ts`).
 *
 * Nest permissions:
 * - `site.view` — list / get
 * - `site.manage` — create / update
 */

/** Nest `WarehouseLocationLevel` */
export const WarehouseLocationLevel = {
  Zone: 'zone',
  Rack: 'rack',
  Bin: 'bin',
} as const;

export type WarehouseLocationLevel =
  (typeof WarehouseLocationLevel)[keyof typeof WarehouseLocationLevel];

/** Nest `WarehouseLocationStatus` */
export const WarehouseLocationStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type WarehouseLocationStatus =
  (typeof WarehouseLocationStatus)[keyof typeof WarehouseLocationStatus];

export type PublicWarehouseLocation = {
  id: string;
  companyId: string;
  projectId: string;
  warehouseId: string;
  parentId: string | null;
  level: WarehouseLocationLevel;
  code: string;
  name: string;
  capacity: number | null;
  status: WarehouseLocationStatus;
  locationPath: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateWarehouseLocationInput = {
  projectId: string;
  warehouseId: string;
  parentId?: string | null;
  level: WarehouseLocationLevel;
  code: string;
  name: string;
  capacity?: number | null;
  status?: WarehouseLocationStatus;
};

export type UpdateWarehouseLocationInput = {
  name?: string;
  capacity?: number | null;
  status?: WarehouseLocationStatus;
};

export type ListWarehouseLocationsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  warehouseId?: string;
  parentId?: string;
  level?: WarehouseLocationLevel;
  status?: WarehouseLocationStatus;
};

export type PaginatedWarehouseLocations = {
  items: PublicWarehouseLocation[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type WarehouseLocationFilterState = {
  warehouseId: string;
  level: '' | WarehouseLocationLevel;
  status: '' | WarehouseLocationStatus;
};
