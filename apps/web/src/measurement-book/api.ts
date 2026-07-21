import { apiGet, apiPatch, apiPost } from '@/api/client';
import type { BoqUnit } from '@/boq/types';

export type MeasurementBookStatus =
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'verified'
  | 'certified'
  | 'rejected'
  | 'superseded'
  | 'cancelled';

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
  periodFrom: string;
  periodTo: string;
  measurementDate: string;
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
  submittedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  certifiedBy: string | null;
  certifiedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListMeasurementBookQuery = {
  projectId?: string;
  siteId?: string;
  contractorId?: string;
  boqItemId?: string;
  workOrderId?: string;
  workMeasurementId?: string;
  dprId?: string;
  status?: MeasurementBookStatus;
  fromDate?: string;
  toDate?: string;
  periodFrom?: string;
  periodTo?: string;
  page?: number;
  limit?: number;
};

export type CreateMeasurementBookInput = {
  projectId: string;
  contractorId: string;
  boqItemId: string;
  workOrderId?: string | null;
  workMeasurementId?: string | null;
  dprId?: string | null;
  drawingId?: string | null;
  location: {
    siteId?: string | null;
    phaseId?: string | null;
    blockId?: string | null;
    towerId?: string | null;
    floorId?: string | null;
    locationLabel?: string | null;
  };
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  numberOfUnits?: number;
  formula?: string | null;
  formulaQuantity?: number | null;
  quantity?: number | null;
  unit?: BoqUnit;
  periodFrom: string;
  periodTo: string;
  measurementDate: string;
  workDescription?: string | null;
  sheetReference?: string | null;
  notes?: string | null;
  photoDocumentIds?: string[];
  measuredBy?: string;
};

export type ReviseMeasurementBookInput = {
  reason: string;
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  numberOfUnits?: number;
  formula?: string | null;
  formulaQuantity?: number | null;
  quantity?: number | null;
  workDescription?: string | null;
  notes?: string | null;
  photoDocumentIds?: string[];
};

const BASE = '/measurement-book';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(row: PublicMeasurementBookEntry): PublicMeasurementBookEntry {
  return {
    ...row,
    id: String(row.id),
    projectId: String(row.projectId),
    contractorId: String(row.contractorId),
    boqItemId: String(row.boqItemId),
    workOrderId: row.workOrderId == null ? null : String(row.workOrderId),
    workMeasurementId:
      row.workMeasurementId == null ? null : String(row.workMeasurementId),
    dprId: row.dprId == null ? null : String(row.dprId),
    drawingId: row.drawingId == null ? null : String(row.drawingId),
    siteId: row.siteId == null ? null : String(row.siteId),
    location: {
      siteId: row.location?.siteId == null ? null : String(row.location.siteId),
      phaseId:
        row.location?.phaseId == null ? null : String(row.location.phaseId),
      blockId:
        row.location?.blockId == null ? null : String(row.location.blockId),
      towerId:
        row.location?.towerId == null ? null : String(row.location.towerId),
      floorId:
        row.location?.floorId == null ? null : String(row.location.floorId),
      locationLabel: row.location?.locationLabel ?? null,
    },
    periodFrom: toIso(row.periodFrom) ?? String(row.periodFrom),
    periodTo: toIso(row.periodTo) ?? String(row.periodTo),
    measurementDate:
      toIso(row.measurementDate) ?? String(row.measurementDate),
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    submittedAt: toIso(row.submittedAt),
    acknowledgedAt: toIso(row.acknowledgedAt),
    verifiedAt: toIso(row.verifiedAt),
    certifiedAt: toIso(row.certifiedAt),
    rejectedAt: toIso(row.rejectedAt),
    createdAt: row.createdAt ? (toIso(row.createdAt) ?? undefined) : undefined,
    updatedAt: row.updatedAt ? (toIso(row.updatedAt) ?? undefined) : undefined,
  };
}

/** `GET /measurement-book` — `measurement.view` */
export async function fetchMeasurementBookEntries(
  query: ListMeasurementBookQuery = {},
): Promise<PublicMeasurementBookEntry[]> {
  const res = await apiGet<PublicMeasurementBookEntry[]>(BASE, {
    projectId: query.projectId,
    siteId: query.siteId,
    contractorId: query.contractorId,
    boqItemId: query.boqItemId,
    workOrderId: query.workOrderId,
    workMeasurementId: query.workMeasurementId,
    dprId: query.dprId,
    status: query.status,
    fromDate: query.fromDate,
    toDate: query.toDate,
    periodFrom: query.periodFrom,
    periodTo: query.periodTo,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return (res.data ?? []).map(normalise);
}

/** `GET /measurement-book/:id` — `measurement.view` */
export async function fetchMeasurementBookEntry(
  id: string,
): Promise<PublicMeasurementBookEntry> {
  const res = await apiGet<PublicMeasurementBookEntry>(`${BASE}/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Measurement book entry unavailable');
  }
  return normalise(res.data);
}

/** `POST /measurement-book` — `measurement.create` */
export async function createMeasurementBookEntry(
  input: CreateMeasurementBookInput,
): Promise<PublicMeasurementBookEntry> {
  const res = await apiPost<PublicMeasurementBookEntry>(BASE, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to create measurement book entry');
  }
  return normalise(res.data);
}

/** `PATCH /measurement-book/:id` — `measurement.create` */
export async function updateMeasurementBookEntry(
  id: string,
  input: Partial<CreateMeasurementBookInput>,
): Promise<PublicMeasurementBookEntry> {
  const res = await apiPatch<PublicMeasurementBookEntry>(`${BASE}/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Failed to update measurement book entry');
  }
  return normalise(res.data);
}

async function postAction(
  id: string,
  action: string,
  body?: unknown,
): Promise<PublicMeasurementBookEntry> {
  const res = await apiPost<PublicMeasurementBookEntry>(
    `${BASE}/${id}/${action}`,
    body ?? {},
  );
  if (!res.data) {
    throw new Error(res.message || `Failed to ${action} measurement book entry`);
  }
  return normalise(res.data);
}

/** `POST /measurement-book/:id/submit` — `measurement.create` */
export function submitMeasurementBookEntry(id: string) {
  return postAction(id, 'submit');
}

/** `POST /measurement-book/:id/acknowledge` — `measurement.create` */
export function acknowledgeMeasurementBookEntry(id: string) {
  return postAction(id, 'acknowledge');
}

/** `POST /measurement-book/:id/verify` — `measurement.certify` */
export function verifyMeasurementBookEntry(id: string) {
  return postAction(id, 'verify');
}

/** `POST /measurement-book/:id/certify` — `measurement.certify` */
export function certifyMeasurementBookEntry(id: string) {
  return postAction(id, 'certify');
}

/** `POST /measurement-book/:id/reject` — `measurement.certify` */
export function rejectMeasurementBookEntry(id: string, reason: string) {
  return postAction(id, 'reject', { reason });
}

/** `POST /measurement-book/:id/cancel` — `measurement.create` */
export function cancelMeasurementBookEntry(id: string) {
  return postAction(id, 'cancel');
}

/** `POST /measurement-book/:id/revise` — `measurement.create` */
export function reviseMeasurementBookEntry(
  id: string,
  input: ReviseMeasurementBookInput,
) {
  return postAction(id, 'revise', input);
}
