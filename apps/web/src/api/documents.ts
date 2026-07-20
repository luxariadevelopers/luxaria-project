import type {
  ConfirmUploadRequest,
  ListDocumentsQuery,
  PresignDownloadResult,
  PresignUploadRequest,
  PresignUploadResult,
  PublicDocument,
} from '@luxaria/shared-types';
import type { ApiResponse, PaginatedResponse } from '@luxaria/shared-types';
import { apiClient } from './client';

/** `POST /documents/presign-upload` */
export async function presignDocumentUpload(body: PresignUploadRequest) {
  const { data } = await apiClient.post<ApiResponse<PresignUploadResult>>(
    '/documents/presign-upload',
    body,
  );
  if (!data.data) {
    throw new Error(data.message || 'Presign upload failed');
  }
  return data.data;
}

/** `POST /documents/:id/confirm-upload` — activates pending_upload → active */
export async function confirmDocumentUpload(
  documentId: string,
  body: ConfirmUploadRequest = {},
) {
  const { data } = await apiClient.post<ApiResponse<PublicDocument>>(
    `/documents/${documentId}/confirm-upload`,
    body,
  );
  if (!data.data) {
    throw new Error(data.message || 'Confirm upload failed');
  }
  return data.data;
}

/** `GET /documents/:id/download-url` — short-lived private GET URL */
export async function getDocumentDownloadUrl(documentId: string) {
  const { data } = await apiClient.get<ApiResponse<PresignDownloadResult>>(
    `/documents/${documentId}/download-url`,
  );
  if (!data.data) {
    throw new Error(data.message || 'Download URL failed');
  }
  return data.data;
}

/** `GET /documents?entityType=&entityId=` */
export async function listEntityDocuments(query: ListDocumentsQuery) {
  const { data } = await apiClient.get<
    PaginatedResponse<PublicDocument> | ApiResponse<PublicDocument[]>
  >('/documents', { params: query });
  return {
    items: data.data ?? [],
    meta: 'meta' in data ? data.meta : undefined,
    message: data.message,
  };
}

/** `GET /documents/:id` */
export async function getDocument(documentId: string) {
  const { data } = await apiClient.get<ApiResponse<PublicDocument>>(
    `/documents/${documentId}`,
  );
  if (!data.data) {
    throw new Error(data.message || 'Document not found');
  }
  return data.data;
}

/** `POST /documents/:id/archive` */
export async function archiveDocument(documentId: string) {
  const { data } = await apiClient.post<ApiResponse<PublicDocument>>(
    `/documents/${documentId}/archive`,
  );
  if (!data.data) {
    throw new Error(data.message || 'Archive failed');
  }
  return data.data;
}

/** `POST /documents/:id/replace` — new version + new upload URL */
export async function replaceDocument(
  documentId: string,
  body: PresignUploadRequest,
) {
  const { data } = await apiClient.post<ApiResponse<PresignUploadResult>>(
    `/documents/${documentId}/replace`,
    body,
  );
  if (!data.data) {
    throw new Error(data.message || 'Replace failed');
  }
  return data.data;
}
