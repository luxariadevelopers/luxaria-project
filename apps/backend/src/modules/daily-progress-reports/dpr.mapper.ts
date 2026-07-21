import type { Types } from 'mongoose';
import type {
  DprIssueSeverity,
  DprShift,
  DprStatus,
  DprWeather,
} from './schemas/daily-progress-report.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

function oidList(values?: Array<Types.ObjectId | string> | null): string[] {
  return (values ?? []).map(String);
}

export type PublicDailyProgressReport = {
  id: string;
  dprNumber: string;
  projectId: string;
  siteId: string | null;
  zoneSiteId: string | null;
  blockSiteId: string | null;
  towerSiteId: string | null;
  floorSiteId: string | null;
  unitId: string | null;
  locationSiteIds: string[];
  reportDate: Date;
  shift: DprShift;
  weather: DprWeather;
  weatherNotes: string | null;
  staffPresent: Array<{
    id: string;
    name: string;
    role: string | null;
    present: boolean;
  }>;
  labourCount: number;
  skilledLabourCount: number;
  unskilledLabourCount: number;
  workPerformed: string | null;
  plannedWork: string | null;
  delayedWork: string | null;
  boqQuantities: Array<{
    id: string;
    boqItemId: string;
    boqCode: string | null;
    description: string | null;
    unit: string | null;
    quantityCompleted: number;
    notes: string | null;
  }>;
  materialsReceived: Array<{
    id: string;
    materialId: string | null;
    materialName: string;
    quantity: number;
    unit: string | null;
    reference: string | null;
  }>;
  materialsIssued: Array<{
    id: string;
    materialId: string | null;
    materialName: string;
    quantity: number;
    unit: string | null;
    reference: string | null;
  }>;
  equipmentUsed: Array<{
    id: string;
    name: string;
    hours: number;
    notes: string | null;
  }>;
  delays: Array<{
    id: string;
    reason: string;
    hoursLost: number;
    notes: string | null;
  }>;
  safetyIssues: Array<{
    id: string;
    description: string;
    severity: DprIssueSeverity;
    actionTaken: string | null;
  }>;
  qualityIssues: Array<{
    id: string;
    description: string;
    severity: DprIssueSeverity;
    actionTaken: string | null;
  }>;
  decisionsRequired: Array<{
    id: string;
    description: string;
    owner: string | null;
    dueDate: Date | null;
  }>;
  tomorrowPlan: string | null;
  photoDocumentIds: string[];
  videoDocumentIds: string[];
  materialIssueIds: string[];
  stockReservationIds: string[];
  labourAttendanceIds: string[];
  workMeasurementIds: string[];
  equipmentUtilizationIds: string[];
  diaryEntryIds: string[];
  qualityObservationIds: string[];
  safetyIncidentIds: string[];
  siteIssueIds: string[];
  drawingIds: string[];
  siteCashBalance: number;
  siteCashAccountId: string | null;
  status: DprStatus;
  pdfDocumentId: string | null;
  clientDeviceId: string | null;
  offlineCapturedAt: Date | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  verifyNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  approveNotes: string | null;
  lockedBy: string | null;
  lockedAt: Date | null;
  reopenedBy: string | null;
  reopenedAt: Date | null;
  reopenReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type DprLike = {
  _id: Types.ObjectId | string;
  dprNumber: string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  zoneSiteId?: Types.ObjectId | string | null;
  blockSiteId?: Types.ObjectId | string | null;
  towerSiteId?: Types.ObjectId | string | null;
  floorSiteId?: Types.ObjectId | string | null;
  unitId?: Types.ObjectId | string | null;
  locationSiteIds?: Array<Types.ObjectId | string>;
  reportDate: Date;
  shift?: DprShift;
  weather: DprWeather;
  weatherNotes?: string | null;
  staffPresent?: Array<{
    _id?: Types.ObjectId | string;
    name: string;
    role?: string | null;
    present?: boolean;
  }>;
  labourCount?: number;
  skilledLabourCount?: number;
  unskilledLabourCount?: number;
  workPerformed?: string | null;
  plannedWork?: string | null;
  delayedWork?: string | null;
  boqQuantities?: Array<{
    _id?: Types.ObjectId | string;
    boqItemId: Types.ObjectId | string;
    boqCode?: string | null;
    description?: string | null;
    unit?: string | null;
    quantityCompleted: number;
    notes?: string | null;
  }>;
  materialsReceived?: Array<{
    _id?: Types.ObjectId | string;
    materialId?: Types.ObjectId | string | null;
    materialName: string;
    quantity: number;
    unit?: string | null;
    reference?: string | null;
  }>;
  materialsIssued?: Array<{
    _id?: Types.ObjectId | string;
    materialId?: Types.ObjectId | string | null;
    materialName: string;
    quantity: number;
    unit?: string | null;
    reference?: string | null;
  }>;
  equipmentUsed?: Array<{
    _id?: Types.ObjectId | string;
    name: string;
    hours: number;
    notes?: string | null;
  }>;
  delays?: Array<{
    _id?: Types.ObjectId | string;
    reason: string;
    hoursLost: number;
    notes?: string | null;
  }>;
  safetyIssues?: Array<{
    _id?: Types.ObjectId | string;
    description: string;
    severity: DprIssueSeverity;
    actionTaken?: string | null;
  }>;
  qualityIssues?: Array<{
    _id?: Types.ObjectId | string;
    description: string;
    severity: DprIssueSeverity;
    actionTaken?: string | null;
  }>;
  decisionsRequired?: Array<{
    _id?: Types.ObjectId | string;
    description: string;
    owner?: string | null;
    dueDate?: Date | null;
  }>;
  tomorrowPlan?: string | null;
  photoDocumentIds?: Array<Types.ObjectId | string>;
  videoDocumentIds?: Array<Types.ObjectId | string>;
  materialIssueIds?: Array<Types.ObjectId | string>;
  stockReservationIds?: Array<Types.ObjectId | string>;
  labourAttendanceIds?: Array<Types.ObjectId | string>;
  workMeasurementIds?: Array<Types.ObjectId | string>;
  equipmentUtilizationIds?: Array<Types.ObjectId | string>;
  diaryEntryIds?: Array<Types.ObjectId | string>;
  qualityObservationIds?: Array<Types.ObjectId | string>;
  safetyIncidentIds?: Array<Types.ObjectId | string>;
  siteIssueIds?: Array<Types.ObjectId | string>;
  drawingIds?: Array<Types.ObjectId | string>;
  siteCashBalance?: number;
  siteCashAccountId?: Types.ObjectId | string | null;
  status: DprStatus;
  pdfDocumentId?: Types.ObjectId | string | null;
  clientDeviceId?: string | null;
  offlineCapturedAt?: Date | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  verifyNotes?: string | null;
  reviewedBy?: Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  approvedBy?: Types.ObjectId | string | null;
  approvedAt?: Date | null;
  approveNotes?: string | null;
  lockedBy?: Types.ObjectId | string | null;
  lockedAt?: Date | null;
  reopenedBy?: Types.ObjectId | string | null;
  reopenedAt?: Date | null;
  reopenReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicDpr(row: DprLike): PublicDailyProgressReport {
  return {
    id: String(row._id),
    dprNumber: row.dprNumber,
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    zoneSiteId: oid(row.zoneSiteId),
    blockSiteId: oid(row.blockSiteId),
    towerSiteId: oid(row.towerSiteId),
    floorSiteId: oid(row.floorSiteId),
    unitId: oid(row.unitId),
    locationSiteIds: oidList(row.locationSiteIds),
    reportDate: row.reportDate,
    shift: row.shift ?? ('general' as DprShift),
    weather: row.weather,
    weatherNotes: row.weatherNotes ?? null,
    staffPresent: (row.staffPresent ?? []).map((s) => ({
      id: s._id ? String(s._id) : '',
      name: s.name,
      role: s.role ?? null,
      present: s.present !== false,
    })),
    labourCount: row.labourCount ?? 0,
    skilledLabourCount: row.skilledLabourCount ?? 0,
    unskilledLabourCount: row.unskilledLabourCount ?? 0,
    workPerformed: row.workPerformed ?? null,
    plannedWork: row.plannedWork ?? null,
    delayedWork: row.delayedWork ?? null,
    boqQuantities: (row.boqQuantities ?? []).map((b) => ({
      id: b._id ? String(b._id) : '',
      boqItemId: String(b.boqItemId),
      boqCode: b.boqCode ?? null,
      description: b.description ?? null,
      unit: b.unit ?? null,
      quantityCompleted: b.quantityCompleted,
      notes: b.notes ?? null,
    })),
    materialsReceived: (row.materialsReceived ?? []).map((m) => ({
      id: m._id ? String(m._id) : '',
      materialId: oid(m.materialId),
      materialName: m.materialName,
      quantity: m.quantity,
      unit: m.unit ?? null,
      reference: m.reference ?? null,
    })),
    materialsIssued: (row.materialsIssued ?? []).map((m) => ({
      id: m._id ? String(m._id) : '',
      materialId: oid(m.materialId),
      materialName: m.materialName,
      quantity: m.quantity,
      unit: m.unit ?? null,
      reference: m.reference ?? null,
    })),
    equipmentUsed: (row.equipmentUsed ?? []).map((e) => ({
      id: e._id ? String(e._id) : '',
      name: e.name,
      hours: e.hours,
      notes: e.notes ?? null,
    })),
    delays: (row.delays ?? []).map((d) => ({
      id: d._id ? String(d._id) : '',
      reason: d.reason,
      hoursLost: d.hoursLost,
      notes: d.notes ?? null,
    })),
    safetyIssues: (row.safetyIssues ?? []).map((i) => ({
      id: i._id ? String(i._id) : '',
      description: i.description,
      severity: i.severity,
      actionTaken: i.actionTaken ?? null,
    })),
    qualityIssues: (row.qualityIssues ?? []).map((i) => ({
      id: i._id ? String(i._id) : '',
      description: i.description,
      severity: i.severity,
      actionTaken: i.actionTaken ?? null,
    })),
    decisionsRequired: (row.decisionsRequired ?? []).map((d) => ({
      id: d._id ? String(d._id) : '',
      description: d.description,
      owner: d.owner ?? null,
      dueDate: d.dueDate ?? null,
    })),
    tomorrowPlan: row.tomorrowPlan ?? null,
    photoDocumentIds: oidList(row.photoDocumentIds),
    videoDocumentIds: oidList(row.videoDocumentIds),
    materialIssueIds: oidList(row.materialIssueIds),
    stockReservationIds: oidList(row.stockReservationIds),
    labourAttendanceIds: oidList(row.labourAttendanceIds),
    workMeasurementIds: oidList(row.workMeasurementIds),
    equipmentUtilizationIds: oidList(row.equipmentUtilizationIds),
    diaryEntryIds: oidList(row.diaryEntryIds),
    qualityObservationIds: oidList(row.qualityObservationIds),
    safetyIncidentIds: oidList(row.safetyIncidentIds),
    siteIssueIds: oidList(row.siteIssueIds),
    drawingIds: oidList(row.drawingIds),
    siteCashBalance: row.siteCashBalance ?? 0,
    siteCashAccountId: oid(row.siteCashAccountId),
    status: row.status,
    pdfDocumentId: oid(row.pdfDocumentId),
    clientDeviceId: row.clientDeviceId ?? null,
    offlineCapturedAt: row.offlineCapturedAt ?? null,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    verifiedBy: oid(row.verifiedBy),
    verifiedAt: row.verifiedAt ?? null,
    verifyNotes: row.verifyNotes ?? null,
    reviewedBy: oid(row.reviewedBy),
    reviewedAt: row.reviewedAt ?? null,
    reviewNotes: row.reviewNotes ?? null,
    approvedBy: oid(row.approvedBy),
    approvedAt: row.approvedAt ?? null,
    approveNotes: row.approveNotes ?? null,
    lockedBy: oid(row.lockedBy),
    lockedAt: row.lockedAt ?? null,
    reopenedBy: oid(row.reopenedBy),
    reopenedAt: row.reopenedAt ?? null,
    reopenReason: row.reopenReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
