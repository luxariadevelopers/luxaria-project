import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { apiPost } from '@/api/client';
import {
  type LocalFile,
  uploadToPresignedUrl,
} from '@/utils/fileUpload';

export type UploadedSignatureDocument = {
  documentId: string;
  checksum: string;
};

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  if (typeof globalThis.atob !== 'function') {
    throw new Error('Base64 decoder unavailable for signature checksum');
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** SHA-256 hex of local file bytes (Nest signature checksum). */
export async function computeLocalFileSha256(file: LocalFile): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = decodeBase64ToUint8Array(base64);
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function resolveFileSize(file: LocalFile): Promise<number> {
  if (typeof file.size === 'number' && file.size > 0) {
    return file.size;
  }
  const info = await FileSystem.getInfoAsync(file.uri);
  if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0) {
    return info.size;
  }
  return 1;
}

/**
 * Presign → S3 PUT → confirm for a material-issue signature document.
 * Returns document id + SHA-256 for `POST …/signatures`.
 */
export async function uploadMaterialIssueSignature(input: {
  projectId: string;
  issueId: string;
  file: LocalFile;
  documentType?: 'signature' | 'issuer_signature';
}): Promise<UploadedSignatureDocument> {
  const size = await resolveFileSize(input.file);
  const clientChecksum = await computeLocalFileSha256(input.file);

  const presign = await apiPost<{
    document: { id: string };
    upload: { url: string; method?: string };
  }>('/documents/presign-upload', {
    projectId: input.projectId,
    module: 'material_issues',
    entityType: 'material_issue',
    entityId: input.issueId,
    originalFileName: input.file.name,
    mimeType: input.file.mimeType,
    size,
    documentType: input.documentType ?? 'signature',
  });

  const documentId = presign.data?.document?.id;
  const uploadUrl = presign.data?.upload?.url;
  if (!documentId || !uploadUrl) {
    throw new Error(presign.message || 'Signature upload presign failed');
  }

  await uploadToPresignedUrl(
    input.file,
    uploadUrl,
    (presign.data?.upload?.method as 'PUT' | 'POST' | undefined) ?? 'PUT',
  );

  const confirmed = await apiPost<{ id?: string; checksum?: string | null }>(
    `/documents/${encodeURIComponent(documentId)}/confirm-upload`,
    { checksum: clientChecksum },
  );

  const checksum = (confirmed.data?.checksum ?? clientChecksum)?.toLowerCase();
  if (!checksum || !/^[a-f0-9]{64}$/.test(checksum)) {
    throw new Error('Signature document checksum unavailable after upload');
  }

  return { documentId, checksum };
}
