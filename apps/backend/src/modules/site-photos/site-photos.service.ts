import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { SiteAccessService } from '../sites/site-access.service';
import type {
  AttachSitePhotoDto,
  ListSitePhotosQueryDto,
} from './dto/site-photo.dto';
import { toPublicSitePhoto } from './site-photos.mapper';
import { SitePhoto } from './schemas/site-photo.schema';

@Injectable()
export class SitePhotosService {
  constructor(
    @InjectModel(SitePhoto.name)
    private readonly photoModel: Model<SitePhoto>,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  /**
   * Attach geo/version metadata to an existing document for a SE domain link.
   * Does not upload bytes — use documents.presign-upload first.
   */
  async attach(dto: AttachSitePhotoDto, actorId: string) {
    await this.siteAccessService.assertSiteAccessIfScoped({
      userId: actorId,
      projectId: dto.projectId,
      siteId: dto.siteId ?? null,
    });

    const existing = await this.photoModel
      .findOne({ documentId: new Types.ObjectId(dto.documentId) })
      .exec();
    if (existing) {
      throw new ConflictException(
        'This document is already linked as a site photo',
      );
    }

    if (
      (dto.lat == null && dto.lng != null) ||
      (dto.lat != null && dto.lng == null)
    ) {
      throw new BadRequestException('lat and lng must be provided together');
    }

    try {
      const row = await this.photoModel.create({
        projectId: new Types.ObjectId(dto.projectId),
        siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
        documentId: new Types.ObjectId(dto.documentId),
        linkType: dto.linkType,
        linkId: new Types.ObjectId(dto.linkId),
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : null,
        version: dto.version ?? 1,
        caption: dto.caption?.trim() ?? null,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        toPublicSitePhoto(row),
        'Site photo metadata attached',
      );
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: number }).code === 11000
      ) {
        throw new ConflictException(
          'This document is already linked as a site photo',
        );
      }
      throw err;
    }
  }

  async getById(id: string) {
    const row = await this.requirePhoto(id);
    return createSuccessResponse(toPublicSitePhoto(row), 'Site photo fetched');
  }

  async list(query: ListSitePhotosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<SitePhoto> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.linkType) filter.linkType = query.linkType;
    if (query.linkId) filter.linkId = new Types.ObjectId(query.linkId);
    if (query.documentId) {
      filter.documentId = new Types.ObjectId(query.documentId);
    }

    const sort: Record<string, SortOrder> = {
      [query.sortBy ?? 'createdAt']: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.photoModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.photoModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicSitePhoto(row)),
      'Site photos fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async remove(id: string, actorId: string) {
    const row = await this.requirePhoto(id);
    await this.siteAccessService.assertSiteAccessIfScoped({
      userId: actorId,
      projectId: String(row.projectId),
      siteId: row.siteId ? String(row.siteId) : null,
    });
    await row.softDelete(new Types.ObjectId(actorId));
    return createSuccessResponse(
      { id: String(row._id) },
      'Site photo metadata removed',
    );
  }

  private async requirePhoto(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid site photo id');
    }
    const row = await this.photoModel.findById(id).exec();
    if (!row) throw new NotFoundException('Site photo not found');
    return row;
  }
}
