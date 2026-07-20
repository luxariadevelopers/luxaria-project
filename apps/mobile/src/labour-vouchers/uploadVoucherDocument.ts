import * as FileSystem from 'expo-file-system/legacy';
import {
  type LocalFile,
  uploadToPresignedUrl,
} from '@/utils/fileUpload';
import {
  confirmDocumentUpload,
  presignVoucherDocumentUpload,
} from './api';
import type { SignatureSlot } from './types';

async function resolveFileSize(file: LocalFile): Promise<number> {
  if (typeof file.size === 'number' && file.size > 0) {
    return file.size;
  }
  const info = await FileSystem.getInfoAsync(file.uri);
  if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0) {
    return info.size;
  }
  // Nest requires size >= 1; use a safe minimum when platform omits size.
  return 1;
}

/**
 * Presign → S3 PUT → confirm for a voucher signature/photo document.
 */
export async function uploadVoucherDocument(input: {
  projectId: string;
  voucherId: string;
  documentType: SignatureSlot;
  file: LocalFile;
}): Promise<string> {
  const size = await resolveFileSize(input.file);
  const presign = await presignVoucherDocumentUpload({
    projectId: input.projectId,
    voucherId: input.voucherId,
    originalFileName: input.file.name,
    mimeType: input.file.mimeType,
    size,
    documentType: input.documentType,
  });

  await uploadToPresignedUrl(
    input.file,
    presign.uploadUrl,
    presign.method,
  );
  await confirmDocumentUpload(presign.documentId);
  return presign.documentId;
}
