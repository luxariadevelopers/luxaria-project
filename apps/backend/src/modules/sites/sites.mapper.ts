import type { Types } from 'mongoose';
import type { SiteStatus, SiteType } from './schemas/site.schema';
import type { SiteAssignmentStatus } from './schemas/site-assignment.schema';

export type PublicSite = {
  id: string;
  companyId: string;
  projectId: string;
  siteCode: string;
  siteName: string;
  type: SiteType;
  address: string | null;
  status: SiteStatus;
  startDate: Date | null;
  endDate: Date | null;
  siteManagerUserId: string | null;
  warehouseRef: string | null;
  geo: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicSiteAssignment = {
  id: string;
  companyId: string;
  userId: string;
  employeeId: string | null;
  projectId: string;
  siteId: string;
  projectAssignmentId: string | null;
  roleInSite: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: SiteAssignmentStatus;
  isDefault: boolean;
  assignedBy: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type SiteLike = {
  _id: Types.ObjectId | string;
  companyId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  siteCode: string;
  siteName: string;
  type: SiteType;
  address?: string | null;
  status: SiteStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  siteManagerUserId?: Types.ObjectId | string | null;
  warehouseRef?: string | null;
  geo?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type AssignmentLike = {
  _id: Types.ObjectId | string;
  companyId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  employeeId?: Types.ObjectId | string | null;
  projectId: Types.ObjectId | string;
  siteId: Types.ObjectId | string;
  projectAssignmentId?: Types.ObjectId | string | null;
  roleInSite?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  status: SiteAssignmentStatus;
  isDefault?: boolean;
  assignedBy?: Types.ObjectId | string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicSite(site: SiteLike): PublicSite {
  return {
    id: String(site._id),
    companyId: String(site.companyId),
    projectId: String(site.projectId),
    siteCode: site.siteCode,
    siteName: site.siteName,
    type: site.type,
    address: site.address ?? null,
    status: site.status,
    startDate: site.startDate ?? null,
    endDate: site.endDate ?? null,
    siteManagerUserId: site.siteManagerUserId
      ? String(site.siteManagerUserId)
      : null,
    warehouseRef: site.warehouseRef ?? null,
    geo: site.geo ?? null,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

export function toPublicSiteAssignment(
  assignment: AssignmentLike,
): PublicSiteAssignment {
  return {
    id: String(assignment._id),
    companyId: String(assignment.companyId),
    userId: String(assignment.userId),
    employeeId: assignment.employeeId ? String(assignment.employeeId) : null,
    projectId: String(assignment.projectId),
    siteId: String(assignment.siteId),
    projectAssignmentId: assignment.projectAssignmentId
      ? String(assignment.projectAssignmentId)
      : null,
    roleInSite: assignment.roleInSite ?? null,
    effectiveFrom: assignment.effectiveFrom,
    effectiveTo: assignment.effectiveTo ?? null,
    status: assignment.status,
    isDefault: Boolean(assignment.isDefault),
    assignedBy: assignment.assignedBy ? String(assignment.assignedBy) : null,
    notes: assignment.notes ?? null,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}
