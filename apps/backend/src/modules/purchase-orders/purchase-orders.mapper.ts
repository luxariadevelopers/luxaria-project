import type { Types } from 'mongoose';
import type { AddressEmbed } from '../company/schemas/address.embed';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type { PurchaseOrderStatus } from './schemas/purchase-order.schema';

export type PublicPoAddress = {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type PublicPurchaseOrderItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax: number;
  discount: number;
  total: number;
  receivedQuantity: number;
  balanceQuantity: number;
};

export type PublicPurchaseOrder = {
  id: string;
  purchaseOrderNumber: string;
  projectId: string;
  purchaseRequestId: string;
  selectedQuotationId: string;
  vendorId: string;
  orderDate: Date;
  expectedDeliveryDate: Date;
  billingAddress: PublicPoAddress;
  deliveryAddress: PublicPoAddress;
  paymentTerms: string | null;
  items: PublicPurchaseOrderItem[];
  subtotal: number;
  taxes: number;
  freight: number;
  discount: number;
  total: number;
  terms: string | null;
  status: PurchaseOrderStatus;
  revisionNumber: number;
  rootPurchaseOrderId: string | null;
  revisedFromId: string | null;
  approvalRequestId: string | null;
  issuedBy: string | null;
  issuedAt: Date | null;
  vendorAcceptedAt: Date | null;
  pdfPath: string | null;
  pdfGeneratedAt: Date | null;
  balanceQuantity: number;
  balanceAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

type ItemLike = {
  _id?: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  materialCode?: string | null;
  materialName?: string | null;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax: number;
  discount: number;
  total: number;
  receivedQuantity: number;
  balanceQuantity: number;
};

type PoLike = {
  _id: Types.ObjectId | string;
  purchaseOrderNumber: string;
  projectId: Types.ObjectId | string;
  purchaseRequestId: Types.ObjectId | string;
  selectedQuotationId: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  orderDate: Date;
  expectedDeliveryDate: Date;
  billingAddress: AddressEmbed;
  deliveryAddress: AddressEmbed;
  paymentTerms?: string | null;
  items?: ItemLike[];
  subtotal: number;
  taxes: number;
  freight: number;
  discount: number;
  total: number;
  terms?: string | null;
  status: PurchaseOrderStatus;
  revisionNumber: number;
  rootPurchaseOrderId?: Types.ObjectId | string | null;
  revisedFromId?: Types.ObjectId | string | null;
  approvalRequestId?: Types.ObjectId | string | null;
  issuedBy?: Types.ObjectId | string | null;
  issuedAt?: Date | null;
  vendorAcceptedAt?: Date | null;
  pdfPath?: string | null;
  pdfGeneratedAt?: Date | null;
  balanceQuantity: number;
  balanceAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
};

function toPublicAddress(address: AddressEmbed): PublicPoAddress {
  return {
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
  };
}

export function toPublicPurchaseOrderItem(
  item: ItemLike,
): PublicPurchaseOrderItem {
  return {
    id: String(item._id ?? ''),
    materialId: String(item.materialId),
    materialCode: item.materialCode ?? null,
    materialName: item.materialName ?? null,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    tax: item.tax,
    discount: item.discount,
    total: item.total,
    receivedQuantity: item.receivedQuantity,
    balanceQuantity: item.balanceQuantity,
  };
}

export function toPublicPurchaseOrder(row: PoLike): PublicPurchaseOrder {
  return {
    id: String(row._id),
    purchaseOrderNumber: row.purchaseOrderNumber,
    projectId: String(row.projectId),
    purchaseRequestId: String(row.purchaseRequestId),
    selectedQuotationId: String(row.selectedQuotationId),
    vendorId: String(row.vendorId),
    orderDate: row.orderDate,
    expectedDeliveryDate: row.expectedDeliveryDate,
    billingAddress: toPublicAddress(row.billingAddress),
    deliveryAddress: toPublicAddress(row.deliveryAddress),
    paymentTerms: row.paymentTerms ?? null,
    items: (row.items ?? []).map(toPublicPurchaseOrderItem),
    subtotal: row.subtotal,
    taxes: row.taxes,
    freight: row.freight,
    discount: row.discount,
    total: row.total,
    terms: row.terms ?? null,
    status: row.status,
    revisionNumber: row.revisionNumber,
    rootPurchaseOrderId: row.rootPurchaseOrderId
      ? String(row.rootPurchaseOrderId)
      : null,
    revisedFromId: row.revisedFromId ? String(row.revisedFromId) : null,
    approvalRequestId: row.approvalRequestId
      ? String(row.approvalRequestId)
      : null,
    issuedBy: row.issuedBy ? String(row.issuedBy) : null,
    issuedAt: row.issuedAt ?? null,
    vendorAcceptedAt: row.vendorAcceptedAt ?? null,
    pdfPath: row.pdfPath ?? null,
    pdfGeneratedAt: row.pdfGeneratedAt ?? null,
    balanceQuantity: row.balanceQuantity,
    balanceAmount: row.balanceAmount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
