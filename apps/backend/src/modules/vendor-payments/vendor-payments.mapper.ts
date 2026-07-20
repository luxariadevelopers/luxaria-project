import type { Types } from 'mongoose';
import type {
  VendorPaymentMode,
  VendorPaymentStatus,
} from './schemas/vendor-payment.schema';

export type PublicVendorPaymentAllocation = {
  id: string;
  invoiceId: string;
  invoiceDocumentNumber: string | null;
  invoiceNumber: string | null;
  amount: number;
};

export type PublicVendorPayment = {
  id: string;
  paymentNumber: string;
  vendorId: string;
  projectId: string;
  invoiceIds: string[];
  allocations: PublicVendorPaymentAllocation[];
  paymentDate: Date;
  amount: number;
  paymentMode: VendorPaymentMode;
  bankAccountId: string;
  transactionReference: string;
  tds: number;
  retention: number;
  deductions: number;
  bankAmount: number;
  paymentProof: string | null;
  status: VendorPaymentStatus;
  journalEntryId: string | null;
  notes: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  releasedBy: string | null;
  releasedAt: Date | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

type PaymentLike = {
  _id: Types.ObjectId | string;
  paymentNumber: string;
  vendorId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  invoiceIds?: Array<Types.ObjectId | string>;
  allocations?: Array<{
    _id?: Types.ObjectId | string;
    invoiceId: Types.ObjectId | string;
    invoiceDocumentNumber?: string | null;
    invoiceNumber?: string | null;
    amount: number;
  }>;
  paymentDate: Date;
  amount: number;
  paymentMode: VendorPaymentMode;
  bankAccountId: Types.ObjectId | string;
  transactionReference: string;
  tds?: number;
  retention?: number;
  deductions?: number;
  bankAmount?: number;
  paymentProof?: string | null;
  status: VendorPaymentStatus;
  journalEntryId?: Types.ObjectId | string | null;
  notes?: string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  releasedBy?: Types.ObjectId | string | null;
  releasedAt?: Date | null;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicVendorPayment(row: PaymentLike): PublicVendorPayment {
  return {
    id: String(row._id),
    paymentNumber: row.paymentNumber,
    vendorId: String(row.vendorId),
    projectId: String(row.projectId),
    invoiceIds: (row.invoiceIds ?? []).map((id) => String(id)),
    allocations: (row.allocations ?? []).map((a) => ({
      id: a._id ? String(a._id) : '',
      invoiceId: String(a.invoiceId),
      invoiceDocumentNumber: a.invoiceDocumentNumber ?? null,
      invoiceNumber: a.invoiceNumber ?? null,
      amount: a.amount,
    })),
    paymentDate: row.paymentDate,
    amount: row.amount,
    paymentMode: row.paymentMode,
    bankAccountId: String(row.bankAccountId),
    transactionReference: row.transactionReference,
    tds: row.tds ?? 0,
    retention: row.retention ?? 0,
    deductions: row.deductions ?? 0,
    bankAmount: row.bankAmount ?? 0,
    paymentProof: row.paymentProof ?? null,
    status: row.status,
    journalEntryId: oid(row.journalEntryId),
    notes: row.notes ?? null,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    releasedBy: oid(row.releasedBy),
    releasedAt: row.releasedAt ?? null,
    verifiedBy: oid(row.verifiedBy),
    verifiedAt: row.verifiedAt ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
