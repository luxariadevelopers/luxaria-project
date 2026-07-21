import type { Types } from 'mongoose';
import type {
  SiteSafetySeverity,
  SiteSafetyStatus,
  SiteSafetyType,
} from './schemas/site-safety.schema';

export type PublicPpeChecklistItem = {
  item: string;
  compliant: boolean;
  notes: string | null;
};

export type PublicSafetyAttendee = {
  userId: string | null;
  name: string;
  role: string | null;
};

export type PublicSiteSafety = {
  id: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  type: SiteSafetyType;
  title: string;
  description: string;
  severity: SiteSafetySeverity;
  status: SiteSafetyStatus;
  ppeChecklist: PublicPpeChecklistItem[] | null;
  attendees: PublicSafetyAttendee[];
  photoDocumentIds: string[];
  investigationNotes: string | null;
  createdBy: string;
  closedBy: string | null;
  closedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicSiteSafety(row: {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  dprId?: Types.ObjectId | string | null;
  type: SiteSafetyType;
  title: string;
  description?: string;
  severity: SiteSafetySeverity;
  status: SiteSafetyStatus;
  ppeChecklist?: Array<{
    item: string;
    compliant?: boolean;
    notes?: string | null;
  }> | null;
  attendees?: Array<{
    userId?: Types.ObjectId | string | null;
    name: string;
    role?: string | null;
  }>;
  photoDocumentIds?: Array<Types.ObjectId | string>;
  investigationNotes?: string | null;
  createdBy: Types.ObjectId | string;
  closedBy?: Types.ObjectId | string | null;
  closedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicSiteSafety {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    dprId: oid(row.dprId),
    type: row.type,
    title: row.title,
    description: row.description ?? '',
    severity: row.severity,
    status: row.status,
    ppeChecklist: row.ppeChecklist
      ? row.ppeChecklist.map((item) => ({
          item: item.item,
          compliant: item.compliant ?? false,
          notes: item.notes ?? null,
        }))
      : null,
    attendees: (row.attendees ?? []).map((a) => ({
      userId: oid(a.userId),
      name: a.name,
      role: a.role ?? null,
    })),
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    investigationNotes: row.investigationNotes ?? null,
    createdBy: String(row.createdBy),
    closedBy: oid(row.closedBy),
    closedAt: row.closedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
