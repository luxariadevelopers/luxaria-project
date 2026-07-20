import axios from 'axios';
import { apiClient, getErrorMessage } from '@/api/client';
import {
  mergeStockCountItemPhotos,
  wantsStockCountSubmitAfterCreate,
} from '@/stock-count/mergeItemPhotos';
import { uploadToPresignedUrl } from '@/utils/fileUpload';
import {
  createSyncConflictError,
  type OfflineMedia,
  type OfflineTransaction,
  type SyncTransactionResult,
} from './types';

export type OfflineSyncTransport = {
  uploadMedia(media: OfflineMedia, projectId: string | null): Promise<string>;
  syncTransaction(
    txn: OfflineTransaction,
    payload: Record<string, unknown>,
  ): Promise<SyncTransactionResult>;
};

type PresignResponse = {
  id: string;
  upload?: { url: string; method?: string };
};

type ConfirmIgnored = { id?: string };

/**
 * HTTP transport: upload media via documents presign, then sync with Idempotency-Key.
 */
export function createHttpOfflineTransport(): OfflineSyncTransport {
  return {
    async uploadMedia(media, projectId) {
      const meta = media.uploadMetaJson
        ? (JSON.parse(media.uploadMetaJson) as Record<string, unknown>)
        : {};

      const body = {
        module: String(meta.module ?? 'mobile_offline'),
        entityType: String(meta.entityType ?? 'offline_transaction'),
        entityId: String(meta.entityId ?? media.transactionId),
        originalFileName: media.fileName,
        mimeType: media.mimeType,
        size: Number(meta.size ?? 1),
        documentType: String(
          meta.documentType ?? (media.fieldKey || 'attachment'),
        ),
        projectId: projectId ?? meta.projectId ?? undefined,
        companyId: meta.companyId ?? undefined,
      };

      const presign = await apiClient.post<{
        success: boolean;
        data?: PresignResponse;
        message?: string;
      }>('/documents/presign-upload', body);

      const doc = presign.data.data;
      const uploadUrl = doc?.upload?.url;
      if (!doc?.id || !uploadUrl) {
        throw new Error(presign.data.message || 'Presign upload failed');
      }

      await uploadToPresignedUrl(
        {
          uri: media.localPath,
          name: media.fileName,
          mimeType: media.mimeType,
        },
        uploadUrl,
        (doc.upload?.method as 'PUT' | 'POST' | undefined) ?? 'PUT',
      );

      await apiClient.post<{ success: boolean; data?: ConfirmIgnored }>(
        `/documents/${doc.id}/confirm-upload`,
        {},
      );

      return doc.id;
    },

    async syncTransaction(txn, payload) {
      try {
        const headers = {
          'Idempotency-Key': txn.idempotencyKey,
          ...(txn.projectId ? { 'X-Project-Id': txn.projectId } : {}),
        };

        const submitAfter = wantsStockCountSubmitAfterCreate(txn.type, payload);
        const body = submitAfter
          ? mergeStockCountItemPhotos(payload)
          : payload;

        const response = await apiClient.request<{
          success: boolean;
          message?: string;
          data?: {
            id?: string;
            _id?: string;
            serverTimestamp?: string;
            updatedAt?: string;
            createdAt?: string;
          };
        }>({
          url: txn.endpoint,
          method: txn.method,
          data: body,
          headers,
        });

        const data = response.data.data;
        let serverRecordId = data?.id ?? data?._id;
        if (!serverRecordId) {
          throw new Error(
            response.data.message || 'Sync succeeded without server record id',
          );
        }

        let serverTimestamp =
          data?.serverTimestamp ??
          data?.updatedAt ??
          data?.createdAt ??
          new Date().toISOString();

        let responseBody: unknown = response.data;

        // Nest stock counts: create is draft-only; submit is a separate POST.
        if (submitAfter) {
          const submitted = await apiClient.post<{
            success: boolean;
            message?: string;
            data?: {
              id?: string;
              _id?: string;
              serverTimestamp?: string;
              updatedAt?: string;
              createdAt?: string;
            };
          }>(`/stock-counts/${encodeURIComponent(String(serverRecordId))}/submit`, {}, {
            headers,
          });
          const submittedData = submitted.data.data;
          serverRecordId =
            submittedData?.id ?? submittedData?._id ?? serverRecordId;
          serverTimestamp =
            submittedData?.serverTimestamp ??
            submittedData?.updatedAt ??
            submittedData?.createdAt ??
            serverTimestamp;
          responseBody = submitted.data;
        }

        return {
          serverRecordId: String(serverRecordId),
          serverTimestamp: String(serverTimestamp),
          response: responseBody,
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 409) {
            throw createSyncConflictError(
              getErrorMessage(error, 'Sync conflict'),
              typeof error.response?.data === 'object' &&
                error.response?.data &&
                'data' in error.response.data
                ? String(
                    (error.response.data as { data?: { serverTimestamp?: string } })
                      .data?.serverTimestamp ?? '',
                  ) || null
                : null,
            );
          }
        }
        throw error;
      }
    },
  };
}
