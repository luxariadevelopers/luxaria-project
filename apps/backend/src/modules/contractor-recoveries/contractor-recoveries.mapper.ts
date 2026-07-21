import type { Types } from 'mongoose';
import type {
  ContractorRecoveryStatus,
  ContractorRecoveryType,
} from './schemas/contractor-recovery.schema';

export type PublicContractorRecovery = {
  id: string;
  projectId: string;
  contractorId: string;
  workOrderId: string | null;
  type: ContractorRecoveryType;
  amount: number;
  description: string | null;
  notes: string | null;
  billId: string | null;
  materialReconciliationId: string | null;
  status: ContractorRecoveryStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicContractorRecovery(row: {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  workOrderId?: Types.ObjectId | string | null;
  type: ContractorRecoveryType;
  amount: number;
  description?: string | null;
  notes?: string | null;
  billId?: Types.ObjectId | string | null;
  materialReconciliationId?: Types.ObjectId | string | null;
  status: ContractorRecoveryStatus;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicContractorRecovery {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    workOrderId: oid(row.workOrderId),
    type: row.type,
    amount: row.amount,
    description: row.description ?? null,
    notes: row.notes ?? null,
    billId: oid(row.billId),
    materialReconciliationId: oid(row.materialReconciliationId),
    status: row.status,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
