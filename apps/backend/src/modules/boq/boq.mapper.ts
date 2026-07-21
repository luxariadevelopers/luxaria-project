import type { Types } from 'mongoose';
import type {
  BoqHierarchyStatus,
  BoqItemStatus,
  BoqUnit,
  BoqVersionStatus,
  BoqVersionType,
} from './schemas/boq.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicBoqBlock = {
  id: string;
  projectId: string;
  blockCode: string;
  name: string;
  sortOrder: number;
  status: BoqHierarchyStatus;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
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
  createdAt?: Date;
  updatedAt?: Date;
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
  createdAt?: Date;
  updatedAt?: Date;
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
  /** Certified executed quantity from work measurements. */
  progressQuantity: number;
  /** progressQuantity / plannedQuantity × 100 (0 when planned is 0). */
  progressPercent: number;
  materialCost: number;
  labourCost: number;
  subcontractCost: number;
  otherCost: number;
  plannedRate: number;
  plannedValue: number;
  startDate: Date | null;
  endDate: Date | null;
  materialCoefficients: PublicBoqMaterialCoefficient[];
  status: BoqItemStatus;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type BlockLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  blockCode: string;
  name: string;
  sortOrder?: number;
  status: BoqHierarchyStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type FloorLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  blockId: Types.ObjectId | string;
  floorCode: string;
  name: string;
  level?: number;
  sortOrder?: number;
  status: BoqHierarchyStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type CategoryLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  blockId: Types.ObjectId | string;
  floorId: Types.ObjectId | string;
  categoryCode: string;
  name: string;
  sortOrder?: number;
  status: BoqHierarchyStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type ItemLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  versionId: Types.ObjectId | string;
  blockId: Types.ObjectId | string;
  floorId: Types.ObjectId | string;
  workCategoryId: Types.ObjectId | string;
  boqCode: string;
  description: string;
  unit: BoqUnit;
  plannedQuantity: number;
  progressQuantity?: number;
  materialCost?: number;
  labourCost?: number;
  subcontractCost?: number;
  otherCost?: number;
  plannedRate: number;
  plannedValue: number;
  startDate?: Date | null;
  endDate?: Date | null;
  materialCoefficients?: Array<{
    _id?: Types.ObjectId | string;
    materialId?: Types.ObjectId | string | null;
    materialCode?: string | null;
    description?: string | null;
    coefficient: number;
    unit?: BoqUnit | null;
  }>;
  status: BoqItemStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function progressPercentOf(planned: number, progress: number): number {
  if (!planned || planned <= 0) return 0;
  return Math.round((progress / planned) * 10000) / 100;
}

export function toPublicBoqBlock(row: BlockLike): PublicBoqBlock {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    blockCode: row.blockCode,
    name: row.name,
    sortOrder: row.sortOrder ?? 0,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicBoqFloor(row: FloorLike): PublicBoqFloor {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    blockId: String(row.blockId),
    floorCode: row.floorCode,
    name: row.name,
    level: row.level ?? 0,
    sortOrder: row.sortOrder ?? 0,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicBoqWorkCategory(
  row: CategoryLike,
): PublicBoqWorkCategory {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    blockId: String(row.blockId),
    floorId: String(row.floorId),
    categoryCode: row.categoryCode,
    name: row.name,
    sortOrder: row.sortOrder ?? 0,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicBoqItem(row: ItemLike): PublicBoqItem {
  const progressQuantity = row.progressQuantity ?? 0;
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    versionId: String(row.versionId),
    blockId: String(row.blockId),
    floorId: String(row.floorId),
    workCategoryId: String(row.workCategoryId),
    boqCode: row.boqCode,
    description: row.description,
    unit: row.unit,
    plannedQuantity: row.plannedQuantity,
    progressQuantity,
    progressPercent: progressPercentOf(row.plannedQuantity, progressQuantity),
    materialCost: row.materialCost ?? 0,
    labourCost: row.labourCost ?? 0,
    subcontractCost: row.subcontractCost ?? 0,
    otherCost: row.otherCost ?? 0,
    plannedRate: row.plannedRate,
    plannedValue: row.plannedValue,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    materialCoefficients: (row.materialCoefficients ?? []).map((c) => ({
      id: c._id ? String(c._id) : '',
      materialId: oid(c.materialId),
      materialCode: c.materialCode ?? null,
      description: c.description ?? null,
      coefficient: c.coefficient,
      unit: c.unit ?? null,
    })),
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}


export type PublicBoqVersion = {
  id: string;
  projectId: string;
  versionNumber: number;
  versionType: BoqVersionType;
  effectiveDate: Date;
  reason: string;
  costImpact: number;
  timeImpact: number;
  approvalReference: string | null;
  status: BoqVersionStatus;
  basedOnVersionId: string | null;
  totalPlannedValue: number;
  submittedBy: string | null;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type VersionLike = {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  versionNumber: number;
  versionType: BoqVersionType;
  effectiveDate: Date;
  reason: string;
  costImpact?: number;
  timeImpact?: number;
  approvalReference?: string | null;
  status: BoqVersionStatus;
  basedOnVersionId?: Types.ObjectId | string | null;
  totalPlannedValue?: number;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  rejectedBy?: Types.ObjectId | string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicBoqVersion(row: VersionLike): PublicBoqVersion {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    versionNumber: row.versionNumber,
    versionType: row.versionType,
    effectiveDate: row.effectiveDate,
    reason: row.reason,
    costImpact: row.costImpact ?? 0,
    timeImpact: row.timeImpact ?? 0,
    approvalReference: row.approvalReference ?? null,
    status: row.status,
    basedOnVersionId: oid(row.basedOnVersionId),
    totalPlannedValue: row.totalPlannedValue ?? 0,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
