import type { Types } from 'mongoose';
import type { SiteDiaryEntryType } from './schemas/site-diary-entry.schema';

export type PublicSiteDiaryVisitor = {
  id: string;
  name: string;
  organization: string | null;
  purpose: string | null;
};

export type PublicSiteDiaryEntry = {
  id: string;
  projectId: string;
  siteId: string | null;
  dprId: string | null;
  entryDate: Date;
  entryType: SiteDiaryEntryType;
  title: string;
  description: string | null;
  visitors: PublicSiteDiaryVisitor[];
  photoDocumentIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicSiteDiaryEntry(row: {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  dprId?: Types.ObjectId | string | null;
  entryDate: Date;
  entryType: SiteDiaryEntryType;
  title: string;
  description?: string | null;
  visitors?: Array<{
    _id?: Types.ObjectId | string;
    name: string;
    organization?: string | null;
    purpose?: string | null;
  }>;
  photoDocumentIds?: Array<Types.ObjectId | string>;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicSiteDiaryEntry {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    dprId: oid(row.dprId),
    entryDate: row.entryDate,
    entryType: row.entryType,
    title: row.title,
    description: row.description ?? null,
    visitors: (row.visitors ?? []).map((v) => ({
      id: v._id ? String(v._id) : '',
      name: v.name,
      organization: v.organization ?? null,
      purpose: v.purpose ?? null,
    })),
    photoDocumentIds: (row.photoDocumentIds ?? []).map(String),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
