import type { Types } from 'mongoose';
import type { BoqUnit } from '../boq/schemas/boq.schema';
import type { WorkMeasurementStatus } from './schemas/work-measurement.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

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
  measurementDate: Date;
  previousQuantity: number;
  currentQuantity: number;
  cumulativeQuantity: number;
  unit: BoqUnit;
  measuredBy: string;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  certifiedBy: string | null;
  certifiedAt: Date | null;
  photos: string[];
  drawingReference: string | null;
  drawingId: string | null;
  status: WorkMeasurementStatus;
  submittedBy: string | null;
  submittedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  boqPlannedQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
};

type Measurable = {
  _id: Types.ObjectId;
  measurementNumber: string;
  projectId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  dprId?: Types.ObjectId | null;
  contractorId: Types.ObjectId;
  boqItemId: Types.ObjectId;
  boqCode?: string | null;
  location: string;
  sheetReference?: string | null;
  workDescription?: string | null;
  measurementDate: Date;
  previousQuantity: number;
  currentQuantity: number;
  cumulativeQuantity: number;
  unit: BoqUnit;
  measuredBy: Types.ObjectId;
  verifiedBy?: Types.ObjectId | null;
  verifiedAt?: Date | null;
  certifiedBy?: Types.ObjectId | null;
  certifiedAt?: Date | null;
  photoDocumentIds?: Types.ObjectId[];
  drawingReference?: string | null;
  drawingId?: Types.ObjectId | null;
  status: WorkMeasurementStatus;
  submittedBy?: Types.ObjectId | null;
  submittedAt?: Date | null;
  rejectedBy?: Types.ObjectId | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  notes?: string | null;
  boqPlannedQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicWorkMeasurement(
  row: Measurable,
): PublicWorkMeasurement {
  return {
    id: String(row._id),
    measurementNumber: row.measurementNumber,
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    dprId: oid(row.dprId),
    contractorId: String(row.contractorId),
    boqItemId: String(row.boqItemId),
    boqCode: row.boqCode ?? null,
    location: row.location,
    sheetReference: row.sheetReference ?? null,
    workDescription: row.workDescription ?? null,
    measurementDate: row.measurementDate,
    previousQuantity: row.previousQuantity,
    currentQuantity: row.currentQuantity,
    cumulativeQuantity: row.cumulativeQuantity,
    unit: row.unit,
    measuredBy: String(row.measuredBy),
    verifiedBy: oid(row.verifiedBy),
    verifiedAt: row.verifiedAt ?? null,
    certifiedBy: oid(row.certifiedBy),
    certifiedAt: row.certifiedAt ?? null,
    photos: (row.photoDocumentIds ?? []).map((id) => String(id)),
    drawingReference: row.drawingReference ?? null,
    drawingId: oid(row.drawingId),
    status: row.status,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    notes: row.notes ?? null,
    boqPlannedQuantity: row.boqPlannedQuantity,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
