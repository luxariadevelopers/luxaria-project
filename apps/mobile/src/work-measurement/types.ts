/**
 * Mirrors Nest `PublicWorkMeasurement` /
 * `apps/backend/src/modules/work-measurements/work-measurement.mapper.ts`.
 */

export const WorkMeasurementStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Verified: 'verified',
  Certified: 'certified',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;

export type WorkMeasurementStatus =
  (typeof WorkMeasurementStatus)[keyof typeof WorkMeasurementStatus];

export type PublicWorkMeasurement = {
  id: string;
  measurementNumber: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  contractorId: string;
  boqItemId: string;
  boqCode: string | null;
  location: string;
  sheetReference: string | null;
  workDescription: string | null;
  measurementDate: string;
  previousQuantity: number;
  currentQuantity: number;
  cumulativeQuantity: number;
  unit: string;
  measuredBy: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  certifiedBy: string | null;
  certifiedAt: string | null;
  photos: string[];
  drawingReference: string | null;
  drawingId: string | null;
  status: WorkMeasurementStatus;
  submittedBy: string | null;
  submittedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  boqPlannedQuantity: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateWorkMeasurementInput = {
  projectId: string;
  siteId?: string | null;
  dprId?: string | null;
  contractorId: string;
  boqItemId: string;
  location: string;
  sheetReference?: string | null;
  workDescription?: string | null;
  measurementDate: string;
  currentQuantity: number;
  measuredBy?: string;
  photoDocumentIds?: string[];
  attachments?: Record<string, string>;
  drawingReference?: string | null;
  drawingId?: string | null;
  notes?: string | null;
  submit?: boolean;
};

export type ListWorkMeasurementsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  siteId?: string;
  dprId?: string;
  contractorId?: string;
  boqItemId?: string;
  status?: WorkMeasurementStatus;
  fromDate?: string;
  toDate?: string;
};

export type PaginatedWorkMeasurements = {
  items: PublicWorkMeasurement[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

/** BOQ picker — `GET /boq/projects/:projectId/items` (`boq.view`). */
export type WorkMeasurementBoqItemOption = {
  id: string;
  boqCode: string;
  description: string;
  status: string;
  plannedQuantity: number;
  progressQuantity?: number;
  unit: string;
};

/** Contractor picker — `GET /contractors` (`contractor.view`). */
export type WorkMeasurementContractorOption = {
  id: string;
  contractorCode: string;
  legalName: string;
  status: string;
};
