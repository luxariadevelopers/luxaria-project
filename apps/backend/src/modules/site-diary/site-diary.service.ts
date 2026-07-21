import {
  BadRequestException,
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
  CreateSiteDiaryEntryDto,
  ListSiteDiaryQueryDto,
  SiteDiaryVisitorDto,
  UpdateSiteDiaryEntryDto,
} from './dto/site-diary.dto';
import { toPublicSiteDiaryEntry } from './site-diary.mapper';
import { SiteDiaryEntry } from './schemas/site-diary-entry.schema';

@Injectable()
export class SiteDiaryService {
  constructor(
    @InjectModel(SiteDiaryEntry.name)
    private readonly diaryModel: Model<SiteDiaryEntry>,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async create(dto: CreateSiteDiaryEntryDto, actorId: string) {
    await this.assertSiteAccess(actorId, dto.projectId, dto.siteId);

    const row = await this.diaryModel.create({
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      dprId: dto.dprId ? new Types.ObjectId(dto.dprId) : null,
      entryDate: this.parseEntryDate(dto.entryDate),
      entryType: dto.entryType,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      visitors: this.mapVisitors(dto.visitors),
      photoDocumentIds: (dto.photoDocumentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicSiteDiaryEntry(row),
      'Site diary entry created',
    );
  }

  async update(id: string, dto: UpdateSiteDiaryEntryDto, actorId: string) {
    const row = await this.requireEntry(id);

    if (dto.siteId !== undefined) {
      await this.assertSiteAccess(
        actorId,
        String(row.projectId),
        dto.siteId,
      );
      row.siteId = dto.siteId ? new Types.ObjectId(dto.siteId) : null;
    } else {
      await this.assertSiteAccess(
        actorId,
        String(row.projectId),
        row.siteId ? String(row.siteId) : null,
      );
    }

    if (dto.dprId !== undefined) {
      row.dprId = dto.dprId ? new Types.ObjectId(dto.dprId) : null;
    }
    if (dto.entryDate !== undefined) {
      row.entryDate = this.parseEntryDate(dto.entryDate);
    }
    if (dto.entryType !== undefined) row.entryType = dto.entryType;
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() ?? null;
    }
    if (dto.visitors !== undefined) {
      row.visitors = this.mapVisitors(dto.visitors) as typeof row.visitors;
    }
    if (dto.photoDocumentIds !== undefined) {
      row.photoDocumentIds = dto.photoDocumentIds.map(
        (docId) => new Types.ObjectId(docId),
      );
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSiteDiaryEntry(row),
      'Site diary entry updated',
    );
  }

  async remove(id: string, actorId: string) {
    const row = await this.requireEntry(id);
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );
    await row.softDelete(new Types.ObjectId(actorId));
    return createSuccessResponse(
      { id: String(row._id) },
      'Site diary entry deleted',
    );
  }

  async getById(id: string) {
    const row = await this.requireEntry(id);
    return createSuccessResponse(
      toPublicSiteDiaryEntry(row),
      'Site diary entry fetched',
    );
  }

  async list(query: ListSiteDiaryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<SiteDiaryEntry> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.dprId) filter.dprId = new Types.ObjectId(query.dprId);
    if (query.entryType) filter.entryType = query.entryType;

    if (query.entryDate) {
      const day = this.parseEntryDate(query.entryDate);
      const next = new Date(day);
      next.setUTCDate(next.getUTCDate() + 1);
      filter.entryDate = { $gte: day, $lt: next };
    } else if (query.fromDate || query.toDate) {
      const range: { $gte?: Date; $lte?: Date } = {};
      if (query.fromDate) range.$gte = this.parseEntryDate(query.fromDate);
      if (query.toDate) {
        const end = this.parseEntryDate(query.toDate);
        end.setUTCHours(23, 59, 59, 999);
        range.$lte = end;
      }
      filter.entryDate = range;
    }

    const sortField = query.sortBy ?? 'entryDate';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.diaryModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.diaryModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicSiteDiaryEntry(row)),
      'Site diary entries fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private mapVisitors(visitors?: SiteDiaryVisitorDto[]) {
    return (visitors ?? []).map((v) => ({
      name: v.name.trim(),
      organization: v.organization?.trim() ?? null,
      purpose: v.purpose?.trim() ?? null,
    }));
  }

  private parseEntryDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid entryDate');
    }
    return date;
  }

  private async assertSiteAccess(
    userId: string,
    projectId: string,
    siteId?: string | null,
  ) {
    await this.siteAccessService.assertSiteAccessIfScoped({
      userId,
      projectId,
      siteId: siteId ?? null,
    });
  }

  private async requireEntry(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid site diary entry id');
    }
    const row = await this.diaryModel.findById(id).exec();
    if (!row) throw new NotFoundException('Site diary entry not found');
    return row;
  }
}
