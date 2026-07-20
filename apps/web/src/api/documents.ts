import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient } from './client';

type DocumentDownloadPayload = {
  download?: {
    url: string;
    method?: string;
    expiresIn?: number;
  };
};

/** `GET /documents/:id/download-url` — requires `document.download`. */
export async function getDocumentDownloadUrl(documentId: string) {
  const { data } = await apiClient.get<ApiResponse<DocumentDownloadPayload>>(
    `/documents/${documentId}/download-url`,
  );
  if (!data.data) {
    throw new Error(data.message || 'Download URL failed');
  }
  return data.data;
}
