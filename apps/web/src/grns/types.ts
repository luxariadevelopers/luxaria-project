/**
 * Mirrors `apps/backend/src/modules/goods-receipts` public shapes
 * (`goods-receipts.mapper.ts` / Swagger tag Goods Receipts).
 */

import { GoodsReceiptStatus } from '@/status';

export { GoodsReceiptStatus };

export type MaterialUnit = string;

export type PublicGoodsReceiptItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  purchaseOrderLineId: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number | null;
  rejectedQuantity: number | null;
  unit: MaterialUnit;
  rejectionReason: string | null;
};

export type PublicGoodsReceipt = {
  id: string;
  grnNumber: string;
  projectId: string;
  purchaseOrderId: string;
  vendorId: string;
  deliveryChallanNumber: string | null;
  vehicleNumber: string | null;
  receivedDate: string;
  receivedBy: string;
  items: PublicGoodsReceiptItem[];
  photos: string[];
  challanDocument: string | null;
  weighbridgeDocument: string | null;
  latitude: number;
  longitude: number;
  status: GoodsReceiptStatus;
  qualityCheckedBy: string | null;
  qualityCheckedAt: string | null;
  postedBy: string | null;
  postedAt: string | null;
  clientTransactionId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListGoodsReceiptsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  purchaseOrderId?: string;
  vendorId?: string;
  status?: GoodsReceiptStatus;
};

export type QualityAcceptItemInput = {
  lineId: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
};

export type QualityAcceptInput = {
  items: QualityAcceptItemInput[];
};

export type CreateGoodsReceiptItemInput = {
  materialId: string;
  purchaseOrderLineId?: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: MaterialUnit;
};

export type CreateGoodsReceiptInput = {
  projectId: string;
  purchaseOrderId: string;
  vendorId?: string;
  deliveryChallanNumber?: string | null;
  vehicleNumber?: string | null;
  receivedDate: string;
  items: CreateGoodsReceiptItemInput[];
  photos?: string[];
  latitude: number;
  longitude: number;
  submit?: boolean;
};

export type PaginatedGoodsReceipts = {
  items: PublicGoodsReceipt[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** PO line subset used for GRN ↔ PO comparison (`GET /purchase-orders/:id`). */
export type PurchaseOrderLineForCompare = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  unit: MaterialUnit;
  receivedQuantity: number;
  balanceQuantity: number;
};

export type PurchaseOrderForCompare = {
  id: string;
  purchaseOrderNumber: string;
  vendorId: string;
  status: string;
  items: PurchaseOrderLineForCompare[];
  balanceQuantity: number;
  balanceAmount: number;
};
