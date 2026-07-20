import type { Types } from 'mongoose';
import type { RateScopeKind } from './labour-categories.validation';
import type {
  LabourCategoryRateStatus,
  LabourCategoryStatus,
  LabourSkillLevel,
} from './schemas/labour-category.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicLabourCategory = {
  id: string;
  categoryCode: string;
  name: string;
  skillLevel: LabourSkillLevel;
  defaultDailyRate: number;
  overtimeRate: number;
  status: LabourCategoryStatus;
  isSystem: boolean;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicLabourCategoryRate = {
  id: string;
  labourCategoryId: string;
  projectId: string | null;
  contractorId: string | null;
  scopeKey: string;
  dailyRate: number;
  overtimeRate: number;
  effectiveDate: Date;
  status: LabourCategoryRateStatus;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicResolvedLabourRate = {
  labourCategoryId: string;
  categoryCode: string;
  name: string;
  skillLevel: LabourSkillLevel;
  dailyRate: number;
  overtimeRate: number;
  source: RateScopeKind;
  rateId: string | null;
  projectId: string | null;
  contractorId: string | null;
  effectiveDate: Date | null;
  asOf: string;
};

export function toPublicLabourCategory(row: {
  _id: Types.ObjectId | string;
  categoryCode: string;
  name: string;
  skillLevel: LabourSkillLevel;
  defaultDailyRate: number;
  overtimeRate: number;
  status: LabourCategoryStatus;
  isSystem?: boolean;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicLabourCategory {
  return {
    id: String(row._id),
    categoryCode: row.categoryCode,
    name: row.name,
    skillLevel: row.skillLevel,
    defaultDailyRate: row.defaultDailyRate,
    overtimeRate: row.overtimeRate,
    status: row.status,
    isSystem: Boolean(row.isSystem),
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicLabourCategoryRate(row: {
  _id: Types.ObjectId | string;
  labourCategoryId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  contractorId?: Types.ObjectId | string | null;
  scopeKey: string;
  dailyRate: number;
  overtimeRate: number;
  effectiveDate: Date;
  status: LabourCategoryRateStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicLabourCategoryRate {
  return {
    id: String(row._id),
    labourCategoryId: String(row.labourCategoryId),
    projectId: oid(row.projectId),
    contractorId: oid(row.contractorId),
    scopeKey: row.scopeKey,
    dailyRate: row.dailyRate,
    overtimeRate: row.overtimeRate,
    effectiveDate: row.effectiveDate,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
