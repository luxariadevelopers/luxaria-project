import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  PROJECT_ACCESS_ME_QUERY_KEY,
  PROJECTS_SELECTOR_QUERY_KEY,
} from '@luxaria/shared-types';
import { listAuditLogs } from '@/api/audit-logs';
import {
  activateProjectAssignment,
  assignProjectDirectors,
  assignProjectManager,
  createProject,
  createProjectAssignment,
  deactivateProjectAssignment,
  fetchProjectCompany,
  fetchProject,
  fetchProjectAssignments,
  fetchProjectBankOptions,
  fetchProjectDocuments,
  fetchProjects,
  fetchProjectUserOptions,
  updateProject,
  updateProjectAssignment,
  updateProjectStatus,
  uploadProjectDocument,
} from './api';
import { projectAccessKeys, projectKeys } from './queryKeys';
import type {
  CreateProjectAssignmentInput,
  CreateProjectInput,
  ListProjectAssignmentsQuery,
  ListProjectsQuery,
  UpdateProjectAssignmentInput,
  UpdateProjectInput,
  UpdateProjectStatusInput,
} from './types';

export function useProjectsList(query: ListProjectsQuery, enabled = true) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: () => fetchProjects(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useProjectDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? ''),
    queryFn: () => fetchProject(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useProjectDocuments(
  projectId: string | undefined,
  page: number,
  limit: number,
  category?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: projectKeys.documents(
      projectId ?? '',
      page,
      limit,
      category,
    ),
    queryFn: () =>
      fetchProjectDocuments(projectId!, { page, limit, category }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useProjectCompany(
  companyId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: projectKeys.company(companyId ?? null),
    queryFn: () => fetchProjectCompany(companyId),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useProjectUserOptions(enabled = true) {
  return useQuery({
    queryKey: projectKeys.users,
    queryFn: fetchProjectUserOptions,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useProjectBankOptions(enabled = true) {
  return useQuery({
    queryKey: projectKeys.banks,
    queryFn: fetchProjectBankOptions,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useProjectActivity(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: projectKeys.activity(projectId ?? ''),
    queryFn: () =>
      listAuditLogs({
        projectId: projectId!,
        page: 1,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      }),
    enabled: Boolean(projectId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateProject() {
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
  });
}

function useProjectMutationInvalidation(projectId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      }),
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: PROJECTS_SELECTOR_QUERY_KEY,
      }),
    ]);
  };
}

export function useUpdateProject(projectId: string) {
  const invalidate = useProjectMutationInvalidation(projectId);
  return useMutation({
    mutationFn: (input: UpdateProjectInput) =>
      updateProject(projectId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateProjectStatus(projectId: string) {
  const invalidate = useProjectMutationInvalidation(projectId);
  return useMutation({
    mutationFn: (input: UpdateProjectStatusInput) =>
      updateProjectStatus(projectId, input),
    onSuccess: invalidate,
  });
}

export function useAssignProjectManager(projectId: string) {
  const invalidate = useProjectMutationInvalidation(projectId);
  return useMutation({
    mutationFn: (projectManagerId: string) =>
      assignProjectManager(projectId, projectManagerId),
    onSuccess: invalidate,
  });
}

export function useAssignProjectDirectors(projectId: string) {
  const invalidate = useProjectMutationInvalidation(projectId);
  return useMutation({
    mutationFn: (directorIds: string[]) =>
      assignProjectDirectors(projectId, directorIds),
    onSuccess: invalidate,
  });
}

export function useUploadProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      file: File;
      category?: string;
      description?: string;
    }) => uploadProjectDocument(projectId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
        predicate: (query) => query.queryKey.includes('documents'),
      }),
  });
}

export function useProjectAssignments(
  query: ListProjectAssignmentsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: projectAccessKeys.list(query),
    queryFn: () => fetchProjectAssignments(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

function useAssignmentInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectAccessKeys.all }),
      queryClient.invalidateQueries({
        queryKey: PROJECT_ACCESS_ME_QUERY_KEY,
      }),
    ]);
  };
}

export function useCreateProjectAssignment() {
  const invalidate = useAssignmentInvalidation();
  return useMutation({
    mutationFn: (input: CreateProjectAssignmentInput) =>
      createProjectAssignment(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProjectAssignment() {
  const invalidate = useAssignmentInvalidation();
  return useMutation({
    mutationFn: (args: {
      id: string;
      input: UpdateProjectAssignmentInput;
    }) => updateProjectAssignment(args.id, args.input),
    onSuccess: invalidate,
  });
}

export function useActivateProjectAssignment() {
  const invalidate = useAssignmentInvalidation();
  return useMutation({
    mutationFn: activateProjectAssignment,
    onSuccess: invalidate,
  });
}

export function useDeactivateProjectAssignment() {
  const invalidate = useAssignmentInvalidation();
  return useMutation({
    mutationFn: deactivateProjectAssignment,
    onSuccess: invalidate,
  });
}
