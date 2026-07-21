import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { PermissionOverridesService } from './permission-overrides.service';
import {
  PermissionOverrideEffect,
} from './schemas/permission-override.schema';
import { Role, RoleStatus } from './schemas/role.schema';

export type ResolvedUserAccess = {
  userId: string;
  roleIds: string[];
  roleCodes: string[];
  permissions: string[];
  bypassPermissions: boolean;
};

/**
 * Effective permission resolution:
 * 1. Start with union of active role permissions
 * 2. Apply active allow overrides (add) — allow cannot expand project/site
 *    membership; that remains enforced at ProjectAccess/SiteAccess layers
 * 3. Apply active deny overrides (remove) — deny always wins
 * 4. Expired / inactive overrides are ignored
 */
@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    private readonly permissionOverridesService: PermissionOverridesService,
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
      // Still apply overrides for edge cases (e.g. allow-only users).
      const permissions = await this.applyOverrides(String(userId), new Set());
      return {
        userId: String(userId),
        roleIds: [],
        roleCodes: [],
        permissions,
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

    // Bypass roles keep full access; overrides are still applied so explicit
    // denies can restrict Super Admin only when product policy requires it.
    // Current policy: bypass skips override application (Super Admin remains full).
    const permissions = bypassPermissions
      ? [...permissionSet].sort()
      : await this.applyOverrides(String(userId), permissionSet);

    return {
      userId: String(userId),
      roleIds,
      roleCodes,
      permissions,
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

  private async applyOverrides(
    userId: string,
    rolePermissions: Set<string>,
  ): Promise<string[]> {
    const overrides =
      await this.permissionOverridesService.listActiveForUser(userId);
    const effective = new Set(rolePermissions);

    for (const override of overrides) {
      if (override.effect === PermissionOverrideEffect.Allow) {
        effective.add(override.permission);
      }
    }

    for (const override of overrides) {
      if (override.effect === PermissionOverrideEffect.Deny) {
        effective.delete(override.permission);
      }
    }

    return [...effective].sort();
  }
}
