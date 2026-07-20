import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  isAllowedDocumentMimeType,
} from '@/validation';
import type { LocalUploadFile } from '@luxaria/shared-types';

export function assertWebLocalFile(file: LocalUploadFile): void {
  if (!file.size || file.size < 1) {
    throw new Error('File is empty');
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `File exceeds maximum size of ${MAX_ATTACHMENT_BYTES} bytes`,
    );
  }
  if (!isAllowedDocumentMimeType(file.mimeType)) {
    throw new Error(
      `MIME type not allowed: ${file.mimeType}. Allowed: ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')}`,
    );
  }
}
