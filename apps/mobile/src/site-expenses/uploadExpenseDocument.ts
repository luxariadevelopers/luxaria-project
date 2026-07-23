import * as FileSystem from 'expo-file-system/legacy';
import {
  type LocalFile,
  uploadToPresignedUrl,
} from '@/utils/fileUpload';
import {
  confirmExpenseDocumentUpload,
  presignExpenseDocumentUpload,
} from './api';

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
 * Presign → S3 PUT → confirm for a site-expense signature/photo document.
 */
export async function uploadExpenseDocument(input: {
  projectId: string;
  voucherId: string;
  documentType?: string;
  file: LocalFile;
}): Promise<string> {
  const size = await resolveFileSize(input.file);
  const documentType = input.documentType ?? 'signature';
  const presign = await presignExpenseDocumentUpload({
    projectId: input.projectId,
    voucherId: input.voucherId,
    originalFileName: input.file.name,
    mimeType: input.file.mimeType,
    size,
    documentType,
  });

  await uploadToPresignedUrl(
    input.file,
    presign.uploadUrl,
    presign.method,
  );
  await confirmExpenseDocumentUpload(presign.documentId);
  return presign.documentId;
}
