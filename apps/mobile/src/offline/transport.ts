import { ERROR_CODES, type ApiError } from '@luxaria/shared-types';
import axios from 'axios';
import { apiClient, getErrorMessage } from '@/api/client';
import {
  prepareCreateBody,
  submitAfterCreatePath,
  wantsSubmitAfterCreate,
} from './submitAfterCreate';
import { uploadToPresignedUrl } from '@/utils/fileUpload';
import {
  createSyncConflictError,
  createSyncForbiddenError,
  createSyncPermanentError,
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

function readApiError(error: unknown): ApiError | null {
  if (!axios.isAxiosError<ApiError>(error)) return null;
  const data = error.response?.data;
  if (data && typeof data === 'object' && data.success === false) {
    return data;
  }
  return null;
}

function readConflictServerTimestamp(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  const data = error.response?.data;
  if (typeof data === 'object' && data && 'data' in data) {
    const nested = (data as { data?: { serverTimestamp?: string } }).data;
    return nested?.serverTimestamp
      ? String(nested.serverTimestamp)
      : null;
  }
  return null;
}

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

        const submitAfter = wantsSubmitAfterCreate(txn.type, payload);
        const body = submitAfter ? prepareCreateBody(txn.type, payload) : payload;

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

        const submitPath = submitAfter
          ? submitAfterCreatePath(txn.type, String(serverRecordId))
          : null;
        if (submitAfter && submitPath) {
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
          }>(submitPath, {}, {
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
          const apiError = readApiError(error);
          const errorCode = apiError?.errorCode ?? null;
          const message = getErrorMessage(error, 'Sync failed');

          if (status === 409 || errorCode === ERROR_CODES.CONFLICT) {
            throw createSyncConflictError(
              message || 'Sync conflict',
              readConflictServerTimestamp(error),
            );
          }

          if (
            status === 403 ||
            errorCode === ERROR_CODES.FORBIDDEN
          ) {
            throw createSyncForbiddenError(
              message || 'Permission denied for this sync',
              errorCode,
            );
          }

          if (
            status === 422 ||
            status === 400 ||
            errorCode === ERROR_CODES.VALIDATION_ERROR ||
            errorCode === ERROR_CODES.BAD_REQUEST
          ) {
            throw createSyncPermanentError(
              message || 'Validation rejected this sync',
              errorCode,
            );
          }
        }
        throw error;
      }
    },
  };
}
