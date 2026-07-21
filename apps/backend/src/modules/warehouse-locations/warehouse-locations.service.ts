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
import { Site, SiteType } from '../sites/schemas/site.schema';
import type {
  CreateWarehouseLocationDto,
  ListWarehouseLocationsQueryDto,
  UpdateWarehouseLocationDto,
} from './dto/warehouse-location.dto';
import { toPublicWarehouseLocation } from './warehouse-locations.mapper';
import {
  WarehouseLocation,
  WarehouseLocationLevel,
  WarehouseLocationStatus,
} from './schemas/warehouse-location.schema';

const LEVEL_RANK: Record<WarehouseLocationLevel, number> = {
  [WarehouseLocationLevel.Zone]: 0,
  [WarehouseLocationLevel.Rack]: 1,
  [WarehouseLocationLevel.Bin]: 2,
};

@Injectable()
export class WarehouseLocationsService {
  constructor(
    @InjectModel(WarehouseLocation.name)
    private readonly locationModel: Model<WarehouseLocation>,
    @InjectModel(Site.name)
    private readonly siteModel: Model<Site>,
  ) {}

  async create(dto: CreateWarehouseLocationDto, companyId: string) {
    const warehouse = await this.requireWarehouse(
      dto.warehouseId,
      dto.projectId,
      companyId,
    );

    const code = dto.code.trim().toUpperCase();
    const parent = dto.parentId
      ? await this.requireParent(dto.parentId, dto.warehouseId, dto.level)
      : null;

    if (dto.level === WarehouseLocationLevel.Zone && parent) {
      throw new BadRequestException('Zones cannot have a parent location');
    }
    if (dto.level !== WarehouseLocationLevel.Zone && !parent) {
      throw new BadRequestException(
        `${dto.level} requires a parent location`,
      );
    }

    const warehousePrefix = warehouse.siteCode.trim().toUpperCase();
    const locationPath = parent
      ? `${parent.locationPath}/${code}`
      : `${warehousePrefix}/${code}`;

    const row = await this.locationModel.create({
      companyId: new Types.ObjectId(companyId),
      projectId: new Types.ObjectId(dto.projectId),
      warehouseId: warehouse._id,
      parentId: parent?._id ?? null,
      level: dto.level,
      code,
      name: dto.name.trim(),
      capacity: dto.capacity ?? null,
      status: dto.status ?? WarehouseLocationStatus.Active,
      locationPath,
    });

    return createSuccessResponse(
      toPublicWarehouseLocation(row),
      'Warehouse location created',
    );
  }

  async update(id: string, dto: UpdateWarehouseLocationDto, companyId: string) {
    const row = await this.requireLocation(id, companyId);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.capacity !== undefined) row.capacity = dto.capacity;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.code !== undefined && dto.code.trim().toUpperCase() !== row.code) {
      throw new BadRequestException(
        'Location code cannot be changed after create (path stability)',
      );
    }
    await row.save();
    return createSuccessResponse(
      toPublicWarehouseLocation(row),
      'Warehouse location updated',
    );
  }

  async getById(id: string, companyId: string) {
    const row = await this.requireLocation(id, companyId);
    return createSuccessResponse(
      toPublicWarehouseLocation(row),
      'Warehouse location fetched',
    );
  }

  async list(query: ListWarehouseLocationsQueryDto, companyId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter: FilterQuery<WarehouseLocation> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.warehouseId) {
      filter.warehouseId = new Types.ObjectId(query.warehouseId);
    }
    if (query.parentId) {
      filter.parentId = new Types.ObjectId(query.parentId);
    }
    if (query.level) filter.level = query.level;
    if (query.status) filter.status = query.status;

    const sort: Record<string, SortOrder> = { locationPath: 1 };
    const [items, total] = await Promise.all([
      this.locationModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.locationModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicWarehouseLocation(row)),
      'Warehouse locations fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async resolveLocationPath(input: {
    warehouseId?: string | null;
    binId?: string | null;
    rackId?: string | null;
    zoneId?: string | null;
  }): Promise<{
    locationPath: string | null;
    warehouseId: Types.ObjectId | null;
    zoneId: Types.ObjectId | null;
    rackId: Types.ObjectId | null;
    binId: Types.ObjectId | null;
  }> {
    const leafId = input.binId ?? input.rackId ?? input.zoneId;
    if (leafId) {
      const leaf = await this.locationModel.findById(leafId).exec();
      if (!leaf) {
        throw new BadRequestException('Warehouse location not found');
      }
      return {
        locationPath: leaf.locationPath,
        warehouseId: leaf.warehouseId,
        zoneId:
          leaf.level === WarehouseLocationLevel.Zone
            ? (leaf._id as Types.ObjectId)
            : input.zoneId
              ? new Types.ObjectId(input.zoneId)
              : null,
        rackId:
          leaf.level === WarehouseLocationLevel.Rack
            ? (leaf._id as Types.ObjectId)
            : input.rackId
              ? new Types.ObjectId(input.rackId)
              : null,
        binId:
          leaf.level === WarehouseLocationLevel.Bin
            ? (leaf._id as Types.ObjectId)
            : null,
      };
    }
    if (input.warehouseId) {
      const warehouse = await this.siteModel.findById(input.warehouseId).exec();
      if (!warehouse || warehouse.type !== SiteType.Warehouse) {
        throw new BadRequestException('Warehouse not found');
      }
      return {
        locationPath: warehouse.siteCode.trim().toUpperCase(),
        warehouseId: warehouse._id as Types.ObjectId,
        zoneId: null,
        rackId: null,
        binId: null,
      };
    }
    return {
      locationPath: null,
      warehouseId: null,
      zoneId: null,
      rackId: null,
      binId: null,
    };
  }

  private async requireWarehouse(
    warehouseId: string,
    projectId: string,
    companyId: string,
  ) {
    if (!Types.ObjectId.isValid(warehouseId)) {
      throw new BadRequestException('Invalid warehouseId');
    }
    const warehouse = await this.siteModel.findById(warehouseId).exec();
    if (
      !warehouse ||
      warehouse.type !== SiteType.Warehouse ||
      String(warehouse.projectId) !== projectId ||
      String(warehouse.companyId) !== companyId
    ) {
      throw new NotFoundException('Warehouse not found for project');
    }
    return warehouse;
  }

  private async requireParent(
    parentId: string,
    warehouseId: string,
    childLevel: WarehouseLocationLevel,
  ) {
    const parent = await this.locationModel.findById(parentId).exec();
    if (!parent || String(parent.warehouseId) !== warehouseId) {
      throw new BadRequestException('Parent location not found in warehouse');
    }
    if (LEVEL_RANK[childLevel] !== LEVEL_RANK[parent.level] + 1) {
      throw new BadRequestException(
        `${childLevel} must be nested directly under ${
          childLevel === WarehouseLocationLevel.Rack ? 'zone' : 'rack'
        }`,
      );
    }
    return parent;
  }

  private async requireLocation(id: string, companyId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid warehouse location id');
    }
    const row = await this.locationModel.findById(id).exec();
    if (!row || String(row.companyId) !== companyId) {
      throw new NotFoundException('Warehouse location not found');
    }
    return row;
  }
}
