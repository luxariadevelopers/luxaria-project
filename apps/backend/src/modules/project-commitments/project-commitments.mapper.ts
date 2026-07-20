import type { Types } from 'mongoose';
import type {
  CommitmentStatus,
  ContributionType,
} from './schemas/contribution-commitment.schema';

export type PublicPaymentScheduleLine = {
  dueDate: Date;
  amount: number;
  label: string | null;
};

export type PublicExpectedBankAccount = {
  bankName: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountNumberLast4: string | null;
};

export type PublicReceiptLine = {
  amount: number;
  receivedAt: Date;
  reference: string | null;
  remarks: string | null;
  recordedBy: string | null;
};

export type PublicCommitment = {
  id: string;
  projectId: string;
  participantId: string;
  commitmentNumber: string;
  commitmentAmount: number;
  commitmentDate: Date;
  dueDate: Date | null;
  contributionType: ContributionType;
  paymentSchedule: PublicPaymentScheduleLine[];
  expectedBankAccount: PublicExpectedBankAccount;
  agreementReference: string | null;
  remarks: string | null;
  status: CommitmentStatus;
  version: number;
  supersedesId: string | null;
  receivedAmount: number;
  pendingAmount: number;
  receipts: PublicReceiptLine[];
  submittedBy: string | null;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type CommitmentLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  participantId: Types.ObjectId | string;
  commitmentNumber: string;
  commitmentAmount: number;
  commitmentDate: Date;
  dueDate?: Date | null;
  contributionType: ContributionType;
  paymentSchedule?: Array<{
    dueDate: Date;
    amount: number;
    label?: string | null;
  }>;
  expectedBankAccount?: {
    bankName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumberLast4?: string | null;
  } | null;
  agreementReference?: string | null;
  remarks?: string | null;
  status: CommitmentStatus;
  version: number;
  supersedesId?: Types.ObjectId | string | null;
  receivedAmount?: number;
  receipts?: Array<{
    amount: number;
    receivedAt: Date;
    reference?: string | null;
    remarks?: string | null;
    recordedBy?: Types.ObjectId | string | null;
  }>;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicCommitment(row: CommitmentLike): PublicCommitment {
  const received = row.receivedAmount ?? 0;
  const bank = row.expectedBankAccount ?? {};
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    participantId: String(row.participantId),
    commitmentNumber: row.commitmentNumber,
    commitmentAmount: row.commitmentAmount,
    commitmentDate: row.commitmentDate,
    dueDate: row.dueDate ?? null,
    contributionType: row.contributionType,
    paymentSchedule: (row.paymentSchedule ?? []).map((line) => ({
      dueDate: line.dueDate,
      amount: line.amount,
      label: line.label ?? null,
    })),
    expectedBankAccount: {
      bankName: bank.bankName ?? null,
      ifsc: bank.ifsc ?? null,
      accountHolderName: bank.accountHolderName ?? null,
      accountNumberLast4: bank.accountNumberLast4 ?? null,
    },
    agreementReference: row.agreementReference ?? null,
    remarks: row.remarks ?? null,
    status: row.status,
    version: row.version,
    supersedesId: row.supersedesId ? String(row.supersedesId) : null,
    receivedAmount: received,
    pendingAmount: Math.max(0, row.commitmentAmount - received),
    receipts: (row.receipts ?? []).map((r) => ({
      amount: r.amount,
      receivedAt: r.receivedAt,
      reference: r.reference ?? null,
      remarks: r.remarks ?? null,
      recordedBy: r.recordedBy ? String(r.recordedBy) : null,
    })),
    submittedBy: row.submittedBy ? String(row.submittedBy) : null,
    submittedAt: row.submittedAt ?? null,
    approvedBy: row.approvedBy ? String(row.approvedBy) : null,
    approvedAt: row.approvedAt ?? null,
    cancelledBy: row.cancelledBy ? String(row.cancelledBy) : null,
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
