import { Types } from 'mongoose';
import type {
  SnagStatus,
  UnitHandoverStatus,
} from './schemas/unit-handover.schema';

export type PublicSnagItem = {
  id: string;
  description: string;
  status: SnagStatus;
  closedAt: Date | null;
  notes: string | null;
};

export type PublicMeterReading = {
  id: string;
  utility: string;
  reading: number;
  unit: string | null;
};

export type PublicWarrantyDocument = {
  id: string;
  title: string;
  filePath: string;
};

export type PublicAssetRegisterItem = {
  id: string;
  name: string;
  serial: string | null;
  condition: string | null;
};

export type PublicHandoverPhoto = {
  id: string;
  filePath: string;
  caption: string | null;
  takenAt: Date | null;
};

export type PublicUnitHandover = {
  id: string;
  handoverNumber: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  status: UnitHandoverStatus;
  scheduledAt: Date | null;
  completedAt: Date | null;
  snagList: PublicSnagItem[];
  keysHandedOver: boolean;
  meterReadings: PublicMeterReading[];
  warrantyDocuments: PublicWarrantyDocument[];
  maintenanceNotes: string | null;
  assetRegister: PublicAssetRegisterItem[];
  customerAcknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedByName: string | null;
  photos: PublicHandoverPhoto[];
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

const subdocId = (id: Types.ObjectId | string | undefined): string =>
  String(id ?? new Types.ObjectId());

export function toPublicUnitHandover(row: {
  _id: Types.ObjectId | string;
  handoverNumber: string;
  projectId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  status: UnitHandoverStatus;
  scheduledAt?: Date | null;
  completedAt?: Date | null;
  snagList?: Array<{
    _id?: Types.ObjectId | string;
    description: string;
    status: SnagStatus;
    closedAt?: Date | null;
    notes?: string | null;
  }>;
  keysHandedOver: boolean;
  meterReadings?: Array<{
    _id?: Types.ObjectId | string;
    utility: string;
    reading: number;
    unit?: string | null;
  }>;
  warrantyDocuments?: Array<{
    _id?: Types.ObjectId | string;
    title: string;
    filePath: string;
  }>;
  maintenanceNotes?: string | null;
  assetRegister?: Array<{
    _id?: Types.ObjectId | string;
    name: string;
    serial?: string | null;
    condition?: string | null;
  }>;
  customerAcknowledged: boolean;
  acknowledgedAt?: Date | null;
  acknowledgedByName?: string | null;
  photos?: Array<{
    _id?: Types.ObjectId | string;
    filePath: string;
    caption?: string | null;
    takenAt?: Date | null;
  }>;
  notes?: string | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicUnitHandover {
  return {
    id: String(row._id),
    handoverNumber: row.handoverNumber,
    projectId: String(row.projectId),
    bookingId: String(row.bookingId),
    customerId: String(row.customerId),
    unitId: String(row.unitId),
    status: row.status,
    scheduledAt: row.scheduledAt ?? null,
    completedAt: row.completedAt ?? null,
    snagList: (row.snagList ?? []).map((s) => ({
      id: subdocId(s._id),
      description: s.description,
      status: s.status,
      closedAt: s.closedAt ?? null,
      notes: s.notes ?? null,
    })),
    keysHandedOver: row.keysHandedOver,
    meterReadings: (row.meterReadings ?? []).map((m) => ({
      id: subdocId(m._id),
      utility: m.utility,
      reading: m.reading,
      unit: m.unit ?? null,
    })),
    warrantyDocuments: (row.warrantyDocuments ?? []).map((w) => ({
      id: subdocId(w._id),
      title: w.title,
      filePath: w.filePath,
    })),
    maintenanceNotes: row.maintenanceNotes ?? null,
    assetRegister: (row.assetRegister ?? []).map((a) => ({
      id: subdocId(a._id),
      name: a.name,
      serial: a.serial ?? null,
      condition: a.condition ?? null,
    })),
    customerAcknowledged: row.customerAcknowledged,
    acknowledgedAt: row.acknowledgedAt ?? null,
    acknowledgedByName: row.acknowledgedByName ?? null,
    photos: (row.photos ?? []).map((p) => ({
      id: subdocId(p._id),
      filePath: p.filePath,
      caption: p.caption ?? null,
      takenAt: p.takenAt ?? null,
    })),
    notes: row.notes ?? null,
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
