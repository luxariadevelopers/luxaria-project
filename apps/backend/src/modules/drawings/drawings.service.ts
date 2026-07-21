import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { DatabaseService } from '../../database/services/database.service';
import { DocumentsService } from '../documents/documents.service';
import { SiteAccessService } from '../sites/site-access.service';
import type {
  CreateDrawingDto,
  CreateDrawingRevisionDto,
  ListDrawingsQueryDto,
} from './dto/drawing.dto';
import { Drawing, DrawingStatus } from './schemas/drawing.schema';

@Injectable()
export class DrawingsService {
  constructor(
    @InjectModel(Drawing.name)
    private readonly drawingModel: Model<Drawing>,
    private readonly documentsService: DocumentsService,
    private readonly siteAccessService: SiteAccessService,
    private readonly databaseService: DatabaseService,
  ) {}

  async create(dto: CreateDrawingDto, actorId: string) {
    await this.assertSiteAccess(actorId, dto.projectId, dto.siteId);
    await this.requireActiveDocument(dto.documentId, dto.projectId);
    await this.requireActiveDocuments(
      dto.markupDocumentIds ?? [],
      dto.projectId,
    );

    const status =
      dto.status === DrawingStatus.Issued
        ? DrawingStatus.Issued
        : DrawingStatus.Draft;
    const issuedAt =
      status === DrawingStatus.Issued
        ? dto.issuedAt
          ? new Date(dto.issuedAt)
          : new Date()
        : dto.issuedAt
          ? new Date(dto.issuedAt)
          : null;

    const drawingNumber = dto.drawingNumber.trim().toUpperCase();
    const revision = dto.revision.trim();
    await this.assertUniqueRevision(dto.projectId, drawingNumber, revision);

    const row = await this.drawingModel.create({
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      drawingNumber,
      title: dto.title.trim(),
      discipline: dto.discipline?.trim() || null,
      revision,
      isLatest: true,
      supersededById: null,
      status,
      documentId: new Types.ObjectId(dto.documentId),
      markupDocumentIds: (dto.markupDocumentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      issuedAt,
      notes: dto.notes?.trim() || null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(this.toPublic(row), 'Drawing created');
  }

  async list(query: ListDrawingsQueryDto, actorId: string) {
    if (query.siteId) {
      if (!query.projectId) {
        throw new BadRequestException(
          'projectId is required when filtering by siteId',
        );
      }
      await this.assertSiteAccess(actorId, query.projectId, query.siteId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<Drawing> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) {
      filter.siteId = new Types.ObjectId(query.siteId);
    }
    if (query.status) filter.status = query.status;
    if (query.isLatest !== undefined) filter.isLatest = query.isLatest;
    if (query.drawingNumber) {
      filter.drawingNumber = query.drawingNumber.trim().toUpperCase();
    }
    if (query.discipline) {
      filter.discipline = query.discipline.trim();
    }

    const sort: Record<string, SortOrder> = {
      drawingNumber: 1,
      createdAt: -1,
    };
    const [items, total] = await Promise.all([
      this.drawingModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.drawingModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => this.toPublic(row)),
      'Drawings fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireDrawing(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
    return createSuccessResponse(this.toPublic(row), 'Drawing fetched');
  }

  /**
   * Upload / replace revision: creates a new latest row and supersedes the
   * previous drawing (isLatest=false, status=superseded, supersededById=new).
   */
  async createRevision(
    id: string,
    dto: CreateDrawingRevisionDto,
    actorId: string,
  ) {
    const previous = await this.requireDrawing(id);
    await this.assertSiteAccess(
      actorId,
      String(previous.projectId),
      previous.siteId ? String(previous.siteId) : null,
    );

    if (previous.status === DrawingStatus.Archived) {
      throw new BadRequestException('Archived drawings cannot be revised');
    }
    if (previous.status === DrawingStatus.Superseded || !previous.isLatest) {
      throw new BadRequestException(
        'Only the latest non-superseded revision can be replaced',
      );
    }

    const projectId = String(previous.projectId);
    await this.requireActiveDocument(dto.documentId, projectId);
    await this.requireActiveDocuments(
      dto.markupDocumentIds ?? [],
      projectId,
    );

    const revision = dto.revision.trim();
    if (revision === previous.revision) {
      throw new BadRequestException(
        'New revision must differ from the current revision',
      );
    }
    await this.assertUniqueRevision(
      projectId,
      previous.drawingNumber,
      revision,
    );

    const status =
      dto.status === DrawingStatus.Draft
        ? DrawingStatus.Draft
        : DrawingStatus.Issued;
    const issuedAt =
      status === DrawingStatus.Issued
        ? dto.issuedAt
          ? new Date(dto.issuedAt)
          : new Date()
        : dto.issuedAt
          ? new Date(dto.issuedAt)
          : null;

    let createdId = '';
    await this.databaseService.withTransaction(async (session) => {
      const created = await this.drawingModel.create(
        [
          {
            projectId: previous.projectId,
            siteId: previous.siteId,
            drawingNumber: previous.drawingNumber,
            title: dto.title?.trim() || previous.title,
            discipline:
              dto.discipline !== undefined
                ? dto.discipline?.trim() || null
                : previous.discipline,
            revision,
            isLatest: true,
            supersededById: null,
            status,
            documentId: new Types.ObjectId(dto.documentId),
            markupDocumentIds: (dto.markupDocumentIds ?? []).map(
              (mid) => new Types.ObjectId(mid),
            ),
            issuedAt,
            notes:
              dto.notes !== undefined
                ? dto.notes?.trim() || null
                : previous.notes,
            createdBy: new Types.ObjectId(actorId),
          },
        ],
        { session },
      );
      const next = created[0];
      createdId = String(next._id);

      previous.isLatest = false;
      previous.status = DrawingStatus.Superseded;
      previous.supersededById = next._id as Types.ObjectId;
      previous.set('updatedBy', new Types.ObjectId(actorId));
      await previous.save({ session });
    });

    const fresh = await this.requireDrawing(createdId);
    return createSuccessResponse(
      this.toPublic(fresh),
      'Drawing revision created — previous revision superseded',
    );
  }

  async archive(id: string, actorId: string) {
    const row = await this.requireDrawing(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    if (row.status === DrawingStatus.Archived) {
      throw new BadRequestException('Drawing is already archived');
    }
    if (row.status === DrawingStatus.Superseded) {
      throw new BadRequestException('Superseded drawings cannot be archived');
    }

    row.status = DrawingStatus.Archived;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(this.toPublic(row), 'Drawing archived');
  }

  private async assertSiteAccess(
    actorId: string,
    projectId: string,
    siteId?: string | null,
  ) {
    await this.siteAccessService.assertSiteAccessIfScoped({
      userId: actorId,
      projectId,
      siteId: siteId ?? null,
    });
  }

  private async requireActiveDocument(documentId: string, projectId: string) {
    if (!Types.ObjectId.isValid(documentId)) {
      throw new BadRequestException('Invalid documentId');
    }
    const doc = await this.documentsService.requireActiveDocument(documentId);
    if (doc.projectId && String(doc.projectId) !== projectId) {
      throw new BadRequestException(
        'Document projectId does not match drawing projectId',
      );
    }
    return doc;
  }

  private async requireActiveDocuments(
    documentIds: string[],
    projectId: string,
  ) {
    for (const id of documentIds) {
      await this.requireActiveDocument(id, projectId);
    }
  }

  private async assertUniqueRevision(
    projectId: string,
    drawingNumber: string,
    revision: string,
    session?: ClientSession,
  ) {
    const existing = await this.drawingModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        drawingNumber,
        revision,
      })
      .session(session ?? null)
      .exec();
    if (existing) {
      throw new BadRequestException(
        `Revision ${revision} already exists for drawing ${drawingNumber}`,
      );
    }
  }

  private async requireDrawing(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid drawing id');
    }
    const row = await this.drawingModel.findById(id).exec();
    if (!row) throw new NotFoundException('Drawing not found');
    return row;
  }

  private toPublic(
    row: Drawing & {
      _id?: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    return {
      id: String(row._id),
      projectId: String(row.projectId),
      siteId: row.siteId ? String(row.siteId) : null,
      drawingNumber: row.drawingNumber,
      title: row.title,
      discipline: row.discipline ?? null,
      revision: row.revision,
      isLatest: Boolean(row.isLatest),
      supersededById: row.supersededById ? String(row.supersededById) : null,
      status: row.status,
      documentId: String(row.documentId),
      markupDocumentIds: (row.markupDocumentIds ?? []).map((id) => String(id)),
      issuedAt: row.issuedAt,
      notes: row.notes ?? null,
      createdBy: String(row.createdBy),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
