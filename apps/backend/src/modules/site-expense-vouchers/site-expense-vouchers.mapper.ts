import type { Types } from 'mongoose';
import type {
  SiteExpenseAttachmentType,
  SiteExpensePaymentMode,
  SiteExpenseVoucherStatus,
} from './schemas/site-expense-voucher.schema';

export type PublicSiteExpenseAttachment = {
  id: string;
  type: SiteExpenseAttachmentType;
  fileName: string | null;
  filePath: string | null;
  documentId: string | null;
  mimeType: string | null;
};

export type PublicSiteExpenseVoucher = {
  id: string;
  voucherNumber: string;
  projectId: string;
  pettyCashAccountId: string;
  expenseDate: Date;
  expenseCategoryId: string;
  amount: number;
  paidTo: string;
  mobileNumber: string | null;
  purpose: string;
  boqItemId: string | null;
  paymentMode: SiteExpensePaymentMode;
  billNumber: string | null;
  billDate: Date | null;
  attachments: PublicSiteExpenseAttachment[];
  latitude: number | null;
  longitude: number | null;
  deviceId: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  status: SiteExpenseVoucherStatus;
  warnings: string[];
  journalEntryId: string | null;
  debitAccountId: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicSiteExpenseVoucher(row: {
  _id: Types.ObjectId | string;
  voucherNumber: string;
  projectId: Types.ObjectId | string;
  pettyCashAccountId: Types.ObjectId | string;
  expenseDate: Date;
  expenseCategoryId: Types.ObjectId | string;
  amount: number;
  paidTo: string;
  mobileNumber?: string | null;
  purpose: string;
  boqItemId?: Types.ObjectId | string | null;
  paymentMode: SiteExpensePaymentMode;
  billNumber?: string | null;
  billDate?: Date | null;
  attachments?: Array<{
    _id?: Types.ObjectId | string;
    type: SiteExpenseAttachmentType;
    fileName?: string | null;
    filePath?: string | null;
    documentId?: Types.ObjectId | string | null;
    mimeType?: string | null;
  }>;
  latitude?: number | null;
  longitude?: number | null;
  deviceId?: string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  status: SiteExpenseVoucherStatus;
  warnings?: string[];
  journalEntryId?: Types.ObjectId | string | null;
  debitAccountId?: Types.ObjectId | string | null;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  rejectedBy?: Types.ObjectId | string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicSiteExpenseVoucher {
  return {
    id: String(row._id),
    voucherNumber: row.voucherNumber,
    projectId: String(row.projectId),
    pettyCashAccountId: String(row.pettyCashAccountId),
    expenseDate: row.expenseDate,
    expenseCategoryId: String(row.expenseCategoryId),
    amount: row.amount,
    paidTo: row.paidTo,
    mobileNumber: row.mobileNumber ?? null,
    purpose: row.purpose,
    boqItemId: oid(row.boqItemId),
    paymentMode: row.paymentMode,
    billNumber: row.billNumber ?? null,
    billDate: row.billDate ?? null,
    attachments: (row.attachments ?? []).map((a) => ({
      id: a._id ? String(a._id) : '',
      type: a.type,
      fileName: a.fileName ?? null,
      filePath: a.filePath ?? null,
      documentId: oid(a.documentId),
      mimeType: a.mimeType ?? null,
    })),
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    deviceId: row.deviceId ?? null,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    status: row.status,
    warnings: row.warnings ?? [],
    journalEntryId: oid(row.journalEntryId),
    debitAccountId: oid(row.debitAccountId),
    verifiedBy: oid(row.verifiedBy),
    verifiedAt: row.verifiedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    cancelledBy: oid(row.cancelledBy),
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
