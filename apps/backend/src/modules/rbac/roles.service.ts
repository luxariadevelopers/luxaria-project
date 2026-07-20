import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder, Types } from 'mongoose';
import { Types as MongooseTypes } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { User } from '../users/schemas/user.schema';
import { toPublicUser } from '../users/users.mapper';
import type { AssignPermissionsDto } from './dto/assign-permissions.dto';
import type { AssignRoleToUserDto } from './dto/assign-role-to-user.dto';
import type { CloneRoleDto } from './dto/clone-role.dto';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { ListRolesQueryDto } from './dto/list-roles-query.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { isKnownPermission } from './permissions.catalog';
import { toPublicRole } from './roles.mapper';
import { Role, RoleStatus } from './schemas/role.schema';

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'name', 'code', 'status']);

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly numberingService: NumberingService,
  ) {}

  async assertActiveRoleIds(roleIds: string[]): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }

    const uniqueIds = [...new Set(roleIds)];
    for (const id of uniqueIds) {
      if (!MongooseTypes.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid role id: ${id}`);
      }
    }

    const roles = await this.roleModel
      .find({
        _id: { $in: uniqueIds.map((id) => new MongooseTypes.ObjectId(id)) },
        status: RoleStatus.Active,
      })
      .select('_id')
      .lean()
      .exec();

    if (roles.length !== uniqueIds.length) {
      throw new BadRequestException('One or more role ids are invalid or inactive');
    }
  }

  findById(id: string | Types.ObjectId) {
    return this.roleModel.findById(id).exec();
  }

  findByCode(code: string) {
    return this.roleModel.findOne({ code: code.trim().toUpperCase() }).exec();
  }

  async create(dto: CreateRoleDto, actorId?: string) {
    const permissions = this.normalizePermissions(dto.permissions ?? []);
    const code = dto.code
      ? dto.code.trim().toUpperCase()
      : await this.numberingService.nextCode(NumberEntityType.ROLE);

    await this.assertCodeAvailable(code);

    const role = await this.roleModel.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
      permissions,
      bypassPermissions: Boolean(dto.bypassPermissions),
      isSystem: false,
      status: RoleStatus.Active,
      createdBy: actorId ? new MongooseTypes.ObjectId(actorId) : null,
    });

    return createSuccessResponse(toPublicRole(role), 'Role created successfully');
  }

  async update(id: string, dto: UpdateRoleDto, actorId?: string) {
    const role = await this.requireRole(id);
    const update: Record<string, unknown> = {
      updatedBy: actorId ? new MongooseTypes.ObjectId(actorId) : null,
    };

    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.description !== undefined) {
      update.description = dto.description?.trim() ?? null;
    }
    if (dto.permissions !== undefined) {
      update.permissions = this.normalizePermissions(dto.permissions);
    }
    if (dto.bypassPermissions !== undefined) {
      if (role.isSystem && role.bypassPermissions && dto.bypassPermissions === false) {
        throw new BadRequestException('Cannot remove bypass from the Super Admin system role');
      }
      update.bypassPermissions = dto.bypassPermissions;
    }

    const updated = await this.roleModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    return createSuccessResponse(toPublicRole(updated!), 'Role updated successfully');
  }

  async assignPermissions(id: string, dto: AssignPermissionsDto, actorId?: string) {
    await this.requireRole(id);
    const permissions = this.normalizePermissions(dto.permissions);
    const updated = await this.roleModel
      .findByIdAndUpdate(
        id,
        {
          permissions,
          updatedBy: actorId ? new MongooseTypes.ObjectId(actorId) : null,
        },
        { new: true },
      )
      .exec();

    return createSuccessResponse(toPublicRole(updated!), 'Permissions assigned successfully');
  }

  async clone(id: string, dto: CloneRoleDto, actorId?: string) {
    const source = await this.requireRole(id);
    const code = dto.code
      ? dto.code.trim().toUpperCase()
      : await this.numberingService.nextCode(NumberEntityType.ROLE);

    await this.assertCodeAvailable(code);

    const role = await this.roleModel.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? `Clone of ${source.name}`,
      permissions: [...source.permissions],
      bypassPermissions: false,
      isSystem: false,
      status: RoleStatus.Active,
      createdBy: actorId ? new MongooseTypes.ObjectId(actorId) : null,
    });

    return createSuccessResponse(toPublicRole(role), 'Role cloned successfully');
  }

  async activate(id: string, actorId?: string) {
    await this.requireRole(id);
    const updated = await this.roleModel
      .findByIdAndUpdate(
        id,
        {
          status: RoleStatus.Active,
          updatedBy: actorId ? new MongooseTypes.ObjectId(actorId) : null,
        },
        { new: true },
      )
      .exec();
    return createSuccessResponse(toPublicRole(updated!), 'Role activated successfully');
  }

  async deactivate(id: string, actorId?: string) {
    const role = await this.requireRole(id);
    if (role.bypassPermissions) {
      throw new BadRequestException('Cannot deactivate a bypass (Super Admin) role');
    }

    const updated = await this.roleModel
      .findByIdAndUpdate(
        id,
        {
          status: RoleStatus.Inactive,
          updatedBy: actorId ? new MongooseTypes.ObjectId(actorId) : null,
        },
        { new: true },
      )
      .exec();
    return createSuccessResponse(toPublicRole(updated!), 'Role deactivated successfully');
  }

  async assignToUser(userId: string, dto: AssignRoleToUserDto) {
    if (!MongooseTypes.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.assertActiveRoleIds(dto.roleIds);

    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        { roleIds: dto.roleIds.map((roleId) => new MongooseTypes.ObjectId(roleId)) },
        { new: true },
      )
      .exec();

    return createSuccessResponse(toPublicUser(updated!), 'Roles assigned to user successfully');
  }

  async getById(id: string) {
    const role = await this.requireRole(id);
    return createSuccessResponse(toPublicRole(role), 'Role fetched successfully');
  }

  async list(query: ListRolesQueryDto) {
    const filter: FilterQuery<Role> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = ALLOWED_SORT_FIELDS.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'name';
    const sortOrder: SortOrder = query.sortOrder === 'desc' ? -1 : 1;

    const [items, total] = await Promise.all([
      this.roleModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.roleModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((role) => toPublicRole(role)),
      'Roles fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private normalizePermissions(permissions: string[]): string[] {
    const normalized = [
      ...new Set(
        permissions
          .map((permission) => permission.trim())
          .filter((permission) => permission.length > 0),
      ),
    ];

    for (const permission of normalized) {
      if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(permission)) {
        throw new BadRequestException(
          `Invalid permission format: ${permission}. Expected module.action`,
        );
      }
      if (!isKnownPermission(permission)) {
        throw new BadRequestException(`Unknown permission: ${permission}`);
      }
    }

    return normalized.sort();
  }

  private async assertCodeAvailable(code: string) {
    const existing = await this.roleModel
      .findOne({ code })
      .setOptions({ withDeleted: true })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(`Role code already exists: ${code}`);
    }
  }

  private async requireRole(id: string) {
    if (!MongooseTypes.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid role id');
    }
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }
}
