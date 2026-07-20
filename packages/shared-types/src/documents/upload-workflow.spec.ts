import { DocumentStatus } from './status';
import { executeDocumentUpload, type DocumentUploadAdapters } from './upload-workflow';
import type { PublicDocument } from './types';

function doc(overrides: Partial<PublicDocument> = {}): PublicDocument {
  return {
    id: 'doc-1',
    documentCode: 'DOC-1',
    companyId: null,
    projectId: null,
    module: 'investors',
    entityType: 'investor',
    entityId: '507f1f77bcf86cd799439011',
    fileName: 'doc-1-v1.pdf',
    originalFileName: 'passport.pdf',
    mimeType: 'application/pdf',
    size: 100,
    checksum: null,
    s3Key: 'key',
    uploadedBy: 'u1',
    uploadedAt: null,
    documentType: 'kyc',
    version: 1,
    status: DocumentStatus.PendingUpload,
    malwareScanStatus: 'pending',
    previousVersionId: null,
    replaceGroupKey: null,
    ...overrides,
  };
}

describe('executeDocumentUpload', () => {
  it('runs presign → PUT → confirm and returns only active documents', async () => {
    const phases: string[] = [];
    const adapters: DocumentUploadAdapters = {
      assertLocalFile: jest.fn(),
      presign: jest.fn(async () => ({
        document: doc(),
        upload: {
          url: 'https://s3.example/upload',
          method: 'PUT',
          expiresIn: 900,
          headers: { 'Content-Type': 'application/pdf', 'Content-Length': '100' },
        },
        security: {
          bucketPrivate: true,
          publicAccess: false,
          mimeValidated: true,
          sizeValidated: true,
          extensionSource: 'mime_type',
        },
      })),
      putToPresignedUrl: jest.fn(async ({ onProgress }) => {
        onProgress?.(0.5);
        onProgress?.(1);
      }),
      confirm: jest.fn(async () =>
        doc({ status: DocumentStatus.Active, checksum: 'abc' }),
      ),
      computeChecksum: jest.fn(async () => 'abc'),
    };

    const result = await executeDocumentUpload(
      adapters,
      {
        module: 'investors',
        entityType: 'investor',
        entityId: '507f1f77bcf86cd799439011',
        documentType: 'KYC',
      },
      {
        name: 'passport.pdf',
        mimeType: 'application/pdf',
        size: 100,
        source: null,
      },
      (p) => phases.push(p.phase),
    );

    expect(result.status).toBe(DocumentStatus.Active);
    expect(adapters.presign).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'kyc' }),
    );
    expect(adapters.putToPresignedUrl).toHaveBeenCalled();
    expect(adapters.confirm).toHaveBeenCalledWith('doc-1', { checksum: 'abc' });
    expect(phases[0]).toBe('validating');
    expect(phases).toContain('presigning');
    expect(phases.filter((p) => p === 'uploading').length).toBeGreaterThan(0);
    expect(phases).toContain('confirming');
    expect(phases.at(-1)).toBe('confirmed');
  });


  it('retries can re-invoke after put failure', async () => {
    let puts = 0;
    const adapters: DocumentUploadAdapters = {
      assertLocalFile: () => undefined,
      presign: async () => ({
        document: doc({ id: `doc-${puts + 1}` }),
        upload: {
          url: 'https://s3.example/upload',
          method: 'PUT',
          expiresIn: 900,
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
      putToPresignedUrl: async () => {
        puts += 1;
        if (puts === 1) throw new Error('network fail');
      },
      confirm: async (id) => doc({ id, status: DocumentStatus.Active }),
    };

    await expect(
      executeDocumentUpload(
        adapters,
        {
          module: 'investors',
          entityType: 'investor',
          entityId: '507f1f77bcf86cd799439011',
          documentType: 'kyc',
        },
        {
          name: 'a.pdf',
          mimeType: 'application/pdf',
          size: 10,
          source: null,
        },
      ),
    ).rejects.toThrow('network fail');

    const ok = await executeDocumentUpload(
      adapters,
      {
        module: 'investors',
        entityType: 'investor',
        entityId: '507f1f77bcf86cd799439011',
        documentType: 'kyc',
      },
      {
        name: 'a.pdf',
        mimeType: 'application/pdf',
        size: 10,
        source: null,
      },
    );
    expect(ok.status).toBe(DocumentStatus.Active);
    expect(puts).toBe(2);
  });

  it('rejects invalid documentType before presign', async () => {
    const adapters: DocumentUploadAdapters = {
      assertLocalFile: () => undefined,
      presign: jest.fn(),
      putToPresignedUrl: jest.fn(),
      confirm: jest.fn(),
    };
    await expect(
      executeDocumentUpload(
        adapters,
        {
          module: 'investors',
          entityType: 'investor',
          entityId: '507f1f77bcf86cd799439011',
          documentType: 'Bad Type!',
        },
        {
          name: 'a.pdf',
          mimeType: 'application/pdf',
          size: 10,
          source: null,
        },
      ),
    ).rejects.toThrow(/documentType/);
    expect(adapters.presign).not.toHaveBeenCalled();
  });
});
