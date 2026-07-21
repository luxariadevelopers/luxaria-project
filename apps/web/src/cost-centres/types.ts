/** Mirrors Nest `apps/backend/src/modules/cost-centres`. */

export const CostCentreKind = {
  CostCentre: 'cost_centre',
  ProfitCentre: 'profit_centre',
} as const;

export type CostCentreKind =
  (typeof CostCentreKind)[keyof typeof CostCentreKind];

export const CostCentreStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type CostCentreStatus =
  (typeof CostCentreStatus)[keyof typeof CostCentreStatus];

export type PublicCostCentre = {
  id: string;
  code: string;
  name: string;
  kind: CostCentreKind;
  companyId: string | null;
  projectId: string | null;
  parentId: string | null;
  status: CostCentreStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CostCentreListRow = Pick<
  PublicCostCentre,
  | 'id'
  | 'code'
  | 'name'
  | 'kind'
  | 'projectId'
  | 'status'
  | 'createdAt'
>;

export type ListCostCentresQuery = {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  projectId?: string;
  kind?: CostCentreKind;
  status?: CostCentreStatus;
};

export type PaginatedCostCentres = {
  items: CostCentreListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
