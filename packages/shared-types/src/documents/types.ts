import type { DocumentStatus, MalwareScanStatus } from './status';

/**
 * Mirrors `toPublicDocument` in
 * `apps/backend/src/modules/documents/documents.mapper.ts`.
 */
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
  uploadedAt: string | Date | null;
  documentType: string;
  version: number;
  status: DocumentStatus | (string & {});
  malwareScanStatus: MalwareScanStatus | (string & {});
  previousVersionId: string | null;
  replaceGroupKey: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

/** Body for `POST /documents/presign-upload` (`PresignUploadDto`). */
export type PresignUploadRequest = {
  companyId?: string | null;
  projectId?: string | null;
  module: string;
  entityType: string;
  entityId: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  documentType: string;
};

export type PresignUploadResult = {
  document: PublicDocument;
  upload: {
    url: string;
    method: 'PUT' | string;
    expiresIn: number;
    headers: Record<string, string>;
  };
  security: {
    bucketPrivate: boolean;
    publicAccess: boolean;
    mimeValidated: boolean;
    sizeValidated: boolean;
    extensionSource: string;
  };
};

export type PresignDownloadResult = {
  document: PublicDocument;
  download: {
    url: string;
    method: 'GET' | string;
    expiresIn: number;
  };
  security: {
    bucketPrivate: boolean;
    publicAccess: boolean;
  };
};

/** `POST /documents/:id/confirm-upload` body. */
export type ConfirmUploadRequest = {
  checksum?: string;
};

export type ListDocumentsQuery = {
  entityType: string;
  entityId: string;
  module?: string;
  projectId?: string;
  status?: DocumentStatus | string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export const DOCUMENT_TYPE_REGEX = /^[a-z0-9_]+$/;
