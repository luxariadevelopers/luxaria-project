import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import type {
  CreatePermissionOverrideDto,
  ListPermissionOverridesQueryDto,
  UpdatePermissionOverrideDto,
} from './dto/permission-override.dto';
import {
  PermissionOverride,
  PermissionOverrideEffect,
  PermissionOverrideStatus,
} from './schemas/permission-override.schema';

export type PublicPermissionOverride = {
  id: string;
  userId: string;
  companyId: string;
  permission: string;
  effect: PermissionOverrideEffect;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  reason: string | null;
  approvedBy: string | null;
  projectId: string | null;
  siteId: string | null;
  status: PermissionOverrideStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ActiveOverride = {
  permission: string;
  effect: PermissionOverrideEffect;
  projectId: string | null;
  siteId: string | null;
};

@Injectable()
export class PermissionOverridesService {
  constructor(
    @InjectModel(PermissionOverride.name)
    private readonly overrideModel: Model<PermissionOverride>,
  ) {}

  isOverrideEffective(
    override: {
      status: PermissionOverrideStatus;
      effectiveFrom: Date;
      effectiveTo?: Date | null;
    },
    at: Date = new Date(),
  ): boolean {
    if (override.status !== PermissionOverrideStatus.Active) {
      return false;
    }
    if (override.effectiveFrom.getTime() > at.getTime()) {
      return false;
    }
    if (
      override.effectiveTo &&
      override.effectiveTo.getTime() < at.getTime()
    ) {
      return false;
    }
    return true;
  }

  async listActiveForUser(
    userId: string,
    at: Date = new Date(),
  ): Promise<ActiveOverride[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    const rows = await this.overrideModel
      .find({
        userId: new Types.ObjectId(userId),
        status: PermissionOverrideStatus.Active,
        effectiveFrom: { $lte: at },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: at } }],
      })
      .select('permission effect projectId siteId')
      .lean()
      .exec();

    return rows.map((row) => ({
      permission: row.permission,
      effect: row.effect,
      projectId: row.projectId ? String(row.projectId) : null,
      siteId: row.siteId ? String(row.siteId) : null,
    }));
  }

  async create(
    dto: CreatePermissionOverrideDto,
    companyId: string,
    actorId?: string,
  ) {
    if (!Types.ObjectId.isValid(dto.userId)) {
      throw new BadRequestException('Invalid userId');
    }
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid companyId');
    }

    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();
    const effectiveTo =
      dto.effectiveTo === undefined || dto.effectiveTo === null
        ? null
        : new Date(dto.effectiveTo);

    if (effectiveTo && effectiveTo.getTime() < effectiveFrom.getTime()) {
      throw new BadRequestException(
        'effectiveTo must be on or after effectiveFrom',
      );
    }

    const row = await this.overrideModel.create({
      userId: new Types.ObjectId(dto.userId),
      companyId: new Types.ObjectId(companyId),
      permission: dto.permission.trim(),
      effect: dto.effect,
      effectiveFrom,
      effectiveTo,
      reason: dto.reason?.trim() ?? null,
      approvedBy: actorId ? new Types.ObjectId(actorId) : null,
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      status: PermissionOverrideStatus.Active,
      createdBy: actorId ? new Types.ObjectId(actorId) : null,
    });

    return createSuccessResponse(
      this.toPublic(row),
      'Permission override created',
    );
  }

  async createDenyOverrides(
    input: {
      userId: string;
      companyId: string;
      permissions: string[];
      reason?: string | null;
      projectId?: string | null;
      siteId?: string | null;
      effectiveFrom?: Date;
      effectiveTo?: Date | null;
      actorId?: string;
    },
  ): Promise<PublicPermissionOverride[]> {
    const created: PublicPermissionOverride[] = [];
    for (const permission of input.permissions) {
      const result = await this.create(
        {
          userId: input.userId,
          permission,
          effect: PermissionOverrideEffect.Deny,
          effectiveFrom: input.effectiveFrom?.toISOString(),
          effectiveTo: input.effectiveTo?.toISOString() ?? null,
          reason: input.reason ?? 'Provision deny override',
          projectId: input.projectId ?? null,
          siteId: input.siteId ?? null,
        },
        input.companyId,
        input.actorId,
      );
      if (result.data) {
        created.push(result.data);
      }
    }
    return created;
  }

  /**
   * Sync global (company-wide) deny overrides for a permission catalog.
   * Creates missing denies, inactivates denies that are no longer desired.
   * Scoped project/site overrides are left untouched.
   */
  async syncGlobalDenyOverrides(input: {
    userId: string;
    companyId: string;
    denyPermissions: string[];
    catalogPermissions: string[];
    reason?: string | null;
    actorId?: string;
  }): Promise<{ created: number; inactivated: number; activeDenies: string[] }> {
    if (!Types.ObjectId.isValid(input.userId)) {
      throw new BadRequestException('Invalid userId');
    }
    if (!Types.ObjectId.isValid(input.companyId)) {
      throw new BadRequestException('Invalid companyId');
    }

    const catalog = [
      ...new Set(
        input.catalogPermissions
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
      ),
    ];
    const desired = new Set(
      input.denyPermissions
        .map((p) => p.trim())
        .filter((p) => catalog.includes(p)),
    );

    const existing = await this.overrideModel
      .find({
        userId: new Types.ObjectId(input.userId),
        companyId: new Types.ObjectId(input.companyId),
        effect: PermissionOverrideEffect.Deny,
        status: PermissionOverrideStatus.Active,
        projectId: null,
        siteId: null,
        permission: { $in: catalog },
      })
      .exec();

    const existingByPermission = new Map(
      existing.map((row) => [row.permission, row]),
    );

    let created = 0;
    let inactivated = 0;

    for (const permission of catalog) {
      const row = existingByPermission.get(permission);
      if (desired.has(permission)) {
        if (!row) {
          await this.create(
            {
              userId: input.userId,
              permission,
              effect: PermissionOverrideEffect.Deny,
              reason: input.reason ?? 'Module access deny',
            },
            input.companyId,
            input.actorId,
          );
          created += 1;
        }
      } else if (row) {
        row.status = PermissionOverrideStatus.Inactive;
        row.set(
          'updatedBy',
          input.actorId ? new Types.ObjectId(input.actorId) : null,
        );
        await row.save();
        inactivated += 1;
      }
    }

    return {
      created,
      inactivated,
      activeDenies: [...desired].sort(),
    };
  }

  async update(
    id: string,
    dto: UpdatePermissionOverrideDto,
    actorId?: string,
  ) {
    const row = await this.requireOverride(id);
    if (dto.status !== undefined) {
      row.status = dto.status;
    }
    if (dto.effectiveTo !== undefined) {
      row.effectiveTo =
        dto.effectiveTo === null ? null : new Date(dto.effectiveTo);
    }
    if (dto.reason !== undefined) {
      row.reason = dto.reason?.trim() ?? null;
    }
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(this.toPublic(row), 'Permission override updated');
  }

  async list(query: ListPermissionOverridesQueryDto, companyId: string) {
    const filter: FilterQuery<PermissionOverride> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }
    if (query.permission) {
      filter.permission = query.permission.trim();
    }
    if (query.status) {
      filter.status = query.status;
    }

    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;

    const [items, total] = await Promise.all([
      this.overrideModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.overrideModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => this.toPublic(item)),
      'Permission overrides fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getById(id: string) {
    const row = await this.requireOverride(id);
    return createSuccessResponse(this.toPublic(row), 'Permission override fetched');
  }

  private async requireOverride(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Permission override not found');
    }
    const row = await this.overrideModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Permission override not found');
    }
    return row;
  }

  private toPublic(row: PermissionOverride & { _id: Types.ObjectId; createdAt?: Date; updatedAt?: Date }): PublicPermissionOverride {
    return {
      id: String(row._id),
      userId: String(row.userId),
      companyId: String(row.companyId),
      permission: row.permission,
      effect: row.effect,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo ?? null,
      reason: row.reason ?? null,
      approvedBy: row.approvedBy ? String(row.approvedBy) : null,
      projectId: row.projectId ? String(row.projectId) : null,
      siteId: row.siteId ? String(row.siteId) : null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
