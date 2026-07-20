import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Role, RoleStatus } from './schemas/role.schema';

export type ResolvedUserAccess = {
  userId: string;
  roleIds: string[];
  roleCodes: string[];
  permissions: string[];
  bypassPermissions: boolean;
};

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async resolveUserAccess(userId: string | Types.ObjectId): Promise<ResolvedUserAccess> {
    const user = await this.userModel.findById(userId).select('roleIds').lean().exec();
    if (!user) {
      return {
        userId: String(userId),
        roleIds: [],
        roleCodes: [],
        permissions: [],
        bypassPermissions: false,
      };
    }

    const roleIds = (user.roleIds ?? []).map((id) => String(id));
    if (roleIds.length === 0) {
      return {
        userId: String(userId),
        roleIds: [],
        roleCodes: [],
        permissions: [],
        bypassPermissions: false,
      };
    }

    const roles = await this.roleModel
      .find({
        _id: { $in: user.roleIds },
        status: RoleStatus.Active,
      })
      .select('code permissions bypassPermissions')
      .lean()
      .exec();

    const permissionSet = new Set<string>();
    let bypassPermissions = false;
    const roleCodes: string[] = [];

    for (const role of roles) {
      roleCodes.push(role.code);
      if (role.bypassPermissions) {
        bypassPermissions = true;
      }
      for (const permission of role.permissions ?? []) {
        permissionSet.add(permission);
      }
    }

    return {
      userId: String(userId),
      roleIds,
      roleCodes,
      permissions: [...permissionSet].sort(),
      bypassPermissions,
    };
  }

  /**
   * Deny by default: returns false unless the user has every required permission
   * or holds a role with bypassPermissions (Super Admin).
   */
  async hasAllPermissions(
    userId: string | Types.ObjectId,
    required: string[],
  ): Promise<boolean> {
    if (required.length === 0) {
      return false;
    }

    const access = await this.resolveUserAccess(userId);
    if (access.bypassPermissions) {
      return true;
    }

    const granted = new Set(access.permissions);
    return required.every((permission) => granted.has(permission));
  }

  async hasAnyPermission(
    userId: string | Types.ObjectId,
    required: string[],
  ): Promise<boolean> {
    if (required.length === 0) {
      return false;
    }

    const access = await this.resolveUserAccess(userId);
    if (access.bypassPermissions) {
      return true;
    }

    const granted = new Set(access.permissions);
    return required.some((permission) => granted.has(permission));
  }
}
