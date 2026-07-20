import { describe, expect, it, vi } from 'vitest';
import {
  DocumentStatus,
  executeDocumentUpload,
  type DocumentUploadAdapters,
  type PublicDocument,
} from '@luxaria/shared-types';

function doc(overrides: Partial<PublicDocument> = {}): PublicDocument {
  return {
    id: '507f1f77bcf86cd799439011',
    documentCode: 'DOC-1',
    companyId: null,
    projectId: null,
    module: 'projects',
    entityType: 'project',
    entityId: '507f1f77bcf86cd799439012',
    fileName: 'x.pdf',
    originalFileName: 'x.pdf',
    mimeType: 'application/pdf',
    size: 12,
    checksum: null,
    s3Key: 'k',
    uploadedBy: 'u',
    uploadedAt: null,
    documentType: 'attachment',
    version: 1,
    status: DocumentStatus.PendingUpload,
    malwareScanStatus: 'pending',
    previousVersionId: null,
    replaceGroupKey: null,
    ...overrides,
  };
}

describe('web document upload workflow (mocked S3)', () => {
  it('completes presign → put → confirm', async () => {
    const put = vi.fn(async () => undefined);
    const adapters: DocumentUploadAdapters = {
      assertLocalFile: () => undefined,
      presign: async () => ({
        document: doc(),
        upload: {
          url: 'https://s3.test/put',
          method: 'PUT',
          expiresIn: 60,
          headers: { 'Content-Type': 'application/pdf' },
        },
        security: {
          bucketPrivate: true,
          publicAccess: false,
          mimeValidated: true,
          sizeValidated: true,
          extensionSource: 'mime_type',
        },
      }),
      putToPresignedUrl: put,
      confirm: async () => doc({ status: DocumentStatus.Active }),
    };

    const result = await executeDocumentUpload(
      adapters,
      {
        module: 'projects',
        entityType: 'project',
        entityId: '507f1f77bcf86cd799439012',
        documentType: 'attachment',
      },
      {
        name: 'x.pdf',
        mimeType: 'application/pdf',
        size: 12,
        source: new Blob(['hello']),
      },
    );

    expect(put).toHaveBeenCalledOnce();
    expect(result.status).toBe(DocumentStatus.Active);
  });

  it('surfaces put failures for retry', async () => {
    const adapters: DocumentUploadAdapters = {
      assertLocalFile: () => undefined,
      presign: async () => ({
        document: doc(),
        upload: {
          url: 'https://s3.test/put',
          method: 'PUT',
          expiresIn: 60,
          headers: {},
        },
        security: {
          bucketPrivate: true,
          publicAccess: false,
          mimeValidated: true,
          sizeValidated: true,
          extensionSource: 'mime_type',
        },
      }),
      putToPresignedUrl: async () => {
        throw new Error('S3 upload failed with status 503');
      },
      confirm: vi.fn(),
    };

    await expect(
      executeDocumentUpload(
        adapters,
        {
          module: 'projects',
          entityType: 'project',
          entityId: '507f1f77bcf86cd799439012',
          documentType: 'attachment',
        },
        {
          name: 'x.pdf',
          mimeType: 'application/pdf',
          size: 12,
          source: new Blob(['hello']),
        },
      ),
    ).rejects.toThrow(/503/);
    expect(adapters.confirm).not.toHaveBeenCalled();
  });
});
