import type { ApiResponse } from '@luxaria/shared-types';
import {
  apiClient,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '@/api/client';
import type {
  AssignProjectTeamInput,
  CloneProjectInput,
  CreateProjectAssignmentInput,
  CreateProjectInput,
  CreateStructureNodeInput,
  CreateWarehouseInput,
  ListProjectAssignmentsQuery,
  ListProjectsQuery,
  PaginatedProjectAssignments,
  PaginatedProjectDocuments,
  PaginatedProjects,
  ProjectBankOption,
  ProjectCompany,
  ProjectFinancialConfig,
  ProjectPaginationMeta,
  ProjectSettings,
  ProjectUserOption,
  PublicProject,
  PublicProjectAssignment,
  PublicProjectDocument,
  PublicProjectSite,
  PublicProjectSiteNode,
  UpdateProjectAssignmentInput,
  UpdateProjectFinancialConfigInput,
  UpdateProjectInput,
  UpdateProjectSettingsInput,
  UpdateProjectStatusInput,
} from './types';
import {
  DEFAULT_PROJECT_FINANCIAL_CONFIG,
  DEFAULT_PROJECT_SETTINGS,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): ProjectPaginationMeta {
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

function normaliseSettings(
  settings?: Partial<ProjectSettings> | null,
): ProjectSettings {
  return {
    ...DEFAULT_PROJECT_SETTINGS,
    ...(settings ?? {}),
  };
}

function normaliseFinancialConfig(
  config?: Partial<ProjectFinancialConfig> | null,
): ProjectFinancialConfig {
  return {
    ...DEFAULT_PROJECT_FINANCIAL_CONFIG,
    ...(config ?? {}),
    costCentreCodes: config?.costCentreCodes ?? [],
    budgetCategories: config?.budgetCategories ?? [],
  };
}

function normaliseProject(row: PublicProject): PublicProject {
  return {
    ...row,
    description: row.description ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    siteRadiusMeters: row.siteRadiusMeters ?? null,
    landArea: row.landArea ?? null,
    builtUpArea: row.builtUpArea ?? null,
    numberOfBlocks: row.numberOfBlocks ?? null,
    numberOfUnits: row.numberOfUnits ?? null,
    startDate: toIso(row.startDate),
    expectedCompletionDate: toIso(row.expectedCompletionDate),
    actualCompletionDate: toIso(row.actualCompletionDate),
    statusBeforeHold: row.statusBeforeHold ?? null,
    clientName: row.clientName ?? null,
    currency: row.currency ?? 'INR',
    timeZone: row.timeZone ?? 'Asia/Kolkata',
    financialYearId: row.financialYearId ?? null,
    settings: normaliseSettings(row.settings),
    financialConfig: normaliseFinancialConfig(row.financialConfig),
    projectManager: row.projectManager ?? null,
    assignedDirectors: row.assignedDirectors ?? [],
    defaultBankAccount: row.defaultBankAccount ?? null,
    approvedBudget: row.approvedBudget ?? null,
    companyId: row.companyId ?? null,
    reraDetails: {
      reraNumber: row.reraDetails?.reraNumber ?? null,
      registrationDate: toIso(row.reraDetails?.registrationDate),
      validUntil: toIso(row.reraDetails?.validUntil),
      authority: row.reraDetails?.authority ?? null,
      notes: row.reraDetails?.notes ?? null,
    },
    createdAt: toIso(row.createdAt) ?? undefined,
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

function normaliseAssignment(
  row: PublicProjectAssignment,
): PublicProjectAssignment {
  return {
    ...row,
    projectId: row.projectId ?? null,
    accessStartDate: toIso(row.accessStartDate) ?? '',
    accessEndDate: toIso(row.accessEndDate),
    notes: row.notes ?? null,
    teamRole: row.teamRole ?? null,
    createdAt: toIso(row.createdAt) ?? undefined,
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

function normaliseDocument(
  row: PublicProjectDocument,
): PublicProjectDocument {
  return {
    ...row,
    mimeType: row.mimeType ?? null,
    description: row.description ?? null,
    uploadedBy: row.uploadedBy ?? null,
    createdAt: toIso(row.createdAt) ?? undefined,
  };
}

function normaliseSite(row: PublicProjectSite): PublicProjectSite {
  return {
    ...row,
    parentSiteId: row.parentSiteId ?? null,
    warehouseKind: row.warehouseKind ?? null,
    contactName: row.contactName ?? null,
    contactPhone: row.contactPhone ?? null,
    address: row.address ?? null,
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    siteManagerUserId: row.siteManagerUserId ?? null,
    warehouseRef: row.warehouseRef ?? null,
    createdAt: toIso(row.createdAt) ?? undefined,
    updatedAt: toIso(row.updatedAt) ?? undefined,
  };
}

function normaliseSiteNode(row: PublicProjectSiteNode): PublicProjectSiteNode {
  return {
    ...normaliseSite(row),
    children: (row.children ?? []).map(normaliseSiteNode),
  };
}

/** `GET /projects` — access-scoped, `project.view`. */
export async function fetchProjects(
  query: ListProjectsQuery = {},
): Promise<PaginatedProjects> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicProject[]>('/projects', {
    ...query,
    page,
    limit,
  });
  return {
    items: (res.data ?? []).map(normaliseProject),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

/** `GET /projects/:id` — `project.view` plus explicit project access. */
export async function fetchProject(id: string): Promise<PublicProject> {
  const res = await apiGet<PublicProject>(`/projects/${id}`);
  if (!res.data) {
    throw new Error(res.message || 'Project not found');
  }
  return normaliseProject(res.data);
}

/** `POST /projects` — projectCode is generated by the backend. */
export async function createProject(
  input: CreateProjectInput,
): Promise<PublicProject> {
  const res = await apiPost<PublicProject>('/projects', input);
  if (!res.data) {
    throw new Error(res.message || 'Project creation failed');
  }
  return normaliseProject(res.data);
}

/** `PATCH /projects/:id` — editable master fields only. */
export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<PublicProject> {
  const res = await apiPatch<PublicProject>(`/projects/${id}`, input);
  if (!res.data) {
    throw new Error(res.message || 'Project update failed');
  }
  return normaliseProject(res.data);
}

export async function updateProjectStatus(
  id: string,
  input: UpdateProjectStatusInput,
): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(`/projects/${id}/status`, input);
  if (!res.data) {
    throw new Error(res.message || 'Project status update failed');
  }
  return normaliseProject(res.data);
}

export async function updateProjectSettings(
  id: string,
  input: UpdateProjectSettingsInput,
): Promise<PublicProject> {
  const res = await apiPatch<PublicProject>(`/projects/${id}/settings`, input);
  if (!res.data) {
    throw new Error(res.message || 'Project settings update failed');
  }
  return normaliseProject(res.data);
}

export async function updateProjectFinancialConfig(
  id: string,
  input: UpdateProjectFinancialConfigInput,
): Promise<PublicProject> {
  const res = await apiPatch<PublicProject>(
    `/projects/${id}/financial-config`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Project financial config update failed');
  }
  return normaliseProject(res.data);
}

export async function suspendProject(id: string): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(`/projects/${id}/suspend`);
  if (!res.data) {
    throw new Error(res.message || 'Project suspend failed');
  }
  return normaliseProject(res.data);
}

export async function resumeProject(id: string): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(`/projects/${id}/resume`);
  if (!res.data) {
    throw new Error(res.message || 'Project resume failed');
  }
  return normaliseProject(res.data);
}

export async function closeProject(id: string): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(`/projects/${id}/close`);
  if (!res.data) {
    throw new Error(res.message || 'Project close failed');
  }
  return normaliseProject(res.data);
}

export async function archiveProject(id: string): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(`/projects/${id}/archive`);
  if (!res.data) {
    throw new Error(res.message || 'Project archive failed');
  }
  return normaliseProject(res.data);
}

export async function restoreProject(id: string): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(`/projects/${id}/restore`);
  if (!res.data) {
    throw new Error(res.message || 'Project restore failed');
  }
  return normaliseProject(res.data);
}

export async function cloneProject(
  id: string,
  input: CloneProjectInput,
): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(`/projects/${id}/clone`, input);
  if (!res.data) {
    throw new Error(res.message || 'Project clone failed');
  }
  return normaliseProject(res.data);
}

export async function softDeleteProject(
  id: string,
): Promise<{ id: string; deleted: boolean }> {
  const res = await apiDelete<{ id: string; deleted: boolean }>(
    `/projects/${id}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Project soft-delete failed');
  }
  return res.data;
}

export async function assignProjectManager(
  id: string,
  projectManagerId: string,
): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(
    `/projects/${id}/project-manager`,
    { projectManagerId },
  );
  if (!res.data) {
    throw new Error(res.message || 'Project manager assignment failed');
  }
  return normaliseProject(res.data);
}

export async function assignProjectDirectors(
  id: string,
  directorIds: string[],
): Promise<PublicProject> {
  const res = await apiPost<PublicProject>(`/projects/${id}/directors`, {
    directorIds,
  });
  if (!res.data) {
    throw new Error(res.message || 'Project director assignment failed');
  }
  return normaliseProject(res.data);
}

export async function fetchProjectStructure(
  projectId: string,
): Promise<PublicProjectSiteNode[]> {
  const res = await apiGet<PublicProjectSiteNode[]>(
    `/projects/${projectId}/structure`,
  );
  return (res.data ?? []).map(normaliseSiteNode);
}

export async function createProjectStructureNode(
  projectId: string,
  input: CreateStructureNodeInput,
): Promise<PublicProjectSite> {
  const res = await apiPost<PublicProjectSite>(
    `/projects/${projectId}/structure`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Structure node creation failed');
  }
  return normaliseSite(res.data);
}

export async function fetchProjectWarehouses(
  projectId: string,
): Promise<PublicProjectSite[]> {
  const res = await apiGet<PublicProjectSite[]>(
    `/projects/${projectId}/warehouses`,
  );
  return (res.data ?? []).map(normaliseSite);
}

export async function createProjectWarehouse(
  projectId: string,
  input: CreateWarehouseInput,
): Promise<PublicProjectSite> {
  const res = await apiPost<PublicProjectSite>(
    `/projects/${projectId}/warehouses`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Warehouse creation failed');
  }
  return normaliseSite(res.data);
}

export async function fetchProjectTeam(
  projectId: string,
): Promise<PublicProjectAssignment[]> {
  const res = await apiGet<PublicProjectAssignment[]>(
    `/projects/${projectId}/team`,
  );
  return (res.data ?? []).map(normaliseAssignment);
}

export async function assignProjectTeam(
  projectId: string,
  input: AssignProjectTeamInput,
): Promise<PublicProjectAssignment> {
  const res = await apiPost<PublicProjectAssignment>(
    `/projects/${projectId}/team`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Team assignment failed');
  }
  return normaliseAssignment(res.data);
}

export async function revokeProjectTeam(
  projectId: string,
  assignmentId: string,
): Promise<{ id: string; status: string }> {
  const res = await apiDelete<{ id: string; status: string }>(
    `/projects/${projectId}/team/${assignmentId}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Team revoke failed');
  }
  return res.data;
}

export async function fetchProjectDocuments(
  projectId: string,
  query: { page?: number; limit?: number; category?: string } = {},
): Promise<PaginatedProjectDocuments> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicProjectDocument[]>(
    `/projects/${projectId}/documents`,
    { ...query, page, limit },
  );
  return {
    items: (res.data ?? []).map(normaliseDocument),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

export async function uploadProjectDocument(
  projectId: string,
  input: { file: File; category?: string; description?: string },
): Promise<PublicProjectDocument> {
  const form = new FormData();
  form.append('file', input.file);
  if (input.category) form.append('category', input.category);
  if (input.description?.trim()) {
    form.append('description', input.description.trim());
  }
  const { data } = await apiClient.post<ApiResponse<PublicProjectDocument>>(
    `/projects/${projectId}/documents`,
    form,
    { headers: { 'Content-Type': undefined } },
  );
  if (!data.data) {
    throw new Error(data.message || 'Project document upload failed');
  }
  return normaliseDocument(data.data);
}

export async function fetchProjectAssignments(
  query: ListProjectAssignmentsQuery,
): Promise<PaginatedProjectAssignments> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const res = await apiGet<PublicProjectAssignment[]>(
    '/project-access/assignments',
    { ...query, page, limit },
  );
  return {
    items: (res.data ?? []).map(normaliseAssignment),
    meta: readMeta(
      res.meta as Record<string, unknown> | undefined,
      page,
      limit,
    ),
  };
}

export async function createProjectAssignment(
  input: CreateProjectAssignmentInput,
): Promise<PublicProjectAssignment> {
  const res = await apiPost<PublicProjectAssignment>(
    '/project-access/assignments',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Project access assignment failed');
  }
  return normaliseAssignment(res.data);
}

export async function updateProjectAssignment(
  id: string,
  input: UpdateProjectAssignmentInput,
): Promise<PublicProjectAssignment> {
  const res = await apiPatch<PublicProjectAssignment>(
    `/project-access/assignments/${id}`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Project access update failed');
  }
  return normaliseAssignment(res.data);
}

export async function activateProjectAssignment(
  id: string,
): Promise<PublicProjectAssignment> {
  const res = await apiPost<PublicProjectAssignment>(
    `/project-access/assignments/${id}/activate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Project access activation failed');
  }
  return normaliseAssignment(res.data);
}

export async function deactivateProjectAssignment(
  id: string,
): Promise<PublicProjectAssignment> {
  const res = await apiPost<PublicProjectAssignment>(
    `/project-access/assignments/${id}/deactivate`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Project access deactivation failed');
  }
  return normaliseAssignment(res.data);
}

/** Optional lookup: real `GET /users`; callers hide selectors on 403/error. */
export async function fetchProjectUserOptions(): Promise<ProjectUserOption[]> {
  const res = await apiGet<ProjectUserOption[]>('/users', {
    page: 1,
    limit: 100,
    status: 'active',
  });
  return res.data ?? [];
}

/** Authenticated tenant lookup; falls back to the real primary-company API. */
export async function fetchProjectCompany(
  companyId?: string | null,
): Promise<ProjectCompany> {
  const res = await apiGet<ProjectCompany>(
    companyId ? `/companies/${companyId}` : '/companies/primary',
  );
  if (!res.data) {
    throw new Error(res.message || 'Company unavailable');
  }
  return res.data;
}

/** Optional lookup: real masked bank-account endpoint. */
export async function fetchProjectBankOptions(): Promise<ProjectBankOption[]> {
  const res = await apiGet<ProjectBankOption[]>('/company-bank-accounts', {
    page: 1,
    limit: 100,
    status: 'active',
    companyOnly: true,
  });
  return res.data ?? [];
}
