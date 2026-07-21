/**
 * Mirrors `apps/backend/src/modules/manpower-planning` daily plan shapes.
 */

export const ManpowerPlanSource = {
  Manual: 'manual',
  AgreementDefault: 'agreement_default',
  Copied: 'copied',
} as const;

export type ManpowerPlanSource =
  (typeof ManpowerPlanSource)[keyof typeof ManpowerPlanSource];

export type PublicManpowerPlanSkillLine = {
  id: string;
  labourCategoryId: string | null;
  skill: string;
  plannedHeadcount: number;
  isCritical: boolean;
};

export type PublicManpowerDailyPlan = {
  id: string;
  planNumber: string;
  projectId: string;
  contractorId: string;
  agreementId: string | null;
  planDate: string;
  plannedHeadcount: number;
  skillMix: PublicManpowerPlanSkillLine[];
  source: ManpowerPlanSource;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListManpowerPlansQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  contractorId?: string;
  planDate?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type CreateManpowerDailyPlanInput = {
  projectId: string;
  contractorId: string;
  agreementId?: string | null;
  planDate: string;
  plannedHeadcount?: number;
  skillMix?: Array<{
    labourCategoryId?: string | null;
    skill: string;
    plannedHeadcount: number;
    isCritical?: boolean;
  }>;
  source?: ManpowerPlanSource;
  notes?: string | null;
  useAgreementDefaults?: boolean;
};

export type UpdateManpowerDailyPlanInput = Partial<CreateManpowerDailyPlanInput>;

export type ListPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedManpowerPlans = {
  items: PublicManpowerDailyPlan[];
  meta: ListPaginationMeta | null;
};
