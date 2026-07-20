import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type {
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
  VendorInvoiceVarianceSeverity,
  VendorInvoiceVarianceType,
} from './schemas/vendor-invoice.schema';
import { computeRemainingPayable } from './vendor-invoices.validation';

export type PublicVendorInvoiceItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  purchaseOrderLineId: string | null;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax: number;
  amount: number;
  poRate: number | null;
  poOrderedQuantity: number | null;
  grnAcceptedQuantity: number | null;
  quantityVariance: number | null;
  rateVariance: number | null;
  taxVariance: number | null;
  poLineTax: number | null;
};

export type PublicVendorInvoiceVariance = {
  id: string;
  type: VendorInvoiceVarianceType;
  materialId: string | null;
  message: string;
  expected: number | null;
  actual: number | null;
  severity: VendorInvoiceVarianceSeverity;
};

export type PublicVendorInvoice = {
  id: string;
  documentNumber: string;
  invoiceNumber: string;
  vendorId: string;
  projectId: string;
  purchaseOrderId: string;
  grnIds: string[];
  invoiceDate: Date;
  dueDate: Date;
  taxableValue: number;
  gst: number;
  tds: number;
  retention: number;
  freight: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingPayable: number;
  invoiceDocument: string | null;
  items: PublicVendorInvoiceItem[];
  variances: PublicVendorInvoiceVariance[];
  matchingStatus: VendorInvoiceMatchingStatus;
  exceptionApproved: boolean;
  exceptionApprovedBy: string | null;
  exceptionApprovedAt: Date | null;
  exceptionApprovedComment: string | null;
  matchingRejectedBy: string | null;
  matchingRejectedAt: Date | null;
  matchingRejectionReason: string | null;
  status: VendorInvoiceStatus;
  journalEntryId: string | null;
  notes: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  matchedBy: string | null;
  matchedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  paidBy: string | null;
  paidAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

type InvoiceLike = {
  _id: Types.ObjectId | string;
  documentNumber: string;
  invoiceNumber: string;
  vendorId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  purchaseOrderId: Types.ObjectId | string;
  grnIds?: Array<Types.ObjectId | string>;
  invoiceDate: Date;
  dueDate: Date;
  taxableValue: number;
  gst: number;
  tds?: number;
  retention?: number;
  freight?: number;
  discount?: number;
  totalAmount: number;
  paidAmount?: number;
  invoiceDocument?: string | null;
  items?: Array<{
    _id?: Types.ObjectId | string;
    materialId: Types.ObjectId | string;
    materialCode?: string | null;
    materialName?: string | null;
    purchaseOrderLineId?: Types.ObjectId | string | null;
    quantity: number;
    unit: MaterialUnit;
    rate: number;
    tax?: number;
    amount: number;
    poRate?: number | null;
    poOrderedQuantity?: number | null;
    grnAcceptedQuantity?: number | null;
    quantityVariance?: number | null;
    rateVariance?: number | null;
    taxVariance?: number | null;
    poLineTax?: number | null;
  }>;
  variances?: Array<{
    _id?: Types.ObjectId | string;
    type: VendorInvoiceVarianceType;
    materialId?: Types.ObjectId | string | null;
    message: string;
    expected?: number | null;
    actual?: number | null;
    severity: VendorInvoiceVarianceSeverity;
  }>;
  matchingStatus: VendorInvoiceMatchingStatus;
  exceptionApproved?: boolean;
  exceptionApprovedBy?: Types.ObjectId | string | null;
  exceptionApprovedAt?: Date | null;
  exceptionApprovedComment?: string | null;
  matchingRejectedBy?: Types.ObjectId | string | null;
  matchingRejectedAt?: Date | null;
  matchingRejectionReason?: string | null;
  status: VendorInvoiceStatus;
  journalEntryId?: Types.ObjectId | string | null;
  notes?: string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  matchedBy?: Types.ObjectId | string | null;
  matchedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  paidBy?: Types.ObjectId | string | null;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicVendorInvoice(row: InvoiceLike): PublicVendorInvoice {
  return {
    id: String(row._id),
    documentNumber: row.documentNumber,
    invoiceNumber: row.invoiceNumber,
    vendorId: String(row.vendorId),
    projectId: String(row.projectId),
    purchaseOrderId: String(row.purchaseOrderId),
    grnIds: (row.grnIds ?? []).map((id) => String(id)),
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    taxableValue: row.taxableValue,
    gst: row.gst,
    tds: row.tds ?? 0,
    retention: row.retention ?? 0,
    freight: row.freight ?? 0,
    discount: row.discount ?? 0,
    totalAmount: row.totalAmount,
    paidAmount: row.paidAmount ?? 0,
    remainingPayable: computeRemainingPayable({
      totalAmount: row.totalAmount ?? 0,
      tds: row.tds,
      retention: row.retention,
      paidAmount: row.paidAmount,
    }),
    invoiceDocument: row.invoiceDocument ?? null,
    items: (row.items ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      materialId: String(item.materialId),
      materialCode: item.materialCode ?? null,
      materialName: item.materialName ?? null,
      purchaseOrderLineId: oid(item.purchaseOrderLineId),
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      tax: item.tax ?? 0,
      amount: item.amount,
      poRate: item.poRate ?? null,
      poOrderedQuantity: item.poOrderedQuantity ?? null,
      grnAcceptedQuantity: item.grnAcceptedQuantity ?? null,
      quantityVariance: item.quantityVariance ?? null,
      rateVariance: item.rateVariance ?? null,
      taxVariance: item.taxVariance ?? null,
      poLineTax: item.poLineTax ?? null,
    })),
    variances: (row.variances ?? []).map((v) => ({
      id: v._id ? String(v._id) : '',
      type: v.type,
      materialId: oid(v.materialId),
      message: v.message,
      expected: v.expected ?? null,
      actual: v.actual ?? null,
      severity: v.severity,
    })),
    matchingStatus: row.matchingStatus,
    exceptionApproved: row.exceptionApproved ?? false,
    exceptionApprovedBy: oid(row.exceptionApprovedBy),
    exceptionApprovedAt: row.exceptionApprovedAt ?? null,
    exceptionApprovedComment: row.exceptionApprovedComment ?? null,
    matchingRejectedBy: oid(row.matchingRejectedBy),
    matchingRejectedAt: row.matchingRejectedAt ?? null,
    matchingRejectionReason: row.matchingRejectionReason ?? null,
    status: row.status,
    journalEntryId: oid(row.journalEntryId),
    notes: row.notes ?? null,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    verifiedBy: oid(row.verifiedBy),
    verifiedAt: row.verifiedAt ?? null,
    matchedBy: oid(row.matchedBy),
    matchedAt: row.matchedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    paidBy: oid(row.paidBy),
    paidAt: row.paidAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
