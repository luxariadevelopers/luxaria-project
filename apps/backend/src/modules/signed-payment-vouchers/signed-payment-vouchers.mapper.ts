import type { Types } from 'mongoose';
import type {
  SignedPaymentVoucherStatus,
  SignedPaymentVoucherType,
} from './schemas/signed-payment-voucher.schema';

export type PublicSignedPaymentVoucher = {
  id: string;
  voucherNumber: string;
  voucherType: SignedPaymentVoucherType;
  projectId: string;
  pettyCashAccountId: string;
  recipientName: string;
  recipientMobile: string | null;
  workDescription: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  recipientSignatureDocumentId: string | null;
  recipientSignatureChecksum: string | null;
  engineerSignatureDocumentId: string | null;
  engineerSignatureChecksum: string | null;
  requiresWitnessSignature: boolean;
  witnessSignatureDocumentId: string | null;
  witnessSignatureChecksum: string | null;
  requiresRecipientPhoto: boolean;
  recipientPhotoDocumentId: string | null;
  recipientPhotoChecksum: string | null;
  voucherPdfDocumentId: string | null;
  voucherPdfChecksum: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: Date;
  deviceId: string | null;
  status: SignedPaymentVoucherStatus;
  journalEntryId: string | null;
  reversalJournalEntryId: string | null;
  replacesVoucherId: string | null;
  replacementVoucherId: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  reversedBy: string | null;
  reversedAt: Date | null;
  reversalReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicSignedPaymentVoucher(row: {
  _id: Types.ObjectId | string;
  voucherNumber: string;
  voucherType: SignedPaymentVoucherType;
  projectId: Types.ObjectId | string;
  pettyCashAccountId: Types.ObjectId | string;
  recipientName: string;
  recipientMobile?: string | null;
  workDescription: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  recipientSignatureDocumentId?: Types.ObjectId | string | null;
  recipientSignatureChecksum?: string | null;
  engineerSignatureDocumentId?: Types.ObjectId | string | null;
  engineerSignatureChecksum?: string | null;
  requiresWitnessSignature?: boolean;
  witnessSignatureDocumentId?: Types.ObjectId | string | null;
  witnessSignatureChecksum?: string | null;
  requiresRecipientPhoto?: boolean;
  recipientPhotoDocumentId?: Types.ObjectId | string | null;
  recipientPhotoChecksum?: string | null;
  voucherPdfDocumentId?: Types.ObjectId | string | null;
  voucherPdfChecksum?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt: Date;
  deviceId?: string | null;
  status: SignedPaymentVoucherStatus;
  journalEntryId?: Types.ObjectId | string | null;
  reversalJournalEntryId?: Types.ObjectId | string | null;
  replacesVoucherId?: Types.ObjectId | string | null;
  replacementVoucherId?: Types.ObjectId | string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  reversedBy?: Types.ObjectId | string | null;
  reversedAt?: Date | null;
  reversalReason?: string | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicSignedPaymentVoucher {
  return {
    id: String(row._id),
    voucherNumber: row.voucherNumber,
    voucherType: row.voucherType,
    projectId: String(row.projectId),
    pettyCashAccountId: String(row.pettyCashAccountId),
    recipientName: row.recipientName,
    recipientMobile: row.recipientMobile ?? null,
    workDescription: row.workDescription,
    grossAmount: row.grossAmount,
    deductions: row.deductions,
    netAmount: row.netAmount,
    recipientSignatureDocumentId: oid(row.recipientSignatureDocumentId),
    recipientSignatureChecksum: row.recipientSignatureChecksum ?? null,
    engineerSignatureDocumentId: oid(row.engineerSignatureDocumentId),
    engineerSignatureChecksum: row.engineerSignatureChecksum ?? null,
    requiresWitnessSignature: Boolean(row.requiresWitnessSignature),
    witnessSignatureDocumentId: oid(row.witnessSignatureDocumentId),
    witnessSignatureChecksum: row.witnessSignatureChecksum ?? null,
    requiresRecipientPhoto: Boolean(row.requiresRecipientPhoto),
    recipientPhotoDocumentId: oid(row.recipientPhotoDocumentId),
    recipientPhotoChecksum: row.recipientPhotoChecksum ?? null,
    voucherPdfDocumentId: oid(row.voucherPdfDocumentId),
    voucherPdfChecksum: row.voucherPdfChecksum ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    capturedAt: row.capturedAt,
    deviceId: row.deviceId ?? null,
    status: row.status,
    journalEntryId: oid(row.journalEntryId),
    reversalJournalEntryId: oid(row.reversalJournalEntryId),
    replacesVoucherId: oid(row.replacesVoucherId),
    replacementVoucherId: oid(row.replacementVoucherId),
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    reversedBy: oid(row.reversedBy),
    reversedAt: row.reversedAt ?? null,
    reversalReason: row.reversalReason ?? null,
    cancelledBy: oid(row.cancelledBy),
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
