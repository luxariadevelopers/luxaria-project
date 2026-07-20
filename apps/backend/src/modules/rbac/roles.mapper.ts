import type { Types } from 'mongoose';
import type { RoleStatus } from './schemas/role.schema';

export type PublicRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
  bypassPermissions: boolean;
  isSystem: boolean;
  status: RoleStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

type RoleLike = {
  _id: Types.ObjectId | string;
  code: string;
  name: string;
  description?: string | null;
  permissions?: string[];
  bypassPermissions?: boolean;
  isSystem?: boolean;
  status: RoleStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicRole(role: RoleLike): PublicRole {
  return {
    id: String(role._id),
    code: role.code,
    name: role.name,
    description: role.description ?? null,
    permissions: [...(role.permissions ?? [])].sort(),
    bypassPermissions: Boolean(role.bypassPermissions),
    isSystem: Boolean(role.isSystem),
    status: role.status,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}
