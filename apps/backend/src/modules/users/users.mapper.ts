import type { Types } from 'mongoose';
import type {
  ReportingApprovalMode,
  UserStatus,
} from './schemas/user.schema';

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
  reportingOfficers: string[];
  reportingApprovalMode: ReportingApprovalMode | string;
  mustChangePassword: boolean;
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
  reportingOfficers?: Array<Types.ObjectId | string>;
  reportingApprovalMode?: ReportingApprovalMode | string;
  mustChangePassword?: boolean;
  joiningDate?: Date | null;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicUser(user: UserLike): PublicUser {
  const officers = (user.reportingOfficers ?? []).map((id) => String(id));
  const primary = user.reportingManager ? String(user.reportingManager) : null;
  // Backward compat: older rows only have reportingManager.
  const reportingOfficers =
    officers.length > 0
      ? officers
      : primary
        ? [primary]
        : [];

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
    reportingManager: primary,
    reportingOfficers,
    reportingApprovalMode: user.reportingApprovalMode ?? 'any',
    mustChangePassword: Boolean(user.mustChangePassword),
    joiningDate: user.joiningDate ? user.joiningDate.toISOString() : null,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
    updatedAt: user.updatedAt ? user.updatedAt.toISOString() : undefined,
  };
}
