import type { Types } from 'mongoose';
import type {
  PettyCashExpenseCategory,
  PettyCashRequirementStatus,
} from './schemas/petty-cash-requirement.schema';

export type PublicRequirementItem = {
  id: string;
  expenseCategory: PettyCashExpenseCategory;
  description: string;
  estimatedAmount: number;
};

export type PublicPettyCashRequirement = {
  id: string;
  requestNumber: string;
  projectId: string;
  pettyCashAccountId: string;
  requestedBy: string;
  weekStartDate: Date;
  weekEndDate: Date;
  currentCashBalance: number;
  previousUnsettledAmount: number;
  warnings: string[];
  requestedAmount: number;
  approvedAmount: number | null;
  fundedAmount: number | null;
  requirementItems: PublicRequirementItem[];
  justification: string;
  status: PettyCashRequirementStatus;
  approvalRequestId: string | null;
  projectManagerReviewedBy: string | null;
  projectManagerReviewedAt: Date | null;
  financeReviewedBy: string | null;
  financeReviewedAt: Date | null;
  fundedBy: string | null;
  fundedAt: Date | null;
  closedBy: string | null;
  closedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicRequirement(row: {
  _id: Types.ObjectId | string;
  requestNumber: string;
  projectId: Types.ObjectId | string;
  pettyCashAccountId: Types.ObjectId | string;
  requestedBy: Types.ObjectId | string;
  weekStartDate: Date;
  weekEndDate: Date;
  currentCashBalance: number;
  previousUnsettledAmount?: number;
  warnings?: string[];
  requestedAmount: number;
  approvedAmount?: number | null;
  fundedAmount?: number | null;
  requirementItems?: Array<{
    _id?: Types.ObjectId | string;
    expenseCategory: PettyCashExpenseCategory;
    description: string;
    estimatedAmount: number;
  }>;
  justification: string;
  status: PettyCashRequirementStatus;
  approvalRequestId?: Types.ObjectId | string | null;
  projectManagerReviewedBy?: Types.ObjectId | string | null;
  projectManagerReviewedAt?: Date | null;
  financeReviewedBy?: Types.ObjectId | string | null;
  financeReviewedAt?: Date | null;
  fundedBy?: Types.ObjectId | string | null;
  fundedAt?: Date | null;
  closedBy?: Types.ObjectId | string | null;
  closedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicPettyCashRequirement {
  return {
    id: String(row._id),
    requestNumber: row.requestNumber,
    projectId: String(row.projectId),
    pettyCashAccountId: String(row.pettyCashAccountId),
    requestedBy: String(row.requestedBy),
    weekStartDate: row.weekStartDate,
    weekEndDate: row.weekEndDate,
    currentCashBalance: row.currentCashBalance,
    previousUnsettledAmount: row.previousUnsettledAmount ?? 0,
    warnings: row.warnings ?? [],
    requestedAmount: row.requestedAmount,
    approvedAmount: row.approvedAmount ?? null,
    fundedAmount: row.fundedAmount ?? null,
    requirementItems: (row.requirementItems ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      expenseCategory: item.expenseCategory,
      description: item.description,
      estimatedAmount: item.estimatedAmount,
    })),
    justification: row.justification,
    status: row.status,
    approvalRequestId: oid(row.approvalRequestId),
    projectManagerReviewedBy: oid(row.projectManagerReviewedBy),
    projectManagerReviewedAt: row.projectManagerReviewedAt ?? null,
    financeReviewedBy: oid(row.financeReviewedBy),
    financeReviewedAt: row.financeReviewedAt ?? null,
    fundedBy: oid(row.fundedBy),
    fundedAt: row.fundedAt ?? null,
    closedBy: oid(row.closedBy),
    closedAt: row.closedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
