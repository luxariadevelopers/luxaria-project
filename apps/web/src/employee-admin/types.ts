export const EmployeeStatus = {
  Draft: 'draft',
  Invited: 'invited',
  Active: 'active',
  Suspended: 'suspended',
  OnLeave: 'on_leave',
  Relieved: 'relieved',
  Terminated: 'terminated',
  Archived: 'archived',
} as const;

export type EmployeeStatus =
  (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

export const DepartmentStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type DepartmentStatus =
  (typeof DepartmentStatus)[keyof typeof DepartmentStatus];

export const DesignationStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type DesignationStatus =
  (typeof DesignationStatus)[keyof typeof DesignationStatus];

export const SiteStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type SiteStatus = (typeof SiteStatus)[keyof typeof SiteStatus];

export const SiteAssignmentStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Expired: 'expired',
} as const;

export type SiteAssignmentStatus =
  (typeof SiteAssignmentStatus)[keyof typeof SiteAssignmentStatus];

export type PublicDepartment = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  status: DepartmentStatus | string;
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
  status: DesignationStatus | string;
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
  joiningDate: string | null;
  relievingDate: string | null;
  status: EmployeeStatus | string;
  primaryWorkLocation: string | null;
  profilePhoto: string | null;
  emergencyContact: Record<string, unknown> | null;
  userId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeAccessRole = {
  id: string;
  code: string;
  name: string;
};

export type EmployeeAccessOverride = {
  permission: string;
  effect: string;
  projectId: string | null;
  siteId: string | null;
};

export type EmployeeAccessSummary = {
  employee: PublicEmployee;
  roles: EmployeeAccessRole[];
  projects: string[];
  sites: string[];
  overrides: EmployeeAccessOverride[];
};

export type PublicSite = {
  id: string;
  companyId: string;
  projectId: string;
  siteCode: string;
  siteName: string;
  type: string;
  address: string | null;
  status: SiteStatus | string;
  startDate: string | null;
  endDate: string | null;
  siteManagerUserId: string | null;
  warehouseRef: string | null;
  geo: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
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
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SiteAssignmentStatus | string;
  isDefault: boolean;
  assignedBy: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedEmployees = {
  items: PublicEmployee[];
  meta: AdminPaginationMeta;
};

export type PaginatedSites = {
  items: PublicSite[];
  meta: AdminPaginationMeta;
};

export type PaginatedSiteAssignments = {
  items: PublicSiteAssignment[];
  meta: AdminPaginationMeta;
};

export type ListEmployeesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: EmployeeStatus;
  departmentId?: string;
  designationId?: string;
};

export type ListSitesQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: SiteStatus;
};

export type ListSiteAssignmentsQuery = {
  page?: number;
  limit?: number;
  userId?: string;
  projectId?: string;
  siteId?: string;
  status?: SiteAssignmentStatus;
};

export type CreateSiteInput = {
  projectId: string;
  siteCode: string;
  siteName: string;
};

export type ProvisionSiteEngineerInput = {
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  mobile?: string | null;
  employeeCode?: string;
  departmentCode?: string;
  departmentId?: string;
  designationCode?: string;
  designationId?: string;
  reportingManagerUserId?: string | null;
  createLogin: boolean;
  password?: string;
  roleCode?: string;
  projectId: string;
  siteId: string;
  accessStartDate?: string;
  accessEndDate?: string | null;
  permissionDenies?: string[];
  sendInvitation?: boolean;
};

export type ProvisionSiteEngineerResult = {
  employee: PublicEmployee;
  user: { id: string; userCode?: string; fullName?: string };
  roleIds: string[];
  projectAssignment: unknown;
  siteAssignment: unknown;
};

/** Optional Site Engineer permissions that may be denied at provision time. */
export const SITE_ENGINEER_OPTIONAL_DENY_PERMISSIONS = [
  { code: 'running_bill.verify', label: 'Verify running bills' },
  { code: 'manpower_plan.manage', label: 'Manage manpower plans' },
  { code: 'stock.issue', label: 'Issue stock' },
  { code: 'purchase.request', label: 'Create purchase requests' },
] as const;

export const DEFAULT_DEPARTMENT_CODE = 'ENGINEERING';
export const DEFAULT_DESIGNATION_CODE = 'SITE_ENGINEER';
export const DEFAULT_ROLE_CODE = 'SITE_ENGINEER';
