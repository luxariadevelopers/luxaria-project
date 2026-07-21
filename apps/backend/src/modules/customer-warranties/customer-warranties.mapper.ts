import { Types } from 'mongoose';
import type {
  WarrantyCategory,
  WarrantyStatus,
} from './schemas/customer-warranty.schema';

export type PublicMaterialUsageItem = {
  id: string;
  materialName: string;
  quantity: number;
  unit: string | null;
};

export type PublicCompletionPhoto = {
  id: string;
  filePath: string;
  caption: string | null;
};

export type PublicCustomerWarranty = {
  id: string;
  ticketNumber: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  handoverId: string | null;
  category: WarrantyCategory;
  description: string;
  slaDueAt: Date | null;
  status: WarrantyStatus;
  assignedContractorId: string | null;
  assignedUserId: string | null;
  materialUsage: PublicMaterialUsageItem[];
  completionPhotos: PublicCompletionPhoto[];
  inspectionNotes: string | null;
  rectificationNotes: string | null;
  verificationNotes: string | null;
  raisedAt: Date;
  closedAt: Date | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

const subdocId = (id: Types.ObjectId | string | undefined): string =>
  String(id ?? new Types.ObjectId());

export function toPublicCustomerWarranty(row: {
  _id: Types.ObjectId | string;
  ticketNumber: string;
  projectId: Types.ObjectId | string;
  bookingId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  unitId: Types.ObjectId | string;
  handoverId?: Types.ObjectId | string | null;
  category: WarrantyCategory;
  description: string;
  slaDueAt?: Date | null;
  status: WarrantyStatus;
  assignedContractorId?: Types.ObjectId | string | null;
  assignedUserId?: Types.ObjectId | string | null;
  materialUsage?: Array<{
    _id?: Types.ObjectId | string;
    materialName: string;
    quantity: number;
    unit?: string | null;
  }>;
  completionPhotos?: Array<{
    _id?: Types.ObjectId | string;
    filePath: string;
    caption?: string | null;
  }>;
  inspectionNotes?: string | null;
  rectificationNotes?: string | null;
  verificationNotes?: string | null;
  raisedAt: Date;
  closedAt?: Date | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicCustomerWarranty {
  return {
    id: String(row._id),
    ticketNumber: row.ticketNumber,
    projectId: String(row.projectId),
    bookingId: String(row.bookingId),
    customerId: String(row.customerId),
    unitId: String(row.unitId),
    handoverId: oid(row.handoverId),
    category: row.category,
    description: row.description,
    slaDueAt: row.slaDueAt ?? null,
    status: row.status,
    assignedContractorId: oid(row.assignedContractorId),
    assignedUserId: oid(row.assignedUserId),
    materialUsage: (row.materialUsage ?? []).map((m) => ({
      id: subdocId(m._id),
      materialName: m.materialName,
      quantity: m.quantity,
      unit: m.unit ?? null,
    })),
    completionPhotos: (row.completionPhotos ?? []).map((p) => ({
      id: subdocId(p._id),
      filePath: p.filePath,
      caption: p.caption ?? null,
    })),
    inspectionNotes: row.inspectionNotes ?? null,
    rectificationNotes: row.rectificationNotes ?? null,
    verificationNotes: row.verificationNotes ?? null,
    raisedAt: row.raisedAt,
    closedAt: row.closedAt ?? null,
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
