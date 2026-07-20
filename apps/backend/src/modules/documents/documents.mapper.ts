import type { Types } from 'mongoose';
import type {
  DocumentStatus,
  MalwareScanStatus,
} from './schemas/document.schema';

export type PublicDocument = {
  id: string;
  documentCode: string;
  companyId: string | null;
  projectId: string | null;
  module: string;
  entityType: string;
  entityId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  checksum: string | null;
  s3Key: string;
  uploadedBy: string;
  uploadedAt: Date | null;
  documentType: string;
  version: number;
  status: DocumentStatus;
  malwareScanStatus: MalwareScanStatus;
  previousVersionId: string | null;
  replaceGroupKey: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type DocLike = {
  _id: Types.ObjectId | string;
  documentCode: string;
  companyId?: Types.ObjectId | string | null;
  projectId?: Types.ObjectId | string | null;
  module: string;
  entityType: string;
  entityId: Types.ObjectId | string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  checksum?: string | null;
  s3Key: string;
  uploadedBy: Types.ObjectId | string;
  uploadedAt?: Date | null;
  documentType: string;
  version: number;
  status: DocumentStatus;
  malwareScanStatus: MalwareScanStatus;
  previousVersionId?: Types.ObjectId | string | null;
  replaceGroupKey?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicDocument(doc: DocLike): PublicDocument {
  return {
    id: String(doc._id),
    documentCode: doc.documentCode,
    companyId: doc.companyId ? String(doc.companyId) : null,
    projectId: doc.projectId ? String(doc.projectId) : null,
    module: doc.module,
    entityType: doc.entityType,
    entityId: String(doc.entityId),
    fileName: doc.fileName,
    originalFileName: doc.originalFileName,
    mimeType: doc.mimeType,
    size: doc.size,
    checksum: doc.checksum ?? null,
    s3Key: doc.s3Key,
    uploadedBy: String(doc.uploadedBy),
    uploadedAt: doc.uploadedAt ?? null,
    documentType: doc.documentType,
    version: doc.version,
    status: doc.status,
    malwareScanStatus: doc.malwareScanStatus,
    previousVersionId: doc.previousVersionId
      ? String(doc.previousVersionId)
      : null,
    replaceGroupKey: doc.replaceGroupKey ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
