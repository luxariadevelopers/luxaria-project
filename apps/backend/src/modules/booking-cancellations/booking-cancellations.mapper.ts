import type { Types } from 'mongoose';
import type { BookingCancellationStatus } from './schemas/booking-cancellation.schema';

export type PublicCancellationDocument = {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  category: string;
  uploadedBy: string | null;
  uploadedAt: Date;
};

export type PublicBookingCancellation = {
  id: string;
  cancellationNumber: string;
  bookingId: string;
  customerId: string;
  projectId: string;
  unitId: string;
  cancellationReason: string;
  cancellationDate: Date;
  totalReceived: number;
  cancellationCharge: number;
  deductions: number;
  approvedRefund: number;
  refundBankAccountId: string | null;
  refundTransactionId: string | null;
  refundProcessedAt: Date | null;
  refundProcessedBy: string | null;
  approvalRequestId: string | null;
  documents: PublicCancellationDocument[];
  status: BookingCancellationStatus;
  journalEntryId: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  unitReleasedBy: string | null;
  unitReleasedAt: Date | null;
  remarks: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export function toPublicBookingCancellation(row: {
  _id: Types.ObjectId | string;
  cancellationNumber: string;
  bookingId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  cancellationReason: string;
  cancellationDate: Date;
  totalReceived: number;
  cancellationCharge: number;
  deductions: number;
  approvedRefund: number;
  refundBankAccountId?: Types.ObjectId | string | null;
  refundTransactionId?: string | null;
  refundProcessedAt?: Date | null;
  refundProcessedBy?: Types.ObjectId | string | null;
  approvalRequestId?: Types.ObjectId | string | null;
  documents?: Array<{
    _id?: Types.ObjectId | string;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    category: string;
    uploadedBy?: Types.ObjectId | string | null;
    uploadedAt: Date;
  }>;
  status: BookingCancellationStatus;
  journalEntryId?: Types.ObjectId | string | null;
  reviewedBy?: Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  unitReleasedBy?: Types.ObjectId | string | null;
  unitReleasedAt?: Date | null;
  remarks?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicBookingCancellation {
  return {
    id: String(row._id),
    cancellationNumber: row.cancellationNumber,
    bookingId: String(row.bookingId),
    customerId: String(row.customerId),
    projectId: String(row.projectId),
    unitId: String(row.unitId),
    cancellationReason: row.cancellationReason,
    cancellationDate: row.cancellationDate,
    totalReceived: row.totalReceived,
    cancellationCharge: row.cancellationCharge,
    deductions: row.deductions,
    approvedRefund: row.approvedRefund,
    refundBankAccountId: oid(row.refundBankAccountId),
    refundTransactionId: row.refundTransactionId ?? null,
    refundProcessedAt: row.refundProcessedAt ?? null,
    refundProcessedBy: oid(row.refundProcessedBy),
    approvalRequestId: oid(row.approvalRequestId),
    documents: (row.documents ?? []).map((d) => ({
      id: String(d._id),
      fileName: d.fileName,
      filePath: d.filePath,
      mimeType: d.mimeType ?? null,
      category: d.category,
      uploadedBy: oid(d.uploadedBy),
      uploadedAt: d.uploadedAt,
    })),
    status: row.status,
    journalEntryId: oid(row.journalEntryId),
    reviewedBy: oid(row.reviewedBy),
    reviewedAt: row.reviewedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    unitReleasedBy: oid(row.unitReleasedBy),
    unitReleasedAt: row.unitReleasedAt ?? null,
    remarks: row.remarks ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
