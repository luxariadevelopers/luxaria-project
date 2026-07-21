import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type {
  InventoryCostingMethod,
  StockTransactionType,
} from '../material-master/schemas/material-stock-transaction.schema';

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
  transactionDate: Date;
  location: string | null;
  batch: string | null;
  serialNumbers: string[];
  beforeQty: number;
  afterQty: number;
  unitCost: number;
  totalValue: number;
  costingMethod: InventoryCostingMethod | null;
  warehouseId: string | null;
  siteId: string | null;
  createdBy: string;
  approvedBy: string | null;
  reversalOfId: string | null;
  reversedById: string | null;
  notes: string | null;
  createdAt?: Date;
};

export type PublicStockBalance = {
  id: string | null;
  materialId: string;
  projectId: string;
  location: string;
  quantityInBaseUnit: number;
  baseUnit: MaterialUnit;
  version: number;
  updatedAt?: Date;
};

type EntryLike = {
  _id: Types.ObjectId | string;
  transactionNumber: string;
  projectId: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  transactionType: StockTransactionType;
  quantityIn: number;
  quantityOut: number;
  unit: MaterialUnit;
  baseUnitQuantity: number;
  baseUnit: MaterialUnit;
  referenceType: string;
  referenceId?: string | null;
  transactionDate: Date;
  location?: string | null;
  batch?: string | null;
  serialNumbers?: string[];
  beforeQty?: number;
  afterQty?: number;
  unitCost?: number;
  totalValue?: number;
  costingMethod?: InventoryCostingMethod | null;
  warehouseId?: Types.ObjectId | string | null;
  siteId?: Types.ObjectId | string | null;
  createdBy: Types.ObjectId | string;
  approvedBy?: Types.ObjectId | string | null;
  reversalOfId?: Types.ObjectId | string | null;
  reversedById?: Types.ObjectId | string | null;
  notes?: string | null;
  createdAt?: Date;
};

type BalanceLike = {
  _id: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  location: string;
  quantityInBaseUnit: number;
  baseUnit: MaterialUnit;
  version: number;
  updatedAt?: Date;
};

export function toPublicStockLedgerEntry(
  row: EntryLike,
): PublicStockLedgerEntry {
  return {
    id: String(row._id),
    transactionNumber: row.transactionNumber,
    projectId: String(row.projectId),
    materialId: String(row.materialId),
    transactionType: row.transactionType,
    quantityIn: row.quantityIn,
    quantityOut: row.quantityOut,
    unit: row.unit,
    baseUnitQuantity: row.baseUnitQuantity,
    baseUnit: row.baseUnit,
    referenceType: row.referenceType,
    referenceId: row.referenceId ?? null,
    transactionDate: row.transactionDate,
    location: row.location ?? null,
    batch: row.batch ?? null,
    serialNumbers: row.serialNumbers ?? [],
    beforeQty: row.beforeQty ?? 0,
    afterQty: row.afterQty ?? row.baseUnitQuantity ?? 0,
    unitCost: row.unitCost ?? 0,
    totalValue: row.totalValue ?? 0,
    costingMethod: row.costingMethod ?? null,
    warehouseId: row.warehouseId ? String(row.warehouseId) : null,
    siteId: row.siteId ? String(row.siteId) : null,
    createdBy: String(row.createdBy),
    approvedBy: row.approvedBy ? String(row.approvedBy) : null,
    reversalOfId: row.reversalOfId ? String(row.reversalOfId) : null,
    reversedById: row.reversedById ? String(row.reversedById) : null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
  };
}

export function toPublicStockBalance(row: BalanceLike): PublicStockBalance {
  return {
    id: String(row._id),
    materialId: String(row.materialId),
    projectId: String(row.projectId),
    location: row.location,
    quantityInBaseUnit: row.quantityInBaseUnit,
    baseUnit: row.baseUnit,
    version: row.version,
    updatedAt: row.updatedAt,
  };
}
