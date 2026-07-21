import type { Types } from 'mongoose';
import type { DepartmentStatus } from './schemas/department.schema';
import type { DesignationStatus } from './schemas/designation.schema';
import type { EmployeeStatus } from './schemas/employee.schema';

export type PublicDepartment = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  status: DepartmentStatus;
  headUserId: string | null;
  description: string | null;
};

export type PublicDesignation = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  departmentId: string | null;
  defaultRoleCode: string | null;
  reportingLevel: number | null;
  mobileEligible: boolean;
  status: DesignationStatus;
};

export type PublicEmployee = {
  id: string;
  companyId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  mobile: string | null;
  departmentId: string;
  designationId: string;
  reportingManagerUserId: string | null;
  employmentType: string;
  joiningDate: Date | null;
  relievingDate: Date | null;
  status: EmployeeStatus;
  primaryWorkLocation: string | null;
  profilePhoto: string | null;
  emergencyContact: Record<string, unknown> | null;
  userId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicDepartment(row: {
  _id: Types.ObjectId | string;
  companyId: Types.ObjectId | string;
  code: string;
  name: string;
  status: DepartmentStatus;
  headUserId?: Types.ObjectId | string | null;
  description?: string | null;
}): PublicDepartment {
  return {
    id: String(row._id),
    companyId: String(row.companyId),
    code: row.code,
    name: row.name,
    status: row.status,
    headUserId: row.headUserId ? String(row.headUserId) : null,
    description: row.description ?? null,
  };
}

export function toPublicDesignation(row: {
  _id: Types.ObjectId | string;
  companyId: Types.ObjectId | string;
  code: string;
  name: string;
  departmentId?: Types.ObjectId | string | null;
  defaultRoleCode?: string | null;
  reportingLevel?: number | null;
  mobileEligible?: boolean;
  status: DesignationStatus;
}): PublicDesignation {
  return {
    id: String(row._id),
    companyId: String(row.companyId),
    code: row.code,
    name: row.name,
    departmentId: row.departmentId ? String(row.departmentId) : null,
    defaultRoleCode: row.defaultRoleCode ?? null,
    reportingLevel: row.reportingLevel ?? null,
    mobileEligible: Boolean(row.mobileEligible),
    status: row.status,
  };
}

export function toPublicEmployee(row: {
  _id: Types.ObjectId | string;
  companyId: Types.ObjectId | string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  mobile?: string | null;
  departmentId: Types.ObjectId | string;
  designationId: Types.ObjectId | string;
  reportingManagerUserId?: Types.ObjectId | string | null;
  employmentType: string;
  joiningDate?: Date | null;
  relievingDate?: Date | null;
  status: EmployeeStatus;
  primaryWorkLocation?: string | null;
  profilePhoto?: string | null;
  emergencyContact?: Record<string, unknown> | null;
  userId?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicEmployee {
  return {
    id: String(row._id),
    companyId: String(row.companyId),
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    email: row.email,
    mobile: row.mobile ?? null,
    departmentId: String(row.departmentId),
    designationId: String(row.designationId),
    reportingManagerUserId: row.reportingManagerUserId
      ? String(row.reportingManagerUserId)
      : null,
    employmentType: row.employmentType,
    joiningDate: row.joiningDate ?? null,
    relievingDate: row.relievingDate ?? null,
    status: row.status,
    primaryWorkLocation: row.primaryWorkLocation ?? null,
    profilePhoto: row.profilePhoto ?? null,
    emergencyContact: row.emergencyContact ?? null,
    userId: row.userId ? String(row.userId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
