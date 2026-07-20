import { apiClient, apiGet, apiPatch, apiPost } from '@/api/client';
import type { PaginationMeta } from '@/api/types';
import type {
  AttachSignaturesInput,
  CashAccount,
  CreateSignedPaymentVoucherInput,
  SignedPaymentVoucher,
  SignedPaymentVoucherStatus,
} from './types';
import { SIGNED_PAYMENT_VOUCHER_TYPE } from './types';

const VOUCHERS_BASE = '/signed-payment-vouchers';

export async function listLabourVouchers(params: {
  projectId: string;
  status?: SignedPaymentVoucherStatus;
  page?: number;
  limit?: number;
}): Promise<{ items: SignedPaymentVoucher[]; meta?: PaginationMeta }> {
  const response = await apiGet<SignedPaymentVoucher[]>(VOUCHERS_BASE, {
    projectId: params.projectId,
    voucherType: SIGNED_PAYMENT_VOUCHER_TYPE.Labour,
    status: params.status,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });
  return {
    items: response.data ?? [],
    meta: response.meta as PaginationMeta | undefined,
  };
}

export async function getLabourVoucher(
  id: string,
): Promise<SignedPaymentVoucher> {
  const response = await apiGet<SignedPaymentVoucher>(`${VOUCHERS_BASE}/${id}`);
  if (!response.data) {
    throw new Error(response.message || 'Labour voucher not found');
  }
  return response.data;
}

export async function createLabourVoucher(
  input: CreateSignedPaymentVoucherInput,
  idempotencyKey?: string,
): Promise<SignedPaymentVoucher> {
  const { data } = await apiClient.post<{
    success: boolean;
    message?: string;
    data?: SignedPaymentVoucher;
  }>(VOUCHERS_BASE, input, {
    headers: idempotencyKey
      ? { 'Idempotency-Key': idempotencyKey }
      : undefined,
  });
  if (!data.data) {
    throw new Error(data.message || 'Could not create labour voucher');
  }
  return data.data;
}

export async function updateLabourVoucher(
  id: string,
  patch: Partial<
    Omit<CreateSignedPaymentVoucherInput, 'projectId' | 'voucherType'>
  >,
): Promise<SignedPaymentVoucher> {
  const response = await apiPatch<SignedPaymentVoucher>(
    `${VOUCHERS_BASE}/${id}`,
    patch,
  );
  if (!response.data) {
    throw new Error(response.message || 'Could not update labour voucher');
  }
  return response.data;
}

export async function attachLabourVoucherSignatures(
  id: string,
  input: AttachSignaturesInput,
): Promise<SignedPaymentVoucher> {
  const response = await apiPost<SignedPaymentVoucher>(
    `${VOUCHERS_BASE}/${id}/signatures`,
    input,
  );
  if (!response.data) {
    throw new Error(response.message || 'Could not attach signatures');
  }
  return response.data;
}

export async function submitLabourVoucher(
  id: string,
): Promise<SignedPaymentVoucher> {
  const response = await apiPost<SignedPaymentVoucher>(
    `${VOUCHERS_BASE}/${id}/submit`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Could not submit labour voucher');
  }
  return response.data;
}

export async function listPettyCashAccounts(
  projectId: string,
): Promise<CashAccount[]> {
  const response = await apiGet<CashAccount[]>('/cash-accounts', {
    projectId,
    kind: 'petty_cash',
    status: 'active',
    limit: 50,
  });
  return response.data ?? [];
}

export type PresignUploadResult = {
  documentId: string;
  uploadUrl: string;
  method: 'PUT' | 'POST';
};

export async function presignVoucherDocumentUpload(input: {
  projectId: string;
  voucherId: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  documentType: string;
}): Promise<PresignUploadResult> {
  const response = await apiPost<{
    document: { id: string };
    upload: { url: string; method?: string };
  }>('/documents/presign-upload', {
    projectId: input.projectId,
    module: 'signed_payment_vouchers',
    entityType: 'payment_voucher',
    entityId: input.voucherId,
    originalFileName: input.originalFileName,
    mimeType: input.mimeType,
    size: input.size,
    documentType: input.documentType,
  });
  const payload = response.data;
  if (!payload?.document?.id || !payload.upload?.url) {
    throw new Error(response.message || 'Presign upload failed');
  }
  return {
    documentId: payload.document.id,
    uploadUrl: payload.upload.url,
    method: (payload.upload.method as 'PUT' | 'POST' | undefined) ?? 'PUT',
  };
}

export async function confirmDocumentUpload(documentId: string): Promise<void> {
  await apiPost(`/documents/${documentId}/confirm-upload`, {});
}

export async function getDocumentDownloadUrl(
  documentId: string,
): Promise<string> {
  const response = await apiGet<{
    download: { url: string };
  }>(`/documents/${documentId}/download-url`);
  const url = response.data?.download?.url;
  if (!url) {
    throw new Error(response.message || 'PDF download URL unavailable');
  }
  return url;
}
