import {
  DOCUMENT_TYPE_REGEX,
  type ConfirmUploadRequest,
  type PresignUploadRequest,
  type PresignUploadResult,
  type PublicDocument,
} from './types';
import { isConfirmedDocumentStatus } from './status';

export type LocalUploadFile = {
  name: string;
  mimeType: string;
  size: number;
  /** Opaque handle for platform adapters (Blob, uri, etc.). */
  source: unknown;
};

export type DocumentUploadContext = {
  module: string;
  entityType: string;
  entityId: string;
  documentType: string;
  companyId?: string | null;
  projectId?: string | null;
};

export type DocumentUploadAdapters = {
  /** Client-side MIME/size checks before calling the API. */
  assertLocalFile: (file: LocalUploadFile) => void;
  presign: (body: PresignUploadRequest) => Promise<PresignUploadResult>;
  /**
   * PUT bytes to the private S3 URL. Must send required headers from presign
   * (Content-Type / x-amz-server-side-encryption). Never use a public ACL.
   * Do not require Content-Length — browsers refuse that header on XHR.
   */
  putToPresignedUrl: (input: {
    url: string;
    method: string;
    headers: Record<string, string>;
    file: LocalUploadFile;
    onProgress?: (ratio: number) => void;
  }) => Promise<void>;
  confirm: (
    documentId: string,
    body?: ConfirmUploadRequest,
  ) => Promise<PublicDocument>;
  /** Optional SHA-256 hex; verified when S3 returns a checksum. */
  computeChecksum?: (file: LocalUploadFile) => Promise<string | undefined>;
};

export type DocumentUploadProgress =
  | { phase: 'validating' }
  | { phase: 'presigning' }
  | { phase: 'uploading'; ratio: number }
  | { phase: 'confirming' }
  | { phase: 'confirmed'; document: PublicDocument };

function normalizeDocumentType(documentType: string): string {
  return documentType.trim().toLowerCase();
}

export function assertDocumentType(documentType: string): string {
  const normalized = normalizeDocumentType(documentType);
  if (!DOCUMENT_TYPE_REGEX.test(normalized)) {
    throw new Error(
      'documentType must be lowercase alphanumeric with underscores',
    );
  }
  return normalized;
}

/**
 * Presign → private S3 PUT → confirm.
 * Returns only after status is `active` (confirmed). Pending docs are never
 * treated as attached to records.
 */
export async function executeDocumentUpload(
  adapters: DocumentUploadAdapters,
  context: DocumentUploadContext,
  file: LocalUploadFile,
  onProgress?: (progress: DocumentUploadProgress) => void,
): Promise<PublicDocument> {
  onProgress?.({ phase: 'validating' });
  const documentType = assertDocumentType(context.documentType);
  adapters.assertLocalFile(file);

  const body: PresignUploadRequest = {
    module: context.module.trim().toLowerCase(),
    entityType: context.entityType.trim().toLowerCase(),
    entityId: context.entityId,
    originalFileName: file.name,
    mimeType: file.mimeType,
    size: file.size,
    documentType,
    companyId: context.companyId ?? undefined,
    projectId: context.projectId ?? undefined,
  };

  onProgress?.({ phase: 'presigning' });
  const presign = await adapters.presign(body);
  const documentId = presign.document.id;
  if (!documentId || !presign.upload?.url) {
    throw new Error('Presign response missing document id or upload URL');
  }

  onProgress?.({ phase: 'uploading', ratio: 0 });
  await adapters.putToPresignedUrl({
    url: presign.upload.url,
    method: presign.upload.method || 'PUT',
    headers: presign.upload.headers ?? {
      'Content-Type': file.mimeType,
    },
    file,
    onProgress: (ratio) => onProgress?.({ phase: 'uploading', ratio }),
  });
  onProgress?.({ phase: 'uploading', ratio: 1 });

  onProgress?.({ phase: 'confirming' });
  const checksum = adapters.computeChecksum
    ? await adapters.computeChecksum(file)
    : undefined;
  const confirmed = await adapters.confirm(
    documentId,
    checksum ? { checksum } : {},
  );

  if (!isConfirmedDocumentStatus(String(confirmed.status))) {
    throw new Error(
      `Document ${confirmed.id} is not active after confirm (status=${confirmed.status})`,
    );
  }

  onProgress?.({ phase: 'confirmed', document: confirmed });
  return confirmed;
}
