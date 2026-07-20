/**
 * Mirrors `apps/backend/src/modules/labour-categories` public shapes.
 */

export const LabourCategoryStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type LabourCategoryStatus =
  (typeof LabourCategoryStatus)[keyof typeof LabourCategoryStatus];

export const LabourCategoryRateStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type LabourCategoryRateStatus =
  (typeof LabourCategoryRateStatus)[keyof typeof LabourCategoryRateStatus];

export const LabourSkillLevel = {
  Unskilled: 'unskilled',
  SemiSkilled: 'semi_skilled',
  Skilled: 'skilled',
  HighlySkilled: 'highly_skilled',
  Supervisory: 'supervisory',
} as const;

export type LabourSkillLevel =
  (typeof LabourSkillLevel)[keyof typeof LabourSkillLevel];

export const RateScopeKind = {
  ProjectContractor: 'project_contractor',
  Project: 'project',
  Contractor: 'contractor',
  Company: 'company',
} as const;

export type RateScopeKind =
  (typeof RateScopeKind)[keyof typeof RateScopeKind];

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
  createdAt?: string;
  updatedAt?: string;
};

export type PublicLabourCategoryRate = {
  id: string;
  labourCategoryId: string;
  projectId: string | null;
  contractorId: string | null;
  scopeKey: string;
  dailyRate: number;
  overtimeRate: number;
  effectiveDate: string;
  status: LabourCategoryRateStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  effectiveDate: string | null;
  asOf: string;
};

export type CreateLabourCategoryInput = {
  name: string;
  skillLevel: LabourSkillLevel;
  defaultDailyRate: number;
  overtimeRate: number;
  notes?: string | null;
};

export type UpdateLabourCategoryInput = Partial<CreateLabourCategoryInput>;

export type CreateLabourCategoryRateInput = {
  projectId?: string | null;
  contractorId?: string | null;
  dailyRate: number;
  overtimeRate: number;
  effectiveDate: string;
  notes?: string | null;
};

export type UpdateLabourCategoryRateInput = {
  dailyRate?: number;
  overtimeRate?: number;
  effectiveDate?: string;
  notes?: string | null;
  status?: LabourCategoryRateStatus;
};

export type ListLabourCategoriesQuery = {
  page?: number;
  limit?: number;
  status?: LabourCategoryStatus;
  skillLevel?: LabourSkillLevel;
  search?: string;
};

export type ListLabourCategoryRatesQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  contractorId?: string;
  status?: LabourCategoryRateStatus;
};

export type ResolveLabourCategoryRateQuery = {
  labourCategoryId: string;
  projectId?: string;
  contractorId?: string;
  asOf?: string;
};

export type SeedStandardResult = {
  created: number;
  skipped: number;
  total: number;
};

export type ListPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedLabourCategories = {
  items: PublicLabourCategory[];
  meta: ListPaginationMeta | null;
};

export type PaginatedLabourCategoryRates = {
  items: PublicLabourCategoryRate[];
  meta: ListPaginationMeta | null;
};
