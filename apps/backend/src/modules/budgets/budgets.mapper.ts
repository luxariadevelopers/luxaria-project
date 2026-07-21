import type { Types } from 'mongoose';
import type { BudgetLine, BudgetStatus } from './schemas/budget.schema';

export type PublicBudgetLine = {
  id: string | null;
  accountId: string;
  costCentreId: string | null;
  periodMonth: number | null;
  amount: number;
  notes: string | null;
};

export type PublicBudget = {
  id: string;
  budgetNumber: string;
  companyId: string;
  projectId: string | null;
  financialYearId: string;
  name: string;
  version: number;
  rootBudgetId: string | null;
  revisedFromId: string | null;
  status: BudgetStatus;
  lines: PublicBudgetLine[];
  totalAmount: number;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

function mapLine(line: BudgetLine & { _id?: Types.ObjectId }): PublicBudgetLine {
  return {
    id: line._id ? String(line._id) : null,
    accountId: String(line.accountId),
    costCentreId: oid(line.costCentreId),
    periodMonth: line.periodMonth ?? null,
    amount: line.amount,
    notes: line.notes ?? null,
  };
}

export function toPublicBudget(row: {
  _id: Types.ObjectId | string;
  budgetNumber: string;
  companyId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  financialYearId: Types.ObjectId | string;
  name: string;
  version: number;
  rootBudgetId?: Types.ObjectId | string | null;
  revisedFromId?: Types.ObjectId | string | null;
  status: BudgetStatus;
  lines?: BudgetLine[];
  totalAmount: number;
  notes?: string | null;
  createdBy?: Types.ObjectId | string | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicBudget {
  return {
    id: String(row._id),
    budgetNumber: row.budgetNumber,
    companyId: String(row.companyId),
    projectId: oid(row.projectId),
    financialYearId: String(row.financialYearId),
    name: row.name,
    version: row.version,
    rootBudgetId: oid(row.rootBudgetId),
    revisedFromId: oid(row.revisedFromId),
    status: row.status,
    lines: (row.lines ?? []).map(mapLine),
    totalAmount: row.totalAmount,
    notes: row.notes ?? null,
    createdBy: oid(row.createdBy),
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
