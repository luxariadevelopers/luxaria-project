import type { Types } from 'mongoose';
import type { SitePhotoLinkType } from './schemas/site-photo.schema';

export type PublicSitePhoto = {
  id: string;
  projectId: string;
  siteId: string | null;
  documentId: string;
  linkType: SitePhotoLinkType;
  linkId: string;
  lat: number | null;
  lng: number | null;
  capturedAt: Date | null;
  version: number;
  caption: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicSitePhoto(row: {
  _id: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  documentId: Types.ObjectId | string;
  linkType: SitePhotoLinkType;
  linkId: Types.ObjectId | string;
  lat?: number | null;
  lng?: number | null;
  capturedAt?: Date | null;
  version: number;
  caption?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicSitePhoto {
  return {
    id: String(row._id),
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    documentId: String(row.documentId),
    linkType: row.linkType,
    linkId: String(row.linkId),
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    capturedAt: row.capturedAt ?? null,
    version: row.version,
    caption: row.caption ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
