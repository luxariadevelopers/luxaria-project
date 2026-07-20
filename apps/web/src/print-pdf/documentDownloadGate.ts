import {
  DocumentStatus,
  isConfirmedDocumentStatus,
} from '@luxaria/shared-types';

/**
 * Mirrors `DocumentPreview`: only active (confirmed) or historical replaced
 * documents may be downloaded via `GET /documents/:id/download-url`.
 */
export function canDownloadDocumentByStatus(status: string): boolean {
  return (
    isConfirmedDocumentStatus(status) || status === DocumentStatus.Replaced
  );
}

export function documentDownloadBlockedMessage(status: string): string {
  return `Only active or historical documents can be downloaded (status: ${status})`;
}
