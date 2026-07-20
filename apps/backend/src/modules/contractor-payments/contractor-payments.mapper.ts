import type { Types } from 'mongoose';
import type {
  ContractorPaymentMode,
  ContractorPaymentStatus,
} from './schemas/contractor-payment.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicContractorPayment = {
  id: string;
  paymentNumber: string;
  contractorId: string;
  projectId: string;
  billIds: string[];
  allocations: Array<{
    id: string;
    billId: string;
    billNumber: string | null;
    raNumber: number | null;
    amount: number;
  }>;
  paymentDate: Date;
  amount: number;
  paymentMode: ContractorPaymentMode;
  bankAccountId: string;
  transactionReference: string;
  tds: number;
  retention: number;
  advanceRecovery: number;
  penalty: number;
  bankAmount: number;
  paymentProof: string | null;
  status: ContractorPaymentStatus;
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

type PaymentLike = {
  _id: Types.ObjectId | string;
  paymentNumber: string;
  contractorId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  billIds?: Array<Types.ObjectId | string>;
  allocations?: Array<{
    _id?: Types.ObjectId | string;
    billId: Types.ObjectId | string;
    billNumber?: string | null;
    raNumber?: number | null;
    amount: number;
  }>;
  paymentDate: Date;
  amount: number;
  paymentMode: ContractorPaymentMode;
  bankAccountId: Types.ObjectId | string;
  transactionReference: string;
  tds: number;
  retention: number;
  advanceRecovery: number;
  penalty: number;
  bankAmount: number;
  paymentProof?: string | null;
  status: ContractorPaymentStatus;
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

export function toPublicContractorPayment(
  row: PaymentLike,
): PublicContractorPayment {
  return {
    id: String(row._id),
    paymentNumber: row.paymentNumber,
    contractorId: String(row.contractorId),
    projectId: String(row.projectId),
    billIds: (row.billIds ?? []).map(String),
    allocations: (row.allocations ?? []).map((a) => ({
      id: a._id ? String(a._id) : '',
      billId: String(a.billId),
      billNumber: a.billNumber ?? null,
      raNumber: a.raNumber ?? null,
      amount: a.amount,
    })),
    paymentDate: row.paymentDate,
    amount: row.amount,
    paymentMode: row.paymentMode,
    bankAccountId: String(row.bankAccountId),
    transactionReference: row.transactionReference,
    tds: row.tds,
    retention: row.retention,
    advanceRecovery: row.advanceRecovery,
    penalty: row.penalty,
    bankAmount: row.bankAmount,
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
