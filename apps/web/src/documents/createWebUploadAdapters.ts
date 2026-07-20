import {
  type DocumentUploadAdapters,
  type LocalUploadFile,
} from '@luxaria/shared-types';
import {
  confirmDocumentUpload,
  presignDocumentUpload,
} from '@/api/documents';
import { computeSha256Hex } from './checksum';
import { putFileToPresignedUrl } from './putToS3';
import { assertWebLocalFile } from './validateLocalFile';

export function createWebUploadAdapters(): DocumentUploadAdapters {
  return {
    assertLocalFile: assertWebLocalFile,
    presign: (body) => presignDocumentUpload(body),
    putToPresignedUrl: putFileToPresignedUrl,
    confirm: (id, body) => confirmDocumentUpload(id, body),
    computeChecksum: (file: LocalUploadFile) => computeSha256Hex(file),
  };
}
