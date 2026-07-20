import type { Types } from 'mongoose';
import type {
  QualityInspectionResult,
  QualityInspectionStatus,
} from './schemas/quality-inspection.schema';

export type PublicQualityTestParameter = {
  name: string;
  expectedValue: string | null;
  actualValue: string | null;
  unit: string | null;
  passed: boolean | null;
  notes: string | null;
};

export type PublicQualityInspectionLine = {
  id: string;
  grnLineId: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  receivedQuantity: number;
  acceptedQuantity: number | null;
  rejectedQuantity: number | null;
  rejectionReason: string | null;
};

export type PublicQualityInspection = {
  id: string;
  inspectionNumber: string;
  grnId: string;
  projectId: string;
  vendorId: string;
  inspector: string;
  inspectionDate: Date;
  testParameters: PublicQualityTestParameter[];
  items: PublicQualityInspectionLine[];
  samplePhotos: string[];
  testDocuments: string[];
  result: QualityInspectionResult | null;
  remarks: string | null;
  status: QualityInspectionStatus;
  completedBy: string | null;
  completedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicVendorQualityScore = {
  id: string;
  vendorId: string;
  inspectionsCount: number;
  acceptedCount: number;
  partiallyAcceptedCount: number;
  rejectedCount: number;
  holdCount: number;
  score: number;
  ratingEquivalent: number;
  lastInspectionAt: Date | null;
  lastInspectionId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type InspectionLike = {
  _id: Types.ObjectId | string;
  inspectionNumber: string;
  grnId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  inspector: Types.ObjectId | string;
  inspectionDate: Date;
  testParameters?: Array<{
    name: string;
    expectedValue?: string | null;
    actualValue?: string | null;
    unit?: string | null;
    passed?: boolean | null;
    notes?: string | null;
  }>;
  items?: Array<{
    _id?: Types.ObjectId | string;
    grnLineId: Types.ObjectId | string;
    materialId: Types.ObjectId | string;
    materialCode?: string | null;
    materialName?: string | null;
    receivedQuantity: number;
    acceptedQuantity?: number | null;
    rejectedQuantity?: number | null;
    rejectionReason?: string | null;
  }>;
  samplePhotos?: string[];
  testDocuments?: string[];
  result?: QualityInspectionResult | null;
  remarks?: string | null;
  status: QualityInspectionStatus;
  completedBy?: Types.ObjectId | string | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type ScoreLike = {
  _id: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  inspectionsCount: number;
  acceptedCount: number;
  partiallyAcceptedCount: number;
  rejectedCount: number;
  holdCount: number;
  score: number;
  ratingEquivalent: number;
  lastInspectionAt?: Date | null;
  lastInspectionId?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicQualityInspection(
  row: InspectionLike,
): PublicQualityInspection {
  return {
    id: String(row._id),
    inspectionNumber: row.inspectionNumber,
    grnId: String(row.grnId),
    projectId: String(row.projectId),
    vendorId: String(row.vendorId),
    inspector: String(row.inspector),
    inspectionDate: row.inspectionDate,
    testParameters: (row.testParameters ?? []).map((p) => ({
      name: p.name,
      expectedValue: p.expectedValue ?? null,
      actualValue: p.actualValue ?? null,
      unit: p.unit ?? null,
      passed: p.passed ?? null,
      notes: p.notes ?? null,
    })),
    items: (row.items ?? []).map((item) => ({
      id: String(item._id ?? ''),
      grnLineId: String(item.grnLineId),
      materialId: String(item.materialId),
      materialCode: item.materialCode ?? null,
      materialName: item.materialName ?? null,
      receivedQuantity: item.receivedQuantity,
      acceptedQuantity: item.acceptedQuantity ?? null,
      rejectedQuantity: item.rejectedQuantity ?? null,
      rejectionReason: item.rejectionReason ?? null,
    })),
    samplePhotos: row.samplePhotos ?? [],
    testDocuments: row.testDocuments ?? [],
    result: row.result ?? null,
    remarks: row.remarks ?? null,
    status: row.status,
    completedBy: row.completedBy ? String(row.completedBy) : null,
    completedAt: row.completedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicVendorQualityScore(
  row: ScoreLike,
): PublicVendorQualityScore {
  return {
    id: String(row._id),
    vendorId: String(row.vendorId),
    inspectionsCount: row.inspectionsCount,
    acceptedCount: row.acceptedCount,
    partiallyAcceptedCount: row.partiallyAcceptedCount,
    rejectedCount: row.rejectedCount,
    holdCount: row.holdCount,
    score: row.score,
    ratingEquivalent: row.ratingEquivalent,
    lastInspectionAt: row.lastInspectionAt ?? null,
    lastInspectionId: row.lastInspectionId
      ? String(row.lastInspectionId)
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
