import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type {
  PurchaseRequestLineStatus,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from './schemas/purchase-request.schema';

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
  requiredByDate: Date;
  priority: PurchaseRequestPriority;
  items: PublicPurchaseRequestItem[];
  justification: string;
  status: PurchaseRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  reviewNotes: string | null;
  approvalNotes: string | null;
  rejectionReason: string | null;
  isPartiallyApproved: boolean;
  warnings: string[];
  estimatedTotal: number;
  approvedTotal: number | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type ItemLike = {
  _id?: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  materialCode?: string | null;
  materialName?: string | null;
  requestedQuantity: number;
  unit: MaterialUnit;
  currentStock: number;
  reorderLevel: number;
  minimumStock: number;
  maximumStock: number;
  estimatedRate?: number | null;
  boqItemId?: Types.ObjectId | string | null;
  remarks?: string | null;
  approvedQuantity?: number | null;
  lineStatus: PurchaseRequestLineStatus;
  warnings?: string[];
};

type RequestLike = {
  _id: Types.ObjectId | string;
  requestNumber: string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  warehouseSiteId?: Types.ObjectId | string | null;
  sourceReorderAlertId?: Types.ObjectId | string | null;
  requestedBy: Types.ObjectId | string;
  requiredByDate: Date;
  priority: PurchaseRequestPriority;
  items?: ItemLike[];
  justification: string;
  status: PurchaseRequestStatus;
  reviewedBy?: Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  reviewNotes?: string | null;
  approvalNotes?: string | null;
  rejectionReason?: string | null;
  isPartiallyApproved?: boolean;
  warnings?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicPurchaseRequestItem(
  item: ItemLike,
): PublicPurchaseRequestItem {
  const estimatedRate = item.estimatedRate ?? null;
  return {
    id: String(item._id ?? ''),
    materialId: String(item.materialId),
    materialCode: item.materialCode ?? null,
    materialName: item.materialName ?? null,
    requestedQuantity: item.requestedQuantity,
    unit: item.unit,
    currentStock: item.currentStock,
    reorderLevel: item.reorderLevel,
    minimumStock: item.minimumStock,
    maximumStock: item.maximumStock,
    estimatedRate,
    boqItemId: item.boqItemId ? String(item.boqItemId) : null,
    remarks: item.remarks ?? null,
    approvedQuantity: item.approvedQuantity ?? null,
    lineStatus: item.lineStatus,
    warnings: item.warnings ?? [],
    estimatedAmount:
      estimatedRate == null
        ? null
        : Math.round(estimatedRate * item.requestedQuantity * 100) / 100,
  };
}

export function toPublicPurchaseRequest(
  row: RequestLike,
): PublicPurchaseRequest {
  const items = (row.items ?? []).map(toPublicPurchaseRequestItem);
  const estimatedTotal = items.reduce(
    (sum, item) => sum + (item.estimatedAmount ?? 0),
    0,
  );
  const approvedTotal = items.every((i) => i.approvedQuantity == null)
    ? null
    : items.reduce((sum, item) => {
        if (item.approvedQuantity == null || item.estimatedRate == null) {
          return sum;
        }
        return sum + item.approvedQuantity * item.estimatedRate;
      }, 0);

  return {
    id: String(row._id),
    requestNumber: row.requestNumber,
    projectId: String(row.projectId),
    siteId: row.siteId ? String(row.siteId) : null,
    warehouseSiteId: row.warehouseSiteId
      ? String(row.warehouseSiteId)
      : null,
    sourceReorderAlertId: row.sourceReorderAlertId
      ? String(row.sourceReorderAlertId)
      : null,
    requestedBy: String(row.requestedBy),
    requiredByDate: row.requiredByDate,
    priority: row.priority,
    items,
    justification: row.justification,
    status: row.status,
    reviewedBy: row.reviewedBy ? String(row.reviewedBy) : null,
    reviewedAt: row.reviewedAt ?? null,
    approvedBy: row.approvedBy ? String(row.approvedBy) : null,
    approvedAt: row.approvedAt ?? null,
    reviewNotes: row.reviewNotes ?? null,
    approvalNotes: row.approvalNotes ?? null,
    rejectionReason: row.rejectionReason ?? null,
    isPartiallyApproved: Boolean(row.isPartiallyApproved),
    warnings: row.warnings ?? [],
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    approvedTotal:
      approvedTotal == null ? null : Math.round(approvedTotal * 100) / 100,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
