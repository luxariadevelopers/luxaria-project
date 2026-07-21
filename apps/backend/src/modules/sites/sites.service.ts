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
import type {
  CreateSiteDto,
  CreateStructureNodeDto,
  CreateWarehouseDto,
  ListSitesQueryDto,
  UpdateSiteDto,
} from './dto/site.dto';
import { buildSiteTree, toPublicSite } from './sites.mapper';
import {
  Site,
  SiteStatus,
  SiteType,
  WarehouseKind,
} from './schemas/site.schema';

/** Soft hierarchy: site → phase → block → tower → floor */
const STRUCTURE_RANK: Partial<Record<SiteType, number>> = {
  [SiteType.Site]: 0,
  [SiteType.Phase]: 1,
  [SiteType.Block]: 2,
  [SiteType.Tower]: 3,
  [SiteType.Floor]: 4,
};

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

    const type = dto.type ?? SiteType.Site;
    await this.assertParentValid({
      projectId: dto.projectId,
      parentSiteId: dto.parentSiteId ?? null,
      childType: type,
    });
    this.assertWarehouseFields(type, dto.warehouseKind ?? null);

    const siteCode = dto.siteCode.trim().toUpperCase();
    try {
      const row = await this.siteModel.create({
        companyId: new Types.ObjectId(companyId),
        projectId: new Types.ObjectId(dto.projectId),
        parentSiteId: dto.parentSiteId
          ? new Types.ObjectId(dto.parentSiteId)
          : null,
        siteCode,
        siteName: dto.siteName.trim(),
        type,
        warehouseKind:
          type === SiteType.Warehouse ? (dto.warehouseKind ?? null) : null,
        contactName: dto.contactName?.trim() ?? null,
        contactPhone: dto.contactPhone?.trim() ?? null,
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

  async createStructureNode(
    projectId: string,
    dto: CreateStructureNodeDto,
    companyId: string,
    actorId?: string,
  ) {
    return this.create(
      {
        projectId,
        parentSiteId: dto.parentSiteId,
        siteCode: dto.siteCode,
        siteName: dto.siteName,
        type: dto.type,
        warehouseKind: dto.warehouseKind,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        address: dto.address,
        siteManagerUserId: dto.siteManagerUserId,
      },
      companyId,
      actorId,
    );
  }

  async createWarehouse(
    projectId: string,
    dto: CreateWarehouseDto,
    companyId: string,
    actorId?: string,
  ) {
    return this.create(
      {
        projectId,
        parentSiteId: dto.parentSiteId,
        siteCode: dto.siteCode,
        siteName: dto.siteName,
        type: SiteType.Warehouse,
        warehouseKind: dto.warehouseKind,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        address: dto.address,
      },
      companyId,
      actorId,
    );
  }

  async getStructure(projectId: string, companyId: string) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const rows = await this.siteModel
      .find({
        companyId: new Types.ObjectId(companyId),
        projectId: new Types.ObjectId(projectId),
      })
      .sort({ siteCode: 1 })
      .exec();
    const tree = buildSiteTree(rows.map((row) => toPublicSite(row)));
    return createSuccessResponse(tree, 'Project structure fetched');
  }

  async listWarehouses(projectId: string, companyId: string) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const rows = await this.siteModel
      .find({
        companyId: new Types.ObjectId(companyId),
        projectId: new Types.ObjectId(projectId),
        type: SiteType.Warehouse,
      })
      .sort({ siteCode: 1 })
      .exec();
    return createSuccessResponse(
      rows.map((row) => toPublicSite(row)),
      'Project warehouses fetched',
    );
  }

  async update(
    id: string,
    dto: UpdateSiteDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireSite(id, companyId);
    const nextType = dto.type ?? row.type;

    if (dto.parentSiteId !== undefined || dto.type !== undefined) {
      const parentSiteId =
        dto.parentSiteId !== undefined
          ? dto.parentSiteId
          : row.parentSiteId
            ? String(row.parentSiteId)
            : null;
      await this.assertParentValid({
        projectId: String(row.projectId),
        parentSiteId,
        childType: nextType,
        siteId: id,
      });
      if (dto.parentSiteId !== undefined) {
        row.parentSiteId = dto.parentSiteId
          ? new Types.ObjectId(dto.parentSiteId)
          : null;
      }
    }

    if (dto.siteName !== undefined) row.siteName = dto.siteName.trim();
    if (dto.type !== undefined) row.type = dto.type;
    if (dto.warehouseKind !== undefined) {
      this.assertWarehouseFields(nextType, dto.warehouseKind);
      row.warehouseKind =
        nextType === SiteType.Warehouse ? dto.warehouseKind : null;
    } else if (dto.type !== undefined && dto.type !== SiteType.Warehouse) {
      row.warehouseKind = null;
    }
    if (dto.contactName !== undefined) {
      row.contactName = dto.contactName?.trim() ?? null;
    }
    if (dto.contactPhone !== undefined) {
      row.contactPhone = dto.contactPhone?.trim() ?? null;
    }
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
    if (query.type) {
      filter.type = query.type;
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

  async listForProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      return [];
    }
    return this.siteModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ siteCode: 1 })
      .exec();
  }

  async cloneStructureToProject(input: {
    sourceProjectId: string;
    targetProjectId: string;
    companyId: string;
    actorId?: string;
  }): Promise<void> {
    const sources = await this.listForProject(input.sourceProjectId);
    if (sources.length === 0) return;

    const idMap = new Map<string, Types.ObjectId>();
    // Create in parent-first order
    const remaining = [...sources];
    let guard = remaining.length + 2;
    while (remaining.length > 0 && guard-- > 0) {
      const ready = remaining.filter(
        (site) =>
          !site.parentSiteId || idMap.has(String(site.parentSiteId)),
      );
      if (ready.length === 0) {
        // Orphan / cycle — attach remaining as roots
        for (const site of remaining) {
          const created = await this.siteModel.create({
            companyId: new Types.ObjectId(input.companyId),
            projectId: new Types.ObjectId(input.targetProjectId),
            parentSiteId: null,
            siteCode: site.siteCode,
            siteName: site.siteName,
            type: site.type,
            warehouseKind: site.warehouseKind ?? null,
            contactName: site.contactName ?? null,
            contactPhone: site.contactPhone ?? null,
            address: site.address ?? null,
            status: site.status,
            startDate: site.startDate ?? null,
            endDate: site.endDate ?? null,
            siteManagerUserId: null,
            warehouseRef: site.warehouseRef ?? null,
            geo: site.geo ?? null,
            createdBy: input.actorId
              ? new Types.ObjectId(input.actorId)
              : null,
          });
          idMap.set(String(site._id), created._id as Types.ObjectId);
        }
        break;
      }
      for (const site of ready) {
        const created = await this.siteModel.create({
          companyId: new Types.ObjectId(input.companyId),
          projectId: new Types.ObjectId(input.targetProjectId),
          parentSiteId: site.parentSiteId
            ? idMap.get(String(site.parentSiteId)) ?? null
            : null,
          siteCode: site.siteCode,
          siteName: site.siteName,
          type: site.type,
          warehouseKind: site.warehouseKind ?? null,
          contactName: site.contactName ?? null,
          contactPhone: site.contactPhone ?? null,
          address: site.address ?? null,
          status: site.status,
          startDate: site.startDate ?? null,
          endDate: site.endDate ?? null,
          siteManagerUserId: null,
          warehouseRef: site.warehouseRef ?? null,
          geo: site.geo ?? null,
          createdBy: input.actorId
            ? new Types.ObjectId(input.actorId)
            : null,
        });
        idMap.set(String(site._id), created._id as Types.ObjectId);
        const idx = remaining.indexOf(site);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }
  }

  private assertWarehouseFields(
    type: SiteType,
    warehouseKind: WarehouseKind | null,
  ) {
    if (type === SiteType.Warehouse && !warehouseKind) {
      throw new BadRequestException(
        'warehouseKind is required when type is warehouse',
      );
    }
  }

  private async assertParentValid(input: {
    projectId: string;
    parentSiteId: string | null;
    childType: SiteType;
    siteId?: string;
  }): Promise<void> {
    if (!input.parentSiteId) {
      return;
    }
    if (!Types.ObjectId.isValid(input.parentSiteId)) {
      throw new BadRequestException('Invalid parentSiteId');
    }
    if (input.siteId && input.parentSiteId === input.siteId) {
      throw new BadRequestException('Site cannot be its own parent');
    }

    const parent = await this.siteModel.findById(input.parentSiteId).exec();
    if (!parent || String(parent.projectId) !== input.projectId) {
      throw new BadRequestException(
        'parentSiteId must belong to the same project',
      );
    }

    // Cycle: walk ancestors of proposed parent and ensure siteId not in chain
    if (input.siteId) {
      let cursor: Types.ObjectId | null = parent.parentSiteId;
      const seen = new Set<string>([String(parent._id)]);
      while (cursor) {
        const key = String(cursor);
        if (key === input.siteId) {
          throw new BadRequestException(
            'parentSiteId would create a cycle in the site hierarchy',
          );
        }
        if (seen.has(key)) break;
        seen.add(key);
        const ancestor = await this.siteModel.findById(cursor).exec();
        cursor = ancestor?.parentSiteId ?? null;
      }
    }

    const parentRank = STRUCTURE_RANK[parent.type];
    const childRank = STRUCTURE_RANK[input.childType];
    if (
      parentRank !== undefined &&
      childRank !== undefined &&
      childRank <= parentRank
    ) {
      throw new BadRequestException(
        `Invalid structure hierarchy: ${input.childType} cannot be nested under ${parent.type}`,
      );
    }
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
