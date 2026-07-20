import type { Types } from 'mongoose';
import type {
  DprIssueSeverity,
  DprStatus,
  DprWeather,
} from './schemas/daily-progress-report.schema';

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

export type PublicDailyProgressReport = {
  id: string;
  dprNumber: string;
  projectId: string;
  reportDate: Date;
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
  siteCashBalance: number;
  siteCashAccountId: string | null;
  status: DprStatus;
  pdfDocumentId: string | null;
  clientDeviceId: string | null;
  offlineCapturedAt: Date | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
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
  reportDate: Date;
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
  siteCashBalance?: number;
  siteCashAccountId?: Types.ObjectId | string | null;
  status: DprStatus;
  pdfDocumentId?: Types.ObjectId | string | null;
  clientDeviceId?: string | null;
  offlineCapturedAt?: Date | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  reviewedBy?: Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
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
    reportDate: row.reportDate,
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
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    videoDocumentIds: (row.videoDocumentIds ?? []).map(String),
    siteCashBalance: row.siteCashBalance ?? 0,
    siteCashAccountId: oid(row.siteCashAccountId),
    status: row.status,
    pdfDocumentId: oid(row.pdfDocumentId),
    clientDeviceId: row.clientDeviceId ?? null,
    offlineCapturedAt: row.offlineCapturedAt ?? null,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    reviewedBy: oid(row.reviewedBy),
    reviewedAt: row.reviewedAt ?? null,
    reviewNotes: row.reviewNotes ?? null,
    reopenedBy: oid(row.reopenedBy),
    reopenedAt: row.reopenedAt ?? null,
    reopenReason: row.reopenReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
