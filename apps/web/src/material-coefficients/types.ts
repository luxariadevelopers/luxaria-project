import type { BoqUnit } from './units';

/** Nest `MaterialConsumptionStandardStatus`. */
export const MaterialCoefficientStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Active: 'active',
  Superseded: 'superseded',
  Rejected: 'rejected',
} as const;

export type MaterialCoefficientStatus =
  (typeof MaterialCoefficientStatus)[keyof typeof MaterialCoefficientStatus];

export type PublicMaterialCoefficient = {
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
  effectiveDate: string;
  version: number;
  status: MaterialCoefficientStatus;
  basedOnStandardId: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  approvalReference: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListMaterialCoefficientsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  globalOnly?: boolean;
  boqItemId?: string;
  workType?: string;
  materialId?: string;
  outputUnit?: BoqUnit;
  status?: MaterialCoefficientStatus;
};

export type PaginatedMaterialCoefficients = {
  items: PublicMaterialCoefficient[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type CreateMaterialCoefficientInput = {
  projectId?: string | null;
  boqItemId?: string | null;
  workType?: string | null;
  outputUnit: BoqUnit;
  materialId: string;
  quantityPerUnit: number;
  wastagePercentage: number;
  effectiveDate: string;
  notes?: string | null;
  overridesStandardId?: string | null;
};

export type UpdateMaterialCoefficientInput = Partial<CreateMaterialCoefficientInput>;

export type ApproveMaterialCoefficientInput = {
  approvalReference: string;
  notes?: string | null;
};

export type RejectMaterialCoefficientInput = {
  reason: string;
};

export type ResolveMaterialCoefficientQuery = {
  projectId?: string;
  boqItemId?: string;
  workType?: string;
  materialId: string;
  outputUnit: BoqUnit;
  asOf?: string;
};

export type MaterialScopeMode = 'global' | 'project';
