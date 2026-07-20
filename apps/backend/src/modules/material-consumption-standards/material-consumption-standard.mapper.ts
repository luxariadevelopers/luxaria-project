import type { Types } from 'mongoose';
import type { BoqUnit } from '../boq/schemas/boq.schema';
import { effectiveQuantityPerUnit } from './material-consumption-standard.validation';
import type { MaterialConsumptionStandardStatus } from './schemas/material-consumption-standard.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicMaterialConsumptionStandard = {
  id: string;
  standardNumber: string;
  scopeKey: string;
  projectId: string | null;
  isProjectOverride: boolean;
  overridesStandardId: string | null;
  boqItemId: string | null;
  workType: string | null;
  outputUnit: BoqUnit;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantityPerUnit: number;
  wastagePercentage: number;
  effectiveQuantityPerUnit: number;
  effectiveDate: Date;
  version: number;
  status: MaterialConsumptionStandardStatus;
  basedOnStandardId: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  approvalReference: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type Row = {
  _id: Types.ObjectId;
  standardNumber: string;
  scopeKey: string;
  projectId?: Types.ObjectId | null;
  isProjectOverride: boolean;
  overridesStandardId?: Types.ObjectId | null;
  boqItemId?: Types.ObjectId | null;
  workType?: string | null;
  outputUnit: BoqUnit;
  materialId: Types.ObjectId;
  materialCode?: string | null;
  materialName?: string | null;
  quantityPerUnit: number;
  wastagePercentage: number;
  effectiveDate: Date;
  version: number;
  status: MaterialConsumptionStandardStatus;
  basedOnStandardId?: Types.ObjectId | null;
  submittedBy?: Types.ObjectId | null;
  submittedAt?: Date | null;
  approvalReference?: string | null;
  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  rejectedBy?: Types.ObjectId | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicMaterialConsumptionStandard(
  row: Row,
): PublicMaterialConsumptionStandard {
  return {
    id: String(row._id),
    standardNumber: row.standardNumber,
    scopeKey: row.scopeKey,
    projectId: oid(row.projectId),
    isProjectOverride: row.isProjectOverride,
    overridesStandardId: oid(row.overridesStandardId),
    boqItemId: oid(row.boqItemId),
    workType: row.workType ?? null,
    outputUnit: row.outputUnit,
    materialId: String(row.materialId),
    materialCode: row.materialCode ?? null,
    materialName: row.materialName ?? null,
    quantityPerUnit: row.quantityPerUnit,
    wastagePercentage: row.wastagePercentage,
    effectiveQuantityPerUnit: effectiveQuantityPerUnit(
      row.quantityPerUnit,
      row.wastagePercentage,
    ),
    effectiveDate: row.effectiveDate,
    version: row.version,
    status: row.status,
    basedOnStandardId: oid(row.basedOnStandardId),
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    approvalReference: row.approvalReference ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
