import type { Types } from 'mongoose';
import type {
  PunchItemStatus,
  SiteQualityStatus,
} from './schemas/site-quality.schema';

export type PublicPunchItem = {
  id: string;
  description: string;
  status: PunchItemStatus;
  location: string | null;
  assignedTo: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
};

export type PublicSiteQuality = {
  id: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  boqItemId: string | null;
  title: string;
  description: string;
  status: SiteQualityStatus;
  photoDocumentIds: string[];
  findings: string | null;
  ncrNumber: string | null;
  punchItems: PublicPunchItem[];
  rectificationNotes: string | null;
  reinspectedAt: Date | null;
  createdBy: string;
  closedBy: string | null;
  closedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicSiteQuality(row: {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  dprId?: Types.ObjectId | string | null;
  boqItemId?: Types.ObjectId | string | null;
  title: string;
  description?: string;
  status: SiteQualityStatus;
  photoDocumentIds?: Array<Types.ObjectId | string>;
  findings?: string | null;
  ncrNumber?: string | null;
  punchItems?: Array<{
    _id?: Types.ObjectId | string;
    description: string;
    status: PunchItemStatus;
    location?: string | null;
    assignedTo?: Types.ObjectId | string | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
  }>;
  rectificationNotes?: string | null;
  reinspectedAt?: Date | null;
  createdBy: Types.ObjectId | string;
  closedBy?: Types.ObjectId | string | null;
  closedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicSiteQuality {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    dprId: oid(row.dprId),
    boqItemId: oid(row.boqItemId),
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    findings: row.findings ?? null,
    ncrNumber: row.ncrNumber ?? null,
    punchItems: (row.punchItems ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      description: item.description,
      status: item.status,
      location: item.location ?? null,
      assignedTo: oid(item.assignedTo),
      dueDate: item.dueDate ?? null,
      completedAt: item.completedAt ?? null,
    })),
    rectificationNotes: row.rectificationNotes ?? null,
    reinspectedAt: row.reinspectedAt ?? null,
    createdBy: String(row.createdBy),
    closedBy: oid(row.closedBy),
    closedAt: row.closedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
