/**
 * Mirrors `apps/backend/src/modules/quality-inspections` public shapes.
 * Nest permissions: `quality.view` | `quality.inspect`
 * (prompt aliases `quality_inspection.*` are not in the catalog).
 */

export const QualityInspectionStatus = {
  Draft: 'draft',
  InProgress: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;

export type QualityInspectionStatus =
  (typeof QualityInspectionStatus)[keyof typeof QualityInspectionStatus];

export const QualityInspectionResult = {
  Accepted: 'accepted',
  PartiallyAccepted: 'partially_accepted',
  Rejected: 'rejected',
  Hold: 'hold',
} as const;

export type QualityInspectionResult =
  (typeof QualityInspectionResult)[keyof typeof QualityInspectionResult];

export type QualityTestParameter = {
  name: string;
  expectedValue: string | null;
  actualValue: string | null;
  unit: string | null;
  passed: boolean | null;
  notes: string | null;
};

export type QualityInspectionLine = {
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
  inspectionDate: string;
  testParameters: QualityTestParameter[];
  items: QualityInspectionLine[];
  samplePhotos: string[];
  testDocuments: string[];
  result: QualityInspectionResult | null;
  remarks: string | null;
  status: QualityInspectionStatus;
  completedBy: string | null;
  completedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  lastInspectionAt: string | null;
  lastInspectionId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CompleteInspectionResult = {
  inspection: PublicQualityInspection;
  vendorQualityScore: PublicVendorQualityScore;
};

export type ListQualityInspectionsQuery = {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  projectId?: string;
  grnId?: string;
  vendorId?: string;
  status?: QualityInspectionStatus;
  result?: QualityInspectionResult;
};

export type PaginatedQualityInspections = {
  items: PublicQualityInspection[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type QualityTestParameterInput = {
  name: string;
  expectedValue?: string | null;
  actualValue?: string | null;
  unit?: string | null;
  passed?: boolean | null;
  notes?: string | null;
};

export type CreateQualityInspectionInput = {
  grnId: string;
  inspectionDate: string;
  testParameters?: QualityTestParameterInput[];
  samplePhotos?: string[];
  testDocuments?: string[];
  remarks?: string | null;
};

export type UpdateQualityInspectionInput = Partial<CreateQualityInspectionInput>;

export type QualityInspectionLineInput = {
  grnLineId: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
};

export type CompleteQualityInspectionInput = {
  result: QualityInspectionResult;
  items?: QualityInspectionLineInput[];
  testParameters?: QualityTestParameterInput[];
  samplePhotos?: string[];
  testDocuments?: string[];
  remarks?: string | null;
};

/** Minimal GRN row for create picker (`GET /goods-receipts`). */
export type InspectableGrnOption = {
  id: string;
  grnNumber: string;
  status: string;
  vendorId: string;
  receivedDate: string | null;
};
