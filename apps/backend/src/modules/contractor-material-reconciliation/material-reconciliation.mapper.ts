import type { Types } from 'mongoose';
import type { ContractorMaterialReconciliationStatus } from './schemas/contractor-material-reconciliation.schema';

export type PublicMaterialReconciliationPeriod = {
  from: Date;
  to: Date;
};

export type PublicMaterialReconciliation = {
  id: string;
  projectId: string;
  contractorId: string;
  workOrderId: string | null;
  materialId: string;
  period: PublicMaterialReconciliationPeriod;
  issuedQuantity: number;
  theoreticalConsumption: number;
  approvedWastage: number;
  returnedQuantity: number;
  recoverableDifference: number;
  unitRate: number;
  recoveryAmount: number;
  status: ContractorMaterialReconciliationStatus;
  billId: string | null;
  recoveryId: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  postedBy: string | null;
  postedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicMaterialReconciliation(row: {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  workOrderId?: Types.ObjectId | string | null;
  materialId: Types.ObjectId | string;
  period: { from: Date; to: Date };
  issuedQuantity: number;
  theoreticalConsumption: number;
  approvedWastage: number;
  returnedQuantity: number;
  recoverableDifference: number;
  unitRate: number;
  recoveryAmount: number;
  status: ContractorMaterialReconciliationStatus;
  billId?: Types.ObjectId | string | null;
  recoveryId?: Types.ObjectId | string | null;
  notes?: string | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  postedBy?: Types.ObjectId | string | null;
  postedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicMaterialReconciliation {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    workOrderId: oid(row.workOrderId),
    materialId: String(row.materialId),
    period: {
      from: row.period.from,
      to: row.period.to,
    },
    issuedQuantity: row.issuedQuantity,
    theoreticalConsumption: row.theoreticalConsumption,
    approvedWastage: row.approvedWastage,
    returnedQuantity: row.returnedQuantity,
    recoverableDifference: row.recoverableDifference,
    unitRate: row.unitRate,
    recoveryAmount: row.recoveryAmount,
    status: row.status,
    billId: oid(row.billId),
    recoveryId: oid(row.recoveryId),
    notes: row.notes ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    postedBy: oid(row.postedBy),
    postedAt: row.postedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
