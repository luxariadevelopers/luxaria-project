import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/api/client';
import type {
  AdminPaginationMeta,
  CreateSiteInput,
  EmployeeAccessSummary,
  ListEmployeesQuery,
  ListSiteAssignmentsQuery,
  ListSitesQuery,
  PaginatedEmployees,
  PaginatedSiteAssignments,
  PaginatedSites,
  ProvisionSiteEngineerInput,
  ProvisionSiteEngineerResult,
  PublicDepartment,
  PublicDesignation,
  PublicEmployee,
  PublicSite,
  PublicSiteAssignment,
} from './types';

export type UpdateEmployeeInput = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  mobile?: string | null;
  departmentId?: string;
  designationId?: string;
  reportingManagerUserId?: string | null;
  employmentType?: string;
  joiningDate?: string | null;
  relievingDate?: string | null;
  status?: string;
  primaryWorkLocation?: string | null;
  profilePhoto?: string | null;
};

function toNullableIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function readAdminPaginationMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): AdminPaginationMeta {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

export function normaliseEmployee(employee: PublicEmployee): PublicEmployee {
  return {
    ...employee,
    mobile: employee.mobile ?? null,
    reportingManagerUserId: employee.reportingManagerUserId ?? null,
    joiningDate: toNullableIso(employee.joiningDate),
    relievingDate: toNullableIso(employee.relievingDate),
    primaryWorkLocation: employee.primaryWorkLocation ?? null,
    profilePhoto: employee.profilePhoto ?? null,
    emergencyContact: employee.emergencyContact ?? null,
    userId: employee.userId ?? null,
    createdAt: toNullableIso(employee.createdAt) ?? undefined,
    updatedAt: toNullableIso(employee.updatedAt) ?? undefined,
  };
}

function toIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.projectIds)) {
      return record.projectIds.map(String);
    }
    if (Array.isArray(record.siteIds)) {
      return record.siteIds.map(String);
    }
  }
  return [];
}

export function normaliseAccessSummary(
  summary: EmployeeAccessSummary,
): EmployeeAccessSummary {
  return {
    employee: normaliseEmployee(summary.employee),
    roles: summary.roles ?? [],
    projects: toIdList(summary.projects),
    sites: toIdList(summary.sites),
    overrides: (summary.overrides ?? []).map((row) => ({
      permission: row.permission,
      effect: row.effect,
      projectId: row.projectId ?? null,
      siteId: row.siteId ?? null,
    })),
  };
}

export function normaliseSite(site: PublicSite): PublicSite {
  return {
    ...site,
    address: site.address ?? null,
    startDate: toNullableIso(site.startDate),
    endDate: toNullableIso(site.endDate),
    siteManagerUserId: site.siteManagerUserId ?? null,
    warehouseRef: site.warehouseRef ?? null,
    geo: site.geo ?? null,
    createdAt: toNullableIso(site.createdAt) ?? undefined,
    updatedAt: toNullableIso(site.updatedAt) ?? undefined,
  };
}

export function normaliseSiteAssignment(
  row: PublicSiteAssignment,
): PublicSiteAssignment {
  return {
    ...row,
    employeeId: row.employeeId ?? null,
    projectAssignmentId: row.projectAssignmentId ?? null,
    roleInSite: row.roleInSite ?? null,
    effectiveFrom: toNullableIso(row.effectiveFrom) ?? String(row.effectiveFrom),
    effectiveTo: toNullableIso(row.effectiveTo),
    isDefault: Boolean(row.isDefault),
    assignedBy: row.assignedBy ?? null,
    notes: row.notes ?? null,
    createdAt: toNullableIso(row.createdAt) ?? undefined,
    updatedAt: toNullableIso(row.updatedAt) ?? undefined,
  };
}

/** `GET /employees` — guarded by `employee.view`. */
export async function fetchEmployees(
  query: ListEmployeesQuery = {},
): Promise<PaginatedEmployees> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const response = await apiGet<PublicEmployee[]>('/employees', {
    ...query,
    page,
    limit,
  });
  return {
    items: (response.data ?? []).map(normaliseEmployee),
    meta: readAdminPaginationMeta(
      response.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /employees/:id` — guarded by `employee.view`. */
export async function fetchEmployee(
  employeeId: string,
): Promise<PublicEmployee> {
  const response = await apiGet<PublicEmployee>(`/employees/${employeeId}`);
  if (!response.data) {
    throw new Error(response.message || 'Employee not found');
  }
  return normaliseEmployee(response.data);
}

/** `GET /employees/:id/access` — guarded by `employee.view`. */
export async function fetchEmployeeAccess(
  employeeId: string,
): Promise<EmployeeAccessSummary> {
  const response = await apiGet<EmployeeAccessSummary>(
    `/employees/${employeeId}/access`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Employee access not found');
  }
  return normaliseAccessSummary(response.data);
}

/** `PUT /employees/:id/module-access` — guarded by `employee.update`. */
export async function syncEmployeeModuleAccess(
  employeeId: string,
  input: {
    denyPermissions: string[];
    catalogPermissions: string[];
  },
): Promise<EmployeeAccessSummary> {
  const response = await apiPut<EmployeeAccessSummary>(
    `/employees/${employeeId}/module-access`,
    input,
  );
  if (!response.data) {
    throw new Error(response.message || 'Module access update failed');
  }
  return normaliseAccessSummary(response.data);
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeInput,
): Promise<PublicEmployee> {
  const response = await apiPatch<PublicEmployee>(
    `/employees/${employeeId}`,
    input,
  );
  if (!response.data) {
    throw new Error(response.message || 'Employee update failed');
  }
  return normaliseEmployee(response.data);
}

export async function deactivateEmployee(
  employeeId: string,
): Promise<PublicEmployee> {
  const response = await apiPost<PublicEmployee>(
    `/employees/${employeeId}/deactivate`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Employee deactivation failed');
  }
  return normaliseEmployee(response.data);
}

/** `POST /employees/provision-site-engineer`. */
export async function provisionSiteEngineer(
  input: ProvisionSiteEngineerInput,
): Promise<ProvisionSiteEngineerResult> {
  const response = await apiPost<ProvisionSiteEngineerResult>(
    '/employees/provision-site-engineer',
    input,
  );
  if (!response.data?.employee) {
    throw new Error(response.message || 'Site engineer provision failed');
  }
  return {
    ...response.data,
    employee: normaliseEmployee(response.data.employee),
  };
}

function normaliseDepartment(row: PublicDepartment): PublicDepartment {
  return {
    ...row,
    headUserId: row.headUserId ?? null,
    description: row.description ?? null,
  };
}

/** `GET /departments` — guarded by `department.view`. */
export async function fetchDepartments(): Promise<PublicDepartment[]> {
  const response = await apiGet<PublicDepartment[]>('/departments');
  return (response.data ?? []).map(normaliseDepartment);
}

export type CreateDepartmentInput = {
  code: string;
  name: string;
  description?: string | null;
};

export type UpdateDepartmentInput = {
  name?: string;
  description?: string | null;
};

/** `POST /departments` — guarded by `department.manage`. */
export async function createDepartment(
  input: CreateDepartmentInput,
): Promise<PublicDepartment> {
  const response = await apiPost<PublicDepartment>('/departments', input);
  if (!response.data) {
    throw new Error(response.message || 'Department create failed');
  }
  return normaliseDepartment(response.data);
}

/** `PATCH /departments/:id` — guarded by `department.manage`. */
export async function updateDepartment(
  departmentId: string,
  input: UpdateDepartmentInput,
): Promise<PublicDepartment> {
  const response = await apiPatch<PublicDepartment>(
    `/departments/${departmentId}`,
    input,
  );
  if (!response.data) {
    throw new Error(response.message || 'Department update failed');
  }
  return normaliseDepartment(response.data);
}

/** `POST /departments/:id/activate` — guarded by `department.manage`. */
export async function activateDepartment(
  departmentId: string,
): Promise<PublicDepartment> {
  const response = await apiPost<PublicDepartment>(
    `/departments/${departmentId}/activate`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Department activate failed');
  }
  return normaliseDepartment(response.data);
}

/** `POST /departments/:id/deactivate` — guarded by `department.manage`. */
export async function deactivateDepartment(
  departmentId: string,
): Promise<PublicDepartment> {
  const response = await apiPost<PublicDepartment>(
    `/departments/${departmentId}/deactivate`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Department deactivate failed');
  }
  return normaliseDepartment(response.data);
}

/** `DELETE /departments/:id` — guarded by `department.manage`. */
export async function deleteDepartment(
  departmentId: string,
): Promise<PublicDepartment> {
  const response = await apiDelete<PublicDepartment>(
    `/departments/${departmentId}`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Department delete failed');
  }
  return normaliseDepartment(response.data);
}

function normaliseDesignation(row: PublicDesignation): PublicDesignation {
  return {
    ...row,
    departmentId: row.departmentId ?? null,
    defaultRoleCode: row.defaultRoleCode ?? null,
    reportingLevel: row.reportingLevel ?? null,
    mobileEligible: Boolean(row.mobileEligible),
  };
}

/** `GET /designations` — guarded by `designation.view`. */
export async function fetchDesignations(): Promise<PublicDesignation[]> {
  const response = await apiGet<PublicDesignation[]>('/designations');
  return (response.data ?? []).map(normaliseDesignation);
}

export type CreateDesignationInput = {
  code: string;
  name: string;
  departmentId?: string | null;
  defaultRoleCode?: string | null;
  reportingLevel?: number | null;
  mobileEligible?: boolean;
};

export type UpdateDesignationInput = {
  name?: string;
  departmentId?: string | null;
  defaultRoleCode?: string | null;
  reportingLevel?: number | null;
  mobileEligible?: boolean;
};

/** `POST /designations` — guarded by `designation.manage`. */
export async function createDesignation(
  input: CreateDesignationInput,
): Promise<PublicDesignation> {
  const response = await apiPost<PublicDesignation>('/designations', input);
  if (!response.data) {
    throw new Error(response.message || 'Designation create failed');
  }
  return normaliseDesignation(response.data);
}

/** `PATCH /designations/:id` — guarded by `designation.manage`. */
export async function updateDesignation(
  designationId: string,
  input: UpdateDesignationInput,
): Promise<PublicDesignation> {
  const response = await apiPatch<PublicDesignation>(
    `/designations/${designationId}`,
    input,
  );
  if (!response.data) {
    throw new Error(response.message || 'Designation update failed');
  }
  return normaliseDesignation(response.data);
}

/** `POST /designations/:id/activate` — guarded by `designation.manage`. */
export async function activateDesignation(
  designationId: string,
): Promise<PublicDesignation> {
  const response = await apiPost<PublicDesignation>(
    `/designations/${designationId}/activate`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Designation activate failed');
  }
  return normaliseDesignation(response.data);
}

/** `POST /designations/:id/deactivate` — guarded by `designation.manage`. */
export async function deactivateDesignation(
  designationId: string,
): Promise<PublicDesignation> {
  const response = await apiPost<PublicDesignation>(
    `/designations/${designationId}/deactivate`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Designation deactivate failed');
  }
  return normaliseDesignation(response.data);
}

/** `DELETE /designations/:id` — guarded by `designation.manage`. */
export async function deleteDesignation(
  designationId: string,
): Promise<PublicDesignation> {
  const response = await apiDelete<PublicDesignation>(
    `/designations/${designationId}`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Designation delete failed');
  }
  return normaliseDesignation(response.data);
}

/** `GET /sites` — guarded by `site.view`. */
export async function fetchSites(
  query: ListSitesQuery = {},
): Promise<PaginatedSites> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const response = await apiGet<PublicSite[]>('/sites', {
    ...query,
    page,
    limit,
  });
  return {
    items: (response.data ?? []).map(normaliseSite),
    meta: readAdminPaginationMeta(
      response.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `POST /sites` — guarded by `site.manage`. */
export async function createSite(input: CreateSiteInput): Promise<PublicSite> {
  const response = await apiPost<PublicSite>('/sites', input);
  if (!response.data) {
    throw new Error(response.message || 'Site creation failed');
  }
  return normaliseSite(response.data);
}

/** `GET /site-access` — guarded by `site_access.view`. */
export async function fetchSiteAssignments(
  query: ListSiteAssignmentsQuery = {},
): Promise<PaginatedSiteAssignments> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const response = await apiGet<PublicSiteAssignment[]>('/site-access', {
    ...query,
    page,
    limit,
  });
  return {
    items: (response.data ?? []).map(normaliseSiteAssignment),
    meta: readAdminPaginationMeta(
      response.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

export type CreateSiteAssignmentInput = {
  userId: string;
  projectId: string;
  siteId: string;
  roleInSite?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isDefault?: boolean;
  notes?: string | null;
};

/** `POST /site-access` — guarded by `site_access.assign`. */
export async function createSiteAssignment(
  input: CreateSiteAssignmentInput,
): Promise<PublicSiteAssignment> {
  const response = await apiPost<PublicSiteAssignment>('/site-access', input);
  if (!response.data) {
    throw new Error(response.message || 'Site assignment create failed');
  }
  return normaliseSiteAssignment(response.data);
}

/** `POST /site-access/:id/revoke` — guarded by `site_access.assign`. */
export async function revokeSiteAssignment(
  assignmentId: string,
): Promise<PublicSiteAssignment> {
  const response = await apiPost<PublicSiteAssignment>(
    `/site-access/${assignmentId}/revoke`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Site assignment revoke failed');
  }
  return normaliseSiteAssignment(response.data);
}
