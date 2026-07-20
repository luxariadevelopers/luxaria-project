import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type { StockTransactionType } from '../material-master/schemas/material-stock-transaction.schema';

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
  createdBy: string;
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
  createdBy: Types.ObjectId | string;
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
    createdBy: String(row.createdBy),
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
