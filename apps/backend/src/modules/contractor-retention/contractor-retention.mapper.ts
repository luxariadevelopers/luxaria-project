import type { Types } from 'mongoose';
import type {
  RetentionKind,
  RetentionReleaseStage,
  RetentionStatus,
} from './schemas/contractor-retention.schema';

export type PublicContractorRetention = {
  id: string;
  retentionNumber: string;
  projectId: string;
  contractorId: string;
  agreementId: string | null;
  billId: string | null;
  kind: RetentionKind;
  ceilingAmount: number;
  amount: number;
  releaseStage: RetentionReleaseStage | null;
  bgReference: string | null;
  status: RetentionStatus;
  notes: string | null;
  rejectionReason: string | null;
  requestedBy: string | null;
  requestedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  releasedBy: string | null;
  releasedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RetentionRegisterRow = {
  projectId: string;
  contractorId: string;
  agreementId: string | null;
  ceilingAmount: number;
  totalDeducted: number;
  totalReleased: number;
  balanceHeld: number;
  deductionCount: number;
  releaseCount: number;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicContractorRetention(row: {
  _id: Types.ObjectId | string;
  retentionNumber: string;
  projectId: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  agreementId?: Types.ObjectId | string | null;
  billId?: Types.ObjectId | string | null;
  kind: RetentionKind;
  ceilingAmount: number;
  amount: number;
  releaseStage?: RetentionReleaseStage | null;
  bgReference?: string | null;
  status: RetentionStatus;
  notes?: string | null;
  rejectionReason?: string | null;
  requestedBy?: Types.ObjectId | string | null;
  requestedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  rejectedBy?: Types.ObjectId | string | null;
  rejectedAt?: Date | null;
  releasedBy?: Types.ObjectId | string | null;
  releasedAt?: Date | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicContractorRetention {
  return {
    id: String(row._id),
    retentionNumber: row.retentionNumber,
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    agreementId: oid(row.agreementId),
    billId: oid(row.billId),
    kind: row.kind,
    ceilingAmount: row.ceilingAmount,
    amount: row.amount,
    releaseStage: row.releaseStage ?? null,
    bgReference: row.bgReference ?? null,
    status: row.status,
    notes: row.notes ?? null,
    rejectionReason: row.rejectionReason ?? null,
    requestedBy: oid(row.requestedBy),
    requestedAt: row.requestedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    releasedBy: oid(row.releasedBy),
    releasedAt: row.releasedAt ?? null,
    cancelledBy: oid(row.cancelledBy),
    cancelledAt: row.cancelledAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
