import type { Types } from 'mongoose';
import type { RfqStatus } from './schemas/rfq.schema';

export type PublicRfq = {
  id: string;
  companyId: string | null;
  projectId: string;
  siteId: string | null;
  purchaseRequestId: string;
  rfqNumber: string;
  title: string;
  status: RfqStatus;
  vendorIds: string[];
  closingDate: Date;
  notes: string | null;
  issuedAt: Date | null;
  issuedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type RfqLike = {
  _id: Types.ObjectId | string;
  companyId?: Types.ObjectId | string | null;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  purchaseRequestId: Types.ObjectId | string;
  rfqNumber: string;
  title: string;
  status: RfqStatus;
  vendorIds?: Array<Types.ObjectId | string>;
  closingDate: Date;
  notes?: string | null;
  issuedAt?: Date | null;
  issuedBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicRfq(row: RfqLike): PublicRfq {
  return {
    id: String(row._id),
    companyId: row.companyId ? String(row.companyId) : null,
    projectId: String(row.projectId),
    siteId: row.siteId ? String(row.siteId) : null,
    purchaseRequestId: String(row.purchaseRequestId),
    rfqNumber: row.rfqNumber,
    title: row.title,
    status: row.status,
    vendorIds: (row.vendorIds ?? []).map((id) => String(id)),
    closingDate: row.closingDate,
    notes: row.notes ?? null,
    issuedAt: row.issuedAt ?? null,
    issuedBy: row.issuedBy ? String(row.issuedBy) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
