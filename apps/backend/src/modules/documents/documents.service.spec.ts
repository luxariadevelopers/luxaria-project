import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { DocumentsService } from './documents.service';
import type { S3StorageService } from './s3-storage.service';
import {
  DocumentStatus,
  MalwareScanStatus,
  StoredDocument,
  StoredDocumentSchema,
} from './schemas/document.schema';

describe('DocumentsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let documentModel: Model<StoredDocument>;
  let service: DocumentsService;
  let s3Mock: {
    maxUploadBytes: number;
    createPresignedUpload: jest.Mock;
    createPresignedDownload: jest.Mock;
    headObject: jest.Mock;
    prefix: string;
  };
  const actorId = new Types.ObjectId().toHexString();
  const entityId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    documentModel = connection.model(
      StoredDocument.name,
      StoredDocumentSchema,
    ) as Model<StoredDocument>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;
    await Promise.all([documentModel.syncIndexes(), counterModel.syncIndexes()]);

    s3Mock = {
      maxUploadBytes: 25 * 1024 * 1024,
      prefix: 'luxaria-developers/',
      createPresignedUpload: jest.fn().mockResolvedValue({
        url: 'https://s3.example.test/upload',
        expiresIn: 900,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': '1024',
        },
      }),
      createPresignedDownload: jest.fn().mockResolvedValue({
        url: 'https://s3.example.test/download',
        expiresIn: 900,
      }),
      headObject: jest.fn().mockResolvedValue({
        contentLength: 1024,
        contentType: 'application/pdf',
        checksumSha256:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        eTag: 'abc',
      }),
    };

    service = new DocumentsService(
      documentModel,
      new NumberingService(counterModel),
      s3Mock as unknown as S3StorageService,
      {
        assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
        assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
        mergeAuthorisedProjectFilter: jest
          .fn()
          .mockImplementation(async (_actor: string, filter: unknown) => filter),
      } as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await documentModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    jest.clearAllMocks();
    s3Mock.createPresignedUpload.mockResolvedValue({
      url: 'https://s3.example.test/upload',
      expiresIn: 900,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': '1024',
      },
    });
    s3Mock.createPresignedDownload.mockResolvedValue({
      url: 'https://s3.example.test/download',
      expiresIn: 900,
    });
    s3Mock.headObject.mockResolvedValue({
      contentLength: 1024,
      contentType: 'application/pdf',
      checksumSha256:
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      eTag: 'abc',
    });
  });

  it('presigns upload with MIME-derived extension and rejects bad MIME/size', async () => {
    await expect(
      service.createPresignedUpload(
        {
          module: 'investors',
          entityType: 'investor',
          entityId,
          originalFileName: 'secret.exe',
          mimeType: 'application/x-msdownload',
          size: 100,
          documentType: 'kyc',
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createPresignedUpload(
        {
          module: 'investors',
          entityType: 'investor',
          entityId,
          originalFileName: 'big.pdf',
          mimeType: 'application/pdf',
          size: 50 * 1024 * 1024,
          documentType: 'kyc',
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const ok = await service.createPresignedUpload(
      {
        module: 'investors',
        entityType: 'investor',
        entityId,
        originalFileName: 'passport.PDF.evil',
        mimeType: 'application/pdf',
        size: 1024,
        documentType: 'kyc',
      },
      actorId,
    );

    expect(ok.data?.document.fileName).toMatch(/\.pdf$/);
    expect(ok.data?.document.fileName).not.toContain('evil');
    expect(ok.data?.document.status).toBe(DocumentStatus.PendingUpload);
    expect(ok.data?.document.malwareScanStatus).toBe(MalwareScanStatus.Pending);
    expect(ok.data?.upload.url).toContain('https://');
    expect(ok.data?.security.publicAccess).toBe(false);
    expect(ok.data?.security.extensionSource).toBe('mime_type');
    expect(s3Mock.createPresignedUpload).toHaveBeenCalled();
  });

  it('confirms upload, stores checksum, and issues download URL', async () => {
    const created = await service.createPresignedUpload(
      {
        module: 'projects',
        entityType: 'project',
        entityId,
        originalFileName: 'plan.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        documentType: 'agreement',
      },
      actorId,
    );

    const confirmed = await service.confirmUpload(
      created.data!.document.id,
      {
        checksum:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
      actorId,
    );

    expect(confirmed.data?.status).toBe(DocumentStatus.Active);
    expect(confirmed.data?.checksum).toHaveLength(64);
    expect(confirmed.data?.uploadedAt).toBeTruthy();
    expect(s3Mock.headObject).toHaveBeenCalled();

    const download = await service.createPresignedDownload(
      created.data!.document.id,
    );
    expect(download.data?.download.url).toBe('https://s3.example.test/download');
    expect(download.data?.security.bucketPrivate).toBe(true);
  });

  it('versions replacements without overwriting prior rows', async () => {
    const v1 = await service.createPresignedUpload(
      {
        module: 'directors',
        entityType: 'director',
        entityId,
        originalFileName: 'din.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        documentType: 'din',
      },
      actorId,
    );
    await service.confirmUpload(v1.data!.document.id, {}, actorId);

    const replace = await service.replaceDocument(
      v1.data!.document.id,
      {
        module: 'directors',
        entityType: 'director',
        entityId,
        originalFileName: 'din-v2.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        documentType: 'din',
      },
      actorId,
    );

    expect(replace.data?.document.version).toBe(2);
    expect(replace.data?.document.documentCode).toBe(
      v1.data?.document.documentCode,
    );

    s3Mock.headObject.mockResolvedValue({
      contentLength: 2048,
      contentType: 'application/pdf',
      checksumSha256: 'aa'.repeat(32),
      eTag: 'def',
    });

    await service.confirmUpload(replace.data!.document.id, {}, actorId);

    const prior = await documentModel.findById(v1.data!.document.id).lean();
    const next = await documentModel
      .findById(replace.data!.document.id)
      .lean();
    expect(prior?.status).toBe(DocumentStatus.Replaced);
    expect(next?.status).toBe(DocumentStatus.Active);
    expect(next?.version).toBe(2);

    const listed = await service.listEntityDocuments({
      entityType: 'director',
      entityId,
      module: 'directors',
    });
    expect(listed.data?.some((d) => d.status === DocumentStatus.Active)).toBe(
      true,
    );
  });

  it('archives documents', async () => {
    const created = await service.createPresignedUpload(
      {
        module: 'company',
        entityType: 'company',
        entityId,
        originalFileName: 'logo.png',
        mimeType: 'image/png',
        size: 512,
        documentType: 'logo',
      },
      actorId,
    );
    s3Mock.headObject.mockResolvedValue({
      contentLength: 512,
      contentType: 'image/png',
      checksumSha256: null,
      eTag: 'etag1',
    });
    await service.confirmUpload(created.data!.document.id, {}, actorId);
    const archived = await service.archiveDocument(
      created.data!.document.id,
      actorId,
    );
    expect(archived.data?.status).toBe(DocumentStatus.Archived);
  });
});
