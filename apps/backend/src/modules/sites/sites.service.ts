import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import type { CreateSiteDto, ListSitesQueryDto, UpdateSiteDto } from './dto/site.dto';
import { toPublicSite } from './sites.mapper';
import { Site, SiteStatus } from './schemas/site.schema';

@Injectable()
export class SitesService {
  constructor(
    @InjectModel(Site.name) private readonly siteModel: Model<Site>,
  ) {}

  async create(dto: CreateSiteDto, companyId: string, actorId?: string) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }

    const siteCode = dto.siteCode.trim().toUpperCase();
    try {
      const row = await this.siteModel.create({
        companyId: new Types.ObjectId(companyId),
        projectId: new Types.ObjectId(dto.projectId),
        siteCode,
        siteName: dto.siteName.trim(),
        type: dto.type,
        address: dto.address?.trim() ?? null,
        status: SiteStatus.Active,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        siteManagerUserId: dto.siteManagerUserId
          ? new Types.ObjectId(dto.siteManagerUserId)
          : null,
        warehouseRef: dto.warehouseRef?.trim() ?? null,
        geo: dto.geo ?? null,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });
      return createSuccessResponse(toPublicSite(row), 'Site created');
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          `Site code ${siteCode} already exists for this project`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateSiteDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireSite(id, companyId);
    if (dto.siteName !== undefined) row.siteName = dto.siteName.trim();
    if (dto.type !== undefined) row.type = dto.type;
    if (dto.address !== undefined) row.address = dto.address?.trim() ?? null;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.startDate !== undefined) {
      row.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.endDate !== undefined) {
      row.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }
    if (dto.siteManagerUserId !== undefined) {
      row.siteManagerUserId = dto.siteManagerUserId
        ? new Types.ObjectId(dto.siteManagerUserId)
        : null;
    }
    if (dto.warehouseRef !== undefined) {
      row.warehouseRef = dto.warehouseRef?.trim() ?? null;
    }
    if (dto.geo !== undefined) row.geo = dto.geo;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(toPublicSite(row), 'Site updated');
  }

  async list(query: ListSitesQueryDto, companyId: string) {
    this.requireCompany(companyId);
    const filter: FilterQuery<Site> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) {
      filter.status = query.status;
    }

    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 50;

    const [items, total] = await Promise.all([
      this.siteModel
        .find(filter)
        .sort({ siteCode: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.siteModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicSite(item)),
      'Sites fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getById(id: string, companyId: string) {
    const row = await this.requireSite(id, companyId);
    return createSuccessResponse(toPublicSite(row), 'Site fetched');
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.siteModel.findById(id).exec();
  }

  async listActiveIdsForProject(
    companyId: string,
    projectId: string,
  ): Promise<string[]> {
    const rows = await this.siteModel
      .find({
        companyId: new Types.ObjectId(companyId),
        projectId: new Types.ObjectId(projectId),
        status: SiteStatus.Active,
      })
      .select('_id')
      .lean()
      .exec();
    return rows.map((row) => String(row._id));
  }

  private async requireSite(id: string, companyId: string) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Site not found');
    }
    const row = await this.siteModel.findById(id).exec();
    if (!row || String(row.companyId) !== companyId) {
      throw new NotFoundException('Site not found');
    }
    return row;
  }

  private requireCompany(companyId: string | null | undefined): asserts companyId is string {
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new ForbiddenException('Authenticated company context required');
    }
  }
}
