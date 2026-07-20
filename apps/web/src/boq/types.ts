/**
 * Mirrors Nest `apps/backend/src/modules/boq` public shapes.
 * Status / unit values from status-enum + BoqUnit inventories.
 */

export const BoqUnit = {
  Number: 'number',
  Bag: 'bag',
  Kilogram: 'kilogram',
  Ton: 'ton',
  Litre: 'litre',
  Metre: 'metre',
  SquareFoot: 'square_foot',
  CubicFoot: 'cubic_foot',
  SquareMetre: 'square_metre',
  CubicMetre: 'cubic_metre',
  RunningMetre: 'running_metre',
  Load: 'load',
  Box: 'box',
  Job: 'job',
  Day: 'day',
  LumpSum: 'lump_sum',
} as const;

export type BoqUnit = (typeof BoqUnit)[keyof typeof BoqUnit];

export const BoqItemStatus = {
  Draft: 'draft',
  Active: 'active',
  OnHold: 'on_hold',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;

export type BoqItemStatus =
  (typeof BoqItemStatus)[keyof typeof BoqItemStatus];

export const BoqHierarchyStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type BoqHierarchyStatus =
  (typeof BoqHierarchyStatus)[keyof typeof BoqHierarchyStatus];

export const BoqVersionType = {
  Original: 'original',
  Revision: 'revision',
  Variation: 'variation',
  ChangeOrder: 'change_order',
} as const;

export type BoqVersionType =
  (typeof BoqVersionType)[keyof typeof BoqVersionType];

export const BoqVersionStatus = {
  Draft: 'draft',
  PendingApproval: 'pending_approval',
  Active: 'active',
  Superseded: 'superseded',
  Rejected: 'rejected',
} as const;

export type BoqVersionStatus =
  (typeof BoqVersionStatus)[keyof typeof BoqVersionStatus];

export type PublicBoqBlock = {
  id: string;
  projectId: string;
  blockCode: string;
  name: string;
  sortOrder: number;
  status: BoqHierarchyStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicBoqFloor = {
  id: string;
  projectId: string;
  blockId: string;
  floorCode: string;
  name: string;
  level: number;
  sortOrder: number;
  status: BoqHierarchyStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicBoqWorkCategory = {
  id: string;
  projectId: string;
  blockId: string;
  floorId: string;
  categoryCode: string;
  name: string;
  sortOrder: number;
  status: BoqHierarchyStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicBoqMaterialCoefficient = {
  id: string;
  materialId: string | null;
  materialCode: string | null;
  description: string | null;
  coefficient: number;
  unit: BoqUnit | null;
};

export type PublicBoqItem = {
  id: string;
  projectId: string;
  versionId: string;
  blockId: string;
  floorId: string;
  workCategoryId: string;
  boqCode: string;
  description: string;
  unit: BoqUnit;
  plannedQuantity: number;
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
  plannedRate: number;
  plannedValue: number;
  startDate: string | null;
  endDate: string | null;
  materialCoefficients: PublicBoqMaterialCoefficient[];
  status: BoqItemStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicBoqVersion = {
  id: string;
  projectId: string;
  versionNumber: number;
  versionType: BoqVersionType;
  effectiveDate: string;
  reason: string;
  costImpact: number;
  timeImpact: number;
  approvalReference: string | null;
  status: BoqVersionStatus;
  basedOnVersionId: string | null;
  totalPlannedValue: number;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Nest `GET …/hierarchy` tree node. */
export type BoqHierarchyCategory = PublicBoqWorkCategory & {
  items: PublicBoqItem[];
};

export type BoqHierarchyFloor = PublicBoqFloor & {
  workCategories: BoqHierarchyCategory[];
};

export type BoqHierarchyBlock = PublicBoqBlock & {
  floors: BoqHierarchyFloor[];
};

/** Alias used by item editor / manage flows. */
export type BoqHierarchyBlockNode = BoqHierarchyBlock;

/**
 * Nest `POST …/validate-totals` project rollup.
 * Named distinctly from `calculations.BoqTotalsValidation` (per-item).
 */
export type BoqProjectTotalsResult = {
  valid: boolean;
  totals: {
    itemCount: number;
    plannedQuantity: number;
    materialCost: number;
    labourCost: number;
    subcontractCost: number;
    otherCost: number;
    plannedValue: number;
  };
  invalidCount: number;
  invalidItems: Array<{
    id: string;
    boqCode: string;
    valid: boolean;
    expectedRate?: number;
    expectedValue?: number;
    message?: string;
  }>;
};

export type BoqImportResult = {
  importedCount: number;
  errorCount: number;
  versionId: string;
  items: PublicBoqItem[];
  errors: Array<{ rowNumber: number; message: string }>;
};

export type BoqFilterState = {
  search: string;
  blockId: string;
  floorId: string;
  workCategoryId: string;
  status: BoqItemStatus | '';
};

/** Tree selection: block / floor / category / item. */
export type BoqTreeSelection =
  | { kind: 'block'; id: string }
  | { kind: 'floor'; id: string }
  | { kind: 'category'; id: string }
  | { kind: 'item'; id: string }
  | null;

export type BoqMaterialCoefficientInput = {
  materialId?: string | null;
  materialCode?: string | null;
  description?: string | null;
  coefficient: number;
  unit?: BoqUnit | null;
};

export type CreateBoqItemInput = {
  versionId?: string;
  workCategoryId: string;
  boqCode?: string;
  description: string;
  unit: BoqUnit;
  plannedQuantity: number;
  materialCost?: number;
  labourCost?: number;
  subcontractCost?: number;
  otherCost?: number;
  plannedRate?: number;
  plannedValue?: number;
  startDate?: string | null;
  endDate?: string | null;
  materialCoefficients?: BoqMaterialCoefficientInput[];
  status?: BoqItemStatus;
  notes?: string | null;
};

export type UpdateBoqItemInput = {
  description?: string;
  unit?: BoqUnit;
  plannedQuantity?: number;
  materialCost?: number;
  labourCost?: number;
  subcontractCost?: number;
  otherCost?: number;
  plannedRate?: number;
  plannedValue?: number;
  startDate?: string | null;
  endDate?: string | null;
  materialCoefficients?: BoqMaterialCoefficientInput[];
  status?: BoqItemStatus;
  notes?: string | null;
};

export type CreateBoqVersionInput = {
  versionType: BoqVersionType;
  effectiveDate: string;
  reason: string;
  basedOnVersionId?: string;
  costImpact?: number;
  timeImpact?: number;
};

export type UpdateBoqVersionInput = {
  effectiveDate?: string;
  reason?: string;
  costImpact?: number;
  timeImpact?: number;
};

export type ApproveBoqVersionInput = {
  approvalReference: string;
  comment?: string | null;
};

export type RejectBoqVersionInput = {
  reason: string;
};

export type ActivateBoqVersionInput = {
  approvalReference?: string | null;
};

export type BoqCompareLineSnapshot = {
  plannedQuantity: number;
  plannedRate: number;
  plannedValue: number;
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
};

export type BoqCompareAddedItem = {
  boqCode: string;
  description: string;
  plannedQuantity: number;
  plannedRate: number;
  plannedValue: number;
};

export type BoqCompareRemovedItem = BoqCompareAddedItem;

export type BoqCompareChangedItem = {
  boqCode: string;
  description: string;
  from: BoqCompareLineSnapshot;
  to: BoqCompareLineSnapshot;
  deltas: {
    plannedQuantity: number;
    materialCost: number;
    labourCost: number;
    subcontractCost: number;
    otherCost: number;
    plannedRate: number;
    plannedValue: number;
  };
};

export type BoqVersionComparison = {
  fromVersion: PublicBoqVersion;
  toVersion: PublicBoqVersion;
  summary: {
    addedCount: number;
    removedCount: number;
    changedCount: number;
    unchangedCount: number;
    fromTotalPlannedValue: number;
    toTotalPlannedValue: number;
    costImpact: number;
  };
  added: BoqCompareAddedItem[];
  removed: BoqCompareRemovedItem[];
  changed: BoqCompareChangedItem[];
  unchanged?: Array<{ boqCode: string }>;
};
