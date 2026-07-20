import type { Types } from 'mongoose';
import type { PettyCashFundTransferStatus } from './schemas/petty-cash-fund-transfer.schema';

export type PublicPettyCashFundTransfer = {
  id: string;
  transferNumber: string;
  projectId: string;
  requestId: string;
  sourceBankAccountId: string;
  destinationPettyCashAccountId: string;
  transferDate: Date;
  amount: number;
  transactionReference: string | null;
  paymentProof: string | null;
  status: PettyCashFundTransferStatus;
  journalEntryId: string | null;
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

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicFundTransfer(row: {
  _id: Types.ObjectId | string;
  transferNumber: string;
  projectId: Types.ObjectId | string;
  requestId: Types.ObjectId | string;
  sourceBankAccountId: Types.ObjectId | string;
  destinationPettyCashAccountId: Types.ObjectId | string;
  transferDate: Date;
  amount: number;
  transactionReference?: string | null;
  paymentProof?: string | null;
  status: PettyCashFundTransferStatus;
  journalEntryId?: Types.ObjectId | string | null;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicPettyCashFundTransfer {
  return {
    id: String(row._id),
    transferNumber: row.transferNumber,
    projectId: String(row.projectId),
    requestId: String(row.requestId),
    sourceBankAccountId: String(row.sourceBankAccountId),
    destinationPettyCashAccountId: String(row.destinationPettyCashAccountId),
    transferDate: row.transferDate,
    amount: row.amount,
    transactionReference: row.transactionReference ?? null,
    paymentProof: row.paymentProof ?? null,
    status: row.status,
    journalEntryId: oid(row.journalEntryId),
    verifiedBy: oid(row.verifiedBy),
    verifiedAt: row.verifiedAt ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    cancelledBy: oid(row.cancelledBy),
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
