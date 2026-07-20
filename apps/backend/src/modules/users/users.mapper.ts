import type { Types } from 'mongoose';
import type { UserStatus } from './schemas/user.schema';

export type PublicUser = {
  id: string;
  userCode: string;
  fullName: string;
  email: string | null;
  mobile: string | null;
  employeeId: string | null;
  designation: string | null;
  department: string | null;
  profilePhoto: string | null;
  status: UserStatus | string;
  assignedProjects: string[];
  roleIds: string[];
  reportingManager: string | null;
  joiningDate: string | null;
  lastLoginAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type UserLike = {
  _id: Types.ObjectId | string;
  userCode: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  employeeId?: string | null;
  designation?: string | null;
  department?: string | null;
  profilePhoto?: string | null;
  status: UserStatus | string;
  assignedProjects?: Array<Types.ObjectId | string>;
  roleIds?: Array<Types.ObjectId | string>;
  reportingManager?: Types.ObjectId | string | null;
  joiningDate?: Date | null;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicUser(user: UserLike): PublicUser {
  return {
    id: String(user._id),
    userCode: user.userCode,
    fullName: user.fullName,
    email: user.email ?? null,
    mobile: user.mobile ?? null,
    employeeId: user.employeeId ?? null,
    designation: user.designation ?? null,
    department: user.department ?? null,
    profilePhoto: user.profilePhoto ?? null,
    status: user.status,
    assignedProjects: (user.assignedProjects ?? []).map((id) => String(id)),
    roleIds: (user.roleIds ?? []).map((id) => String(id)),
    reportingManager: user.reportingManager ? String(user.reportingManager) : null,
    joiningDate: user.joiningDate ? user.joiningDate.toISOString() : null,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : undefined,
  };
}
