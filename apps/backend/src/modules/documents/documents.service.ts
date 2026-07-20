import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomUUID } from 'node:crypto';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  extensionForMime,
  isAllowedMimeType,
} from './documents.constants';
import { toPublicDocument } from './documents.mapper';
import type {
  ConfirmUploadDto,
  PresignUploadDto,
} from './dto/presign-upload.dto';
import { S3StorageService } from './s3-storage.service';
import {
  DocumentStatus,
  MalwareScanStatus,
  StoredDocument,
} from './schemas/document.schema';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(StoredDocument.name)
    private readonly documentModel: Model<StoredDocument>,
    private readonly numberingService: NumberingService,
    private readonly s3Storage: S3StorageService,
  ) {}

  async createPresignedUpload(dto: PresignUploadDto, actorId: string) {
    this.assertMimeAndSize(dto.mimeType, dto.size);

    const mimeType = dto.mimeType.toLowerCase().trim();
    const ext = extensionForMime(mimeType);
    const documentCode = await this.numberingService.nextCode(
      NumberEntityType.DOCUMENT,
      dto.projectId
        ? { projectId: dto.projectId, projectScoped: true }
        : {},
    );

    const version = 1;
    const fileName = `${documentCode.toLowerCase()}-v${version}.${ext}`;
    const replaceGroupKey = randomUUID();
    const s3Key = this.buildS3Key({
      companyId: dto.companyId ?? null,
      projectId: dto.projectId ?? null,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      documentCode,
      version,
      fileName,
    });

    const doc = await this.documentModel.create({
      documentCode,
      companyId: dto.companyId ? new Types.ObjectId(dto.companyId) : null,
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      module: dto.module.toLowerCase(),
      entityType: dto.entityType.toLowerCase(),
      entityId: new Types.ObjectId(dto.entityId),
      fileName,
      originalFileName: dto.originalFileName.trim(),
      mimeType,
      size: dto.size,
      checksum: null,
      s3Key,
      uploadedBy: new Types.ObjectId(actorId),
      uploadedAt: null,
      documentType: dto.documentType.toLowerCase(),
      version,
      status: DocumentStatus.PendingUpload,
      malwareScanStatus: MalwareScanStatus.Pending,
      previousVersionId: null,
      replaceGroupKey,
      createdBy: new Types.ObjectId(actorId),
    });

    const presigned = await this.s3Storage.createPresignedUpload({
      s3Key,
      mimeType,
      contentLength: dto.size,
    });

    return createSuccessResponse(
      {
        document: toPublicDocument(doc),
        upload: {
          url: presigned.url,
          method: 'PUT',
          expiresIn: presigned.expiresIn,
          headers: presigned.headers,
        },
        security: {
          bucketPrivate: true,
          publicAccess: false,
          mimeValidated: true,
          sizeValidated: true,
          extensionSource: 'mime_type',
        },
      },
      'Presigned upload URL generated',
    );
  }

  async confirmUpload(
    documentId: string,
    dto: ConfirmUploadDto,
    actorId: string,
  ) {
    const doc = await this.requireDocument(documentId);
    if (doc.status !== DocumentStatus.PendingUpload) {
      throw new BadRequestException(
        'Only pending_upload documents can be confirmed',
      );
    }

    const head = await this.s3Storage.headObject(doc.s3Key);
    if (head.contentLength <= 0) {
      throw new BadRequestException('Uploaded object is empty or missing');
    }
    if (head.contentLength > this.s3Storage.maxUploadBytes) {
      throw new BadRequestException(
        `Uploaded object exceeds maximum size of ${this.s3Storage.maxUploadBytes} bytes`,
      );
    }
    if (Math.abs(head.contentLength - doc.size) > 0) {
      // Allow small mismatch only if client underestimated; store actual size
      if (head.contentLength > this.s3Storage.maxUploadBytes) {
        throw new BadRequestException('Uploaded object too large');
      }
    }
    if (
      head.contentType &&
      head.contentType.toLowerCase() !== doc.mimeType &&
      !head.contentType.toLowerCase().startsWith(doc.mimeType)
    ) {
      throw new BadRequestException(
        `Uploaded Content-Type ${head.contentType} does not match declared ${doc.mimeType}`,
      );
    }

    let checksum =
      head.checksumSha256 ??
      (dto.checksum ? dto.checksum.toLowerCase() : null);

    if (dto.checksum && head.checksumSha256) {
      if (dto.checksum.toLowerCase() !== head.checksumSha256) {
        throw new BadRequestException(
          'Client checksum does not match S3 object checksum',
        );
      }
    }

    // Fallback stable checksum from ETag when multipart not used (weak but stored)
    if (!checksum && head.eTag && !head.eTag.includes('-')) {
      checksum = createHash('sha256').update(head.eTag).digest('hex');
    }

    doc.size = head.contentLength;
    doc.checksum = checksum;
    doc.status = DocumentStatus.Active;
    doc.uploadedAt = new Date();
    doc.malwareScanStatus = MalwareScanStatus.Pending;
    doc.set('updatedBy', new Types.ObjectId(actorId));
    await doc.save();

    if (doc.previousVersionId) {
      await this.documentModel
        .updateOne(
          { _id: doc.previousVersionId, status: DocumentStatus.Active },
          {
            $set: {
              status: DocumentStatus.Replaced,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    return createSuccessResponse(
      toPublicDocument(doc),
      'Upload confirmed; document is active (malware scan pending)',
    );
  }

  async createPresignedDownload(documentId: string) {
    const doc = await this.requireDocument(documentId);
    if (
      doc.status !== DocumentStatus.Active &&
      doc.status !== DocumentStatus.Replaced
    ) {
      throw new BadRequestException(
        'Download is only available for active or replaced (historical) documents',
      );
    }
    if (doc.malwareScanStatus === MalwareScanStatus.Infected) {
      throw new BadRequestException(
        'Document failed malware scan and cannot be downloaded',
      );
    }

    const download = await this.s3Storage.createPresignedDownload({
      s3Key: doc.s3Key,
      fileName: doc.fileName,
    });

    return createSuccessResponse(
      {
        document: toPublicDocument(doc),
        download: {
          url: download.url,
          method: 'GET',
          expiresIn: download.expiresIn,
        },
        security: {
          bucketPrivate: true,
          publicAccess: false,
        },
      },
      'Presigned download URL generated',
    );
  }

  /**
   * Replace an active document — creates a new version; prior row marked replaced.
   */
  async replaceDocument(
    documentId: string,
    dto: PresignUploadDto,
    actorId: string,
  ) {
    const current = await this.requireDocument(documentId);
    if (current.status !== DocumentStatus.Active) {
      throw new BadRequestException('Only active documents can be replaced');
    }

    this.assertMimeAndSize(dto.mimeType, dto.size);
    const mimeType = dto.mimeType.toLowerCase().trim();
    const ext = extensionForMime(mimeType);
    const nextVersion = current.version + 1;
    const fileName = `${current.documentCode.toLowerCase()}-v${nextVersion}.${ext}`;
    const s3Key = this.buildS3Key({
      companyId: current.companyId ? String(current.companyId) : null,
      projectId: current.projectId ? String(current.projectId) : null,
      module: current.module,
      entityType: current.entityType,
      entityId: String(current.entityId),
      documentCode: current.documentCode,
      version: nextVersion,
      fileName,
    });

    const next = await this.documentModel.create({
      documentCode: current.documentCode,
      companyId: current.companyId,
      projectId: current.projectId,
      module: current.module,
      entityType: current.entityType,
      entityId: current.entityId,
      fileName,
      originalFileName: dto.originalFileName.trim(),
      mimeType,
      size: dto.size,
      checksum: null,
      s3Key,
      uploadedBy: new Types.ObjectId(actorId),
      uploadedAt: null,
      documentType: dto.documentType?.toLowerCase() ?? current.documentType,
      version: nextVersion,
      status: DocumentStatus.PendingUpload,
      malwareScanStatus: MalwareScanStatus.Pending,
      previousVersionId: current._id,
      replaceGroupKey: current.replaceGroupKey ?? String(current._id),
      createdBy: new Types.ObjectId(actorId),
    });

    // Keep current active until new version is confirmed; mark replaced on confirm of next
    const presigned = await this.s3Storage.createPresignedUpload({
      s3Key,
      mimeType,
      contentLength: dto.size,
    });

    return createSuccessResponse(
      {
        document: toPublicDocument(next),
        previousDocumentId: String(current._id),
        upload: {
          url: presigned.url,
          method: 'PUT',
          expiresIn: presigned.expiresIn,
          headers: presigned.headers,
        },
      },
      'Replacement upload URL generated; confirm to activate new version',
    );
  }

  async archiveDocument(documentId: string, actorId: string) {
    const doc = await this.requireDocument(documentId);
    if (
      doc.status !== DocumentStatus.Active &&
      doc.status !== DocumentStatus.PendingUpload
    ) {
      throw new BadRequestException(
        'Only active or pending documents can be archived',
      );
    }
    doc.status = DocumentStatus.Archived;
    doc.set('updatedBy', new Types.ObjectId(actorId));
    await doc.save();
    return createSuccessResponse(
      toPublicDocument(doc),
      'Document archived',
    );
  }

  async listEntityDocuments(query: {
    entityType: string;
    entityId: string;
    module?: string;
    projectId?: string;
    status?: DocumentStatus;
    page?: number;
    limit?: number;
    sortOrder?: 'asc' | 'desc';
  }) {
    if (!Types.ObjectId.isValid(query.entityId)) {
      throw new BadRequestException('Invalid entityId');
    }

    const filter: FilterQuery<StoredDocument> = {
      entityType: query.entityType.toLowerCase(),
      entityId: new Types.ObjectId(query.entityId),
    };
    if (query.module) filter.module = query.module.toLowerCase();
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = {
        $in: [DocumentStatus.Active, DocumentStatus.PendingUpload],
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort({ version: sortOrder, createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map(toPublicDocument),
      'Entity documents fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getById(documentId: string) {
    const doc = await this.requireDocument(documentId);
    return createSuccessResponse(
      toPublicDocument(doc),
      'Document fetched',
    );
  }

  /**
   * Load an active document for entity binding (signatures, vouchers, etc.).
   */
  async requireActiveDocument(documentId: string) {
    const doc = await this.requireDocument(documentId);
    if (doc.status !== DocumentStatus.Active) {
      throw new BadRequestException(
        'Document must be active (upload confirmed) before binding',
      );
    }
    if (!doc.checksum) {
      throw new BadRequestException(
        'Document has no checksum; re-confirm upload before binding',
      );
    }
    return doc;
  }

  /**
   * Server-side create + upload + activate (for generated PDFs).
   */
  async createActiveFromBuffer(
    input: {
      companyId?: string | null;
      projectId?: string | null;
      module: string;
      entityType: string;
      entityId: string;
      documentType: string;
      originalFileName: string;
      mimeType: string;
    },
    body: Buffer,
    actorId: string,
  ) {
    this.assertMimeAndSize(input.mimeType, body.length);

    const mimeType = input.mimeType.toLowerCase().trim();
    const ext = extensionForMime(mimeType);
    const documentCode = await this.numberingService.nextCode(
      NumberEntityType.DOCUMENT,
      input.projectId
        ? { projectId: input.projectId, projectScoped: true }
        : {},
    );
    const version = 1;
    const fileName = `${documentCode.toLowerCase()}-v${version}.${ext}`;
    const replaceGroupKey = randomUUID();
    const s3Key = this.buildS3Key({
      companyId: input.companyId ?? null,
      projectId: input.projectId ?? null,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      documentCode,
      version,
      fileName,
    });

    const uploaded = await this.s3Storage.putObject({
      s3Key,
      body,
      mimeType,
    });

    const doc = await this.documentModel.create({
      documentCode,
      companyId: input.companyId
        ? new Types.ObjectId(input.companyId)
        : null,
      projectId: input.projectId
        ? new Types.ObjectId(input.projectId)
        : null,
      module: input.module.toLowerCase(),
      entityType: input.entityType.toLowerCase(),
      entityId: new Types.ObjectId(input.entityId),
      fileName,
      originalFileName: input.originalFileName.trim(),
      mimeType,
      size: uploaded.contentLength,
      checksum: uploaded.checksumSha256,
      s3Key,
      uploadedBy: new Types.ObjectId(actorId),
      uploadedAt: new Date(),
      documentType: input.documentType.toLowerCase(),
      version,
      status: DocumentStatus.Active,
      malwareScanStatus: MalwareScanStatus.Skipped,
      previousVersionId: null,
      replaceGroupKey,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicDocument(doc),
      'Document uploaded to S3 and activated',
    );
  }

  /** Hook for async malware scanner — marks scan outcome. */
  async setMalwareScanStatus(
    documentId: string,
    status: MalwareScanStatus,
  ) {
    const doc = await this.requireDocument(documentId);
    doc.malwareScanStatus = status;
    await doc.save();
    return createSuccessResponse(
      toPublicDocument(doc),
      'Malware scan status updated',
    );
  }

  private assertMimeAndSize(mimeType: string, size: number) {
    if (!isAllowedMimeType(mimeType)) {
      throw new BadRequestException(
        `MIME type not allowed: ${mimeType}. Client file extension is ignored.`,
      );
    }
    if (!Number.isFinite(size) || size < 1) {
      throw new BadRequestException('size must be a positive number of bytes');
    }
    if (size > this.s3Storage.maxUploadBytes) {
      throw new BadRequestException(
        `File exceeds maximum size of ${this.s3Storage.maxUploadBytes} bytes`,
      );
    }
  }

  private buildS3Key(input: {
    companyId: string | null;
    projectId: string | null;
    module: string;
    entityType: string;
    entityId: string;
    documentCode: string;
    version: number;
    fileName: string;
  }): string {
    const companyPart = input.companyId ?? 'company-global';
    const projectPart = input.projectId ?? 'project-global';
    return [
      this.s3Storage.prefix.replace(/\/$/, ''),
      companyPart,
      projectPart,
      input.module,
      input.entityType,
      input.entityId,
      input.documentCode,
      `v${input.version}`,
      input.fileName,
    ].join('/');
  }

  private async requireDocument(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid document id');
    }
    const doc = await this.documentModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}
