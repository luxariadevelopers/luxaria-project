import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type { StockCountStatus } from './schemas/stock-count.schema';

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
  countDate: Date;
  countedBy: string;
  location: string;
  items: PublicStockCountItem[];
  status: StockCountStatus;
  requiresDirectorApproval: boolean;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  journalEntryId: string | null;
  journalSkippedReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type ItemLike = {
  _id?: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  materialCode?: string | null;
  materialName?: string | null;
  baseUnit: MaterialUnit;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  reason?: string | null;
  photo?: string | null;
  isLargeVariance?: boolean;
  stockLedgerEntryId?: Types.ObjectId | string | null;
};

type CountLike = {
  _id: Types.ObjectId | string;
  countNumber: string;
  projectId: Types.ObjectId | string;
  countDate: Date;
  countedBy: Types.ObjectId | string;
  location?: string;
  items: ItemLike[];
  status: StockCountStatus;
  requiresDirectorApproval?: boolean;
  notes?: string | null;
  reviewedBy?: Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  journalEntryId?: Types.ObjectId | string | null;
  journalSkippedReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicStockCount(row: CountLike): PublicStockCount {
  return {
    id: String(row._id),
    countNumber: row.countNumber,
    projectId: String(row.projectId),
    countDate: row.countDate,
    countedBy: String(row.countedBy),
    location: row.location ?? '',
    items: (row.items ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      materialId: String(item.materialId),
      materialCode: item.materialCode ?? null,
      materialName: item.materialName ?? null,
      baseUnit: item.baseUnit,
      systemQuantity: item.systemQuantity,
      physicalQuantity: item.physicalQuantity,
      difference: item.difference,
      reason: item.reason ?? null,
      photo: item.photo ?? null,
      isLargeVariance: item.isLargeVariance ?? false,
      stockLedgerEntryId: item.stockLedgerEntryId
        ? String(item.stockLedgerEntryId)
        : null,
    })),
    status: row.status,
    requiresDirectorApproval: row.requiresDirectorApproval ?? false,
    notes: row.notes ?? null,
    reviewedBy: row.reviewedBy ? String(row.reviewedBy) : null,
    reviewedAt: row.reviewedAt ?? null,
    approvedBy: row.approvedBy ? String(row.approvedBy) : null,
    approvedAt: row.approvedAt ?? null,
    postedBy: row.postedBy ? String(row.postedBy) : null,
    postedAt: row.postedAt ?? null,
    journalEntryId: row.journalEntryId ? String(row.journalEntryId) : null,
    journalSkippedReason: row.journalSkippedReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
