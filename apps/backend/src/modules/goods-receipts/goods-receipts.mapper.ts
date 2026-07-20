import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type { GoodsReceiptStatus } from './schemas/goods-receipt.schema';

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
  receivedDate: Date;
  receivedBy: string;
  items: PublicGoodsReceiptItem[];
  photos: string[];
  challanDocument: string | null;
  weighbridgeDocument: string | null;
  latitude: number;
  longitude: number;
  status: GoodsReceiptStatus;
  qualityCheckedBy: string | null;
  qualityCheckedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  clientTransactionId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type ItemLike = {
  _id?: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  materialCode?: string | null;
  materialName?: string | null;
  purchaseOrderLineId?: Types.ObjectId | string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity?: number | null;
  rejectedQuantity?: number | null;
  unit: MaterialUnit;
  rejectionReason?: string | null;
};

type GrnLike = {
  _id: Types.ObjectId | string;
  grnNumber: string;
  projectId: Types.ObjectId | string;
  purchaseOrderId: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  deliveryChallanNumber?: string | null;
  vehicleNumber?: string | null;
  receivedDate: Date;
  receivedBy: Types.ObjectId | string;
  items?: ItemLike[];
  photos?: string[];
  challanDocument?: string | null;
  weighbridgeDocument?: string | null;
  latitude: number;
  longitude: number;
  status: GoodsReceiptStatus;
  qualityCheckedBy?: Types.ObjectId | string | null;
  qualityCheckedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  clientTransactionId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicGoodsReceiptItem(
  item: ItemLike,
): PublicGoodsReceiptItem {
  return {
    id: String(item._id ?? ''),
    materialId: String(item.materialId),
    materialCode: item.materialCode ?? null,
    materialName: item.materialName ?? null,
    purchaseOrderLineId: item.purchaseOrderLineId
      ? String(item.purchaseOrderLineId)
      : null,
    orderedQuantity: item.orderedQuantity,
    receivedQuantity: item.receivedQuantity,
    acceptedQuantity: item.acceptedQuantity ?? null,
    rejectedQuantity: item.rejectedQuantity ?? null,
    unit: item.unit,
    rejectionReason: item.rejectionReason ?? null,
  };
}

export function toPublicGoodsReceipt(row: GrnLike): PublicGoodsReceipt {
  return {
    id: String(row._id),
    grnNumber: row.grnNumber,
    projectId: String(row.projectId),
    purchaseOrderId: String(row.purchaseOrderId),
    vendorId: String(row.vendorId),
    deliveryChallanNumber: row.deliveryChallanNumber ?? null,
    vehicleNumber: row.vehicleNumber ?? null,
    receivedDate: row.receivedDate,
    receivedBy: String(row.receivedBy),
    items: (row.items ?? []).map(toPublicGoodsReceiptItem),
    photos: row.photos ?? [],
    challanDocument: row.challanDocument ?? null,
    weighbridgeDocument: row.weighbridgeDocument ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    qualityCheckedBy: row.qualityCheckedBy
      ? String(row.qualityCheckedBy)
      : null,
    qualityCheckedAt: row.qualityCheckedAt ?? null,
    postedBy: row.postedBy ? String(row.postedBy) : null,
    postedAt: row.postedAt ?? null,
    clientTransactionId: row.clientTransactionId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
