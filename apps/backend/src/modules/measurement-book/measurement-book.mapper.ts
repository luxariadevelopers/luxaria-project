import type { Types } from 'mongoose';
import type { BoqUnit } from '../boq/schemas/boq.schema';
import type { MeasurementBookStatus } from './schemas/measurement-book-entry.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicMbSiteLocation = {
  siteId: string | null;
  phaseId: string | null;
  blockId: string | null;
  towerId: string | null;
  floorId: string | null;
  locationLabel: string | null;
};

export type PublicMeasurementBookEntry = {
  id: string;
  entryNumber: string;
  revision: number;
  projectId: string;
  contractorId: string;
  boqItemId: string;
  boqCode: string | null;
  workOrderId: string | null;
  workMeasurementId: string | null;
  dprId: string | null;
  drawingId: string | null;
  siteId: string | null;
  location: PublicMbSiteLocation;
  length: number | null;
  breadth: number | null;
  height: number | null;
  numberOfUnits: number;
  calculatedQuantity: number;
  formula: string | null;
  formulaQuantity: number | null;
  quantity: number;
  unit: BoqUnit;
  periodFrom: Date;
  periodTo: Date;
  measurementDate: Date;
  workDescription: string | null;
  sheetReference: string | null;
  notes: string | null;
  photoDocumentIds: string[];
  status: MeasurementBookStatus;
  supersedesId: string | null;
  supersededById: string | null;
  revisionReason: string | null;
  measuredBy: string;
  submittedBy: string | null;
  submittedAt: Date | null;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  certifiedBy: string | null;
  certifiedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type LocLike = {
  siteId?: Types.ObjectId | string | null;
  phaseId?: Types.ObjectId | string | null;
  blockId?: Types.ObjectId | string | null;
  towerId?: Types.ObjectId | string | null;
  floorId?: Types.ObjectId | string | null;
  locationLabel?: string | null;
};

type EntryLike = {
  _id: Types.ObjectId | string;
  entryNumber: string;
  revision: number;
  projectId: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  boqItemId: Types.ObjectId | string;
  boqCode?: string | null;
  workOrderId?: Types.ObjectId | string | null;
  workMeasurementId?: Types.ObjectId | string | null;
  dprId?: Types.ObjectId | string | null;
  drawingId?: Types.ObjectId | string | null;
  siteId?: Types.ObjectId | string | null;
  location: LocLike;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  numberOfUnits: number;
  calculatedQuantity: number;
  formula?: string | null;
  formulaQuantity?: number | null;
  quantity: number;
  unit: BoqUnit;
  periodFrom: Date;
  periodTo: Date;
  measurementDate: Date;
  workDescription?: string | null;
  sheetReference?: string | null;
  notes?: string | null;
  photoDocumentIds?: Array<Types.ObjectId | string>;
  status: MeasurementBookStatus;
  supersedesId?: Types.ObjectId | string | null;
  supersededById?: Types.ObjectId | string | null;
  revisionReason?: string | null;
  measuredBy: Types.ObjectId | string;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  acknowledgedBy?: Types.ObjectId | string | null;
  acknowledgedAt?: Date | null;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  certifiedBy?: Types.ObjectId | string | null;
  certifiedAt?: Date | null;
  rejectedBy?: Types.ObjectId | string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicMeasurementBookEntry(
  row: EntryLike,
): PublicMeasurementBookEntry {
  const loc = row.location ?? {};
  return {
    id: String(row._id),
    entryNumber: row.entryNumber,
    revision: row.revision,
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    boqItemId: String(row.boqItemId),
    boqCode: row.boqCode ?? null,
    workOrderId: oid(row.workOrderId),
    workMeasurementId: oid(row.workMeasurementId),
    dprId: oid(row.dprId),
    drawingId: oid(row.drawingId),
    siteId: oid(row.siteId),
    location: {
      siteId: oid(loc.siteId),
      phaseId: oid(loc.phaseId),
      towerId: oid(loc.towerId),
      blockId: oid(loc.blockId),
      floorId: oid(loc.floorId),
      locationLabel: loc.locationLabel ?? null,
    },
    length: row.length ?? null,
    breadth: row.breadth ?? null,
    height: row.height ?? null,
    numberOfUnits: row.numberOfUnits,
    calculatedQuantity: row.calculatedQuantity,
    formula: row.formula ?? null,
    formulaQuantity: row.formulaQuantity ?? null,
    quantity: row.quantity,
    unit: row.unit,
    periodFrom: row.periodFrom,
    periodTo: row.periodTo,
    measurementDate: row.measurementDate,
    workDescription: row.workDescription ?? null,
    sheetReference: row.sheetReference ?? null,
    notes: row.notes ?? null,
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    status: row.status,
    supersedesId: oid(row.supersedesId),
    supersededById: oid(row.supersededById),
    revisionReason: row.revisionReason ?? null,
    measuredBy: String(row.measuredBy),
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    acknowledgedBy: oid(row.acknowledgedBy),
    acknowledgedAt: row.acknowledgedAt ?? null,
    verifiedBy: oid(row.verifiedBy),
    verifiedAt: row.verifiedAt ?? null,
    certifiedBy: oid(row.certifiedBy),
    certifiedAt: row.certifiedAt ?? null,
    rejectedBy: oid(row.rejectedBy),
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
