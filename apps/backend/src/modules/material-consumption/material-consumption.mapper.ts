import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type { MaterialConsumptionAlert } from './material-consumption.validation';
import type {
  MaterialConsumptionReportStatus,
  MaterialConsumptionStandardSource,
} from './schemas/material-consumption-report.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicMaterialConsumptionLine = {
  id: string;
  boqItemId: string;
  boqCode: string | null;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  baseUnit: MaterialUnit;
  workQuantityCompleted: number;
  coefficient: number;
  standardMaterialRequirement: number;
  wastagePercentage: number;
  allowedWastage: number;
  expectedConsumption: number;
  actualMaterialIssued: number;
  materialReturned: number;
  netActualConsumption: number;
  varianceQuantity: number;
  variancePercentage: number;
  varianceValue: number;
  standardRate: number;
  standardSource: MaterialConsumptionStandardSource;
  alerts: MaterialConsumptionAlert[];
  requiresApproval: boolean;
  explanation: string | null;
  explainedBy: string | null;
  explainedAt: Date | null;
};

export type PublicMaterialConsumptionReport = {
  id: string;
  reportNumber: string;
  projectId: string;
  periodFrom: Date | null;
  periodTo: Date | null;
  asOfDate: Date;
  lines: PublicMaterialConsumptionLine[];
  status: MaterialConsumptionReportStatus;
  requiresApproval: boolean;
  notes: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  approvalComment: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type LineLike = {
  _id?: Types.ObjectId | string;
  boqItemId: Types.ObjectId | string;
  boqCode?: string | null;
  materialId: Types.ObjectId | string;
  materialCode?: string | null;
  materialName?: string | null;
  baseUnit: MaterialUnit;
  workQuantityCompleted: number;
  coefficient: number;
  standardMaterialRequirement: number;
  wastagePercentage: number;
  allowedWastage: number;
  expectedConsumption: number;
  actualMaterialIssued: number;
  materialReturned: number;
  netActualConsumption: number;
  varianceQuantity: number;
  variancePercentage: number;
  varianceValue: number;
  standardRate: number;
  standardSource: MaterialConsumptionStandardSource;
  alerts?: MaterialConsumptionAlert[];
  requiresApproval?: boolean;
  explanation?: string | null;
  explainedBy?: Types.ObjectId | string | null;
  explainedAt?: Date | null;
};

type ReportLike = {
  _id: Types.ObjectId | string;
  reportNumber: string;
  projectId: Types.ObjectId | string;
  periodFrom?: Date | null;
  periodTo?: Date | null;
  asOfDate: Date;
  lines: LineLike[];
  status: MaterialConsumptionReportStatus;
  requiresApproval?: boolean;
  notes?: string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  approvalComment?: string | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicMaterialConsumptionLine(
  line: LineLike,
): PublicMaterialConsumptionLine {
  return {
    id: line._id ? String(line._id) : '',
    boqItemId: String(line.boqItemId),
    boqCode: line.boqCode ?? null,
    materialId: String(line.materialId),
    materialCode: line.materialCode ?? null,
    materialName: line.materialName ?? null,
    baseUnit: line.baseUnit,
    workQuantityCompleted: line.workQuantityCompleted,
    coefficient: line.coefficient,
    standardMaterialRequirement: line.standardMaterialRequirement,
    wastagePercentage: line.wastagePercentage,
    allowedWastage: line.allowedWastage,
    expectedConsumption: line.expectedConsumption,
    actualMaterialIssued: line.actualMaterialIssued,
    materialReturned: line.materialReturned,
    netActualConsumption: line.netActualConsumption,
    varianceQuantity: line.varianceQuantity,
    variancePercentage: line.variancePercentage,
    varianceValue: line.varianceValue,
    standardRate: line.standardRate,
    standardSource: line.standardSource,
    alerts: line.alerts ?? [],
    requiresApproval: line.requiresApproval ?? false,
    explanation: line.explanation ?? null,
    explainedBy: oid(line.explainedBy),
    explainedAt: line.explainedAt ?? null,
  };
}

export function toPublicMaterialConsumptionReport(
  row: ReportLike,
): PublicMaterialConsumptionReport {
  return {
    id: String(row._id),
    reportNumber: row.reportNumber,
    projectId: String(row.projectId),
    periodFrom: row.periodFrom ?? null,
    periodTo: row.periodTo ?? null,
    asOfDate: row.asOfDate,
    lines: (row.lines ?? []).map(toPublicMaterialConsumptionLine),
    status: row.status,
    requiresApproval: row.requiresApproval ?? false,
    notes: row.notes ?? null,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    approvalComment: row.approvalComment ?? null,
    cancelledBy: oid(row.cancelledBy),
    cancelledAt: row.cancelledAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
