import type { Types } from 'mongoose';
import type {
  ContributionPaymentMode,
  ContributionReceiptStatus,
} from './schemas/contribution-receipt.schema';

export type PublicContributionReceipt = {
  id: string;
  receiptNumber: string;
  projectId: string;
  participantId: string;
  commitmentId: string;
  receivedDate: Date;
  amount: number;
  paymentMode: ContributionPaymentMode;
  bankAccountId: string | null;
  transactionReference: string | null;
  receiptDocument: string | null;
  receiptPdfPath: string | null;
  remarks: string | null;
  status: ContributionReceiptStatus;
  journalEntryId: string | null;
  balancesApplied: boolean;
  accountingNote: string;
  submittedBy: string | null;
  submittedAt: Date | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type ReceiptLike = {
  _id: Types.ObjectId | string;
  receiptNumber: string;
  projectId: Types.ObjectId | string;
  participantId: Types.ObjectId | string;
  commitmentId: Types.ObjectId | string;
  receivedDate: Date;
  amount: number;
  paymentMode: ContributionPaymentMode;
  bankAccountId?: Types.ObjectId | string | null;
  transactionReference?: string | null;
  receiptDocument?: string | null;
  receiptPdfPath?: string | null;
  remarks?: string | null;
  status: ContributionReceiptStatus;
  journalEntryId?: Types.ObjectId | string | null;
  balancesApplied?: boolean;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicReceipt(row: ReceiptLike): PublicContributionReceipt {
  return {
    id: String(row._id),
    receiptNumber: row.receiptNumber,
    projectId: String(row.projectId),
    participantId: String(row.participantId),
    commitmentId: String(row.commitmentId),
    receivedDate: row.receivedDate,
    amount: row.amount,
    paymentMode: row.paymentMode,
    bankAccountId: row.bankAccountId ? String(row.bankAccountId) : null,
    transactionReference: row.transactionReference ?? null,
    receiptDocument: row.receiptDocument ?? null,
    receiptPdfPath: row.receiptPdfPath ?? null,
    remarks: row.remarks ?? null,
    status: row.status,
    journalEntryId: row.journalEntryId ? String(row.journalEntryId) : null,
    balancesApplied: Boolean(row.balancesApplied),
    accountingNote:
      'Contribution receipts must create accounting entries later (journalEntryId reserved)',
    submittedBy: row.submittedBy ? String(row.submittedBy) : null,
    submittedAt: row.submittedAt ?? null,
    verifiedBy: row.verifiedBy ? String(row.verifiedBy) : null,
    verifiedAt: row.verifiedAt ?? null,
    postedBy: row.postedBy ? String(row.postedBy) : null,
    postedAt: row.postedAt ?? null,
    cancelledBy: row.cancelledBy ? String(row.cancelledBy) : null,
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
