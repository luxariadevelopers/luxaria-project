import type { Types } from 'mongoose';
import type {
  WarehouseLocationLevel,
  WarehouseLocationStatus,
} from './schemas/warehouse-location.schema';

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
  createdAt?: Date;
  updatedAt?: Date;
};

type RowLike = {
  _id: Types.ObjectId | string;
  companyId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  warehouseId: Types.ObjectId | string;
  parentId?: Types.ObjectId | string | null;
  level: WarehouseLocationLevel;
  code: string;
  name: string;
  capacity?: number | null;
  status: WarehouseLocationStatus;
  locationPath: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicWarehouseLocation(
  row: RowLike,
): PublicWarehouseLocation {
  return {
    id: String(row._id),
    companyId: String(row.companyId),
    projectId: String(row.projectId),
    warehouseId: String(row.warehouseId),
    parentId: row.parentId ? String(row.parentId) : null,
    level: row.level,
    code: row.code,
    name: row.name,
    capacity: row.capacity ?? null,
    status: row.status,
    locationPath: row.locationPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
