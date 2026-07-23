import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateDepartment,
  activateDesignation,
  createDepartment,
  createDesignation,
  createSite,
  createSiteAssignment,
  deactivateDepartment,
  deactivateDesignation,
  deactivateEmployee,
  deleteDepartment,
  deleteDesignation,
  fetchDepartments,
  fetchDesignations,
  fetchEmployee,
  fetchEmployeeAccess,
  fetchEmployees,
  fetchSiteAssignments,
  fetchSites,
  provisionSiteEngineer,
  revokeSiteAssignment,
  syncEmployeeModuleAccess,
  updateDepartment,
  updateDesignation,
  updateEmployee,
  type CreateDepartmentInput,
  type CreateDesignationInput,
  type CreateSiteAssignmentInput,
  type UpdateDepartmentInput,
  type UpdateDesignationInput,
  type UpdateEmployeeInput,
} from './api';
import { employeeAdminKeys } from './queryKeys';
import type {
  CreateSiteInput,
  ListEmployeesQuery,
  ListSiteAssignmentsQuery,
  ListSitesQuery,
  ProvisionSiteEngineerInput,
} from './types';

export function useEmployeesList(query: ListEmployeesQuery, enabled = true) {
  return useQuery({
    queryKey: employeeAdminKeys.list(query),
    queryFn: () => fetchEmployees(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useEmployeeDetail(
  employeeId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: employeeAdminKeys.detail(employeeId ?? ''),
    queryFn: () => fetchEmployee(employeeId!),
    enabled: Boolean(employeeId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useEmployeeAccess(
  employeeId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: employeeAdminKeys.access(employeeId ?? ''),
    queryFn: () => fetchEmployeeAccess(employeeId!),
    enabled: Boolean(employeeId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useDepartmentsList(enabled = true) {
  return useQuery({
    queryKey: employeeAdminKeys.departments(),
    queryFn: fetchDepartments,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) => createDepartment(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.departments(),
      }),
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      departmentId,
      input,
    }: {
      departmentId: string;
      input: UpdateDepartmentInput;
    }) => updateDepartment(departmentId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.departments(),
      }),
  });
}

export function useActivateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: string) => activateDepartment(departmentId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.departments(),
      }),
  });
}

export function useDeactivateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: string) => deactivateDepartment(departmentId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.departments(),
      }),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: string) => deleteDepartment(departmentId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.departments(),
      }),
  });
}

export function useDesignationsList(enabled = true) {
  return useQuery({
    queryKey: employeeAdminKeys.designations(),
    queryFn: fetchDesignations,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDesignationInput) => createDesignation(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.designations(),
      }),
  });
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      designationId,
      input,
    }: {
      designationId: string;
      input: UpdateDesignationInput;
    }) => updateDesignation(designationId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.designations(),
      }),
  });
}

export function useActivateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (designationId: string) => activateDesignation(designationId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.designations(),
      }),
  });
}

export function useDeactivateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (designationId: string) => deactivateDesignation(designationId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.designations(),
      }),
  });
}

export function useDeleteDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (designationId: string) => deleteDesignation(designationId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.designations(),
      }),
  });
}

export function useSitesList(query: ListSitesQuery, enabled = true) {
  return useQuery({
    queryKey: employeeAdminKeys.sites(query),
    queryFn: () => fetchSites(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useSiteAssignmentsList(
  query: ListSiteAssignmentsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: employeeAdminKeys.siteAccess(query),
    queryFn: () => fetchSiteAssignments(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useProvisionSiteEngineer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProvisionSiteEngineerInput) =>
      provisionSiteEngineer(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: employeeAdminKeys.lists() }),
  });
}

export function useUpdateEmployee(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmployeeInput) =>
      updateEmployee(employeeId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: employeeAdminKeys.detail(employeeId),
        }),
        queryClient.invalidateQueries({ queryKey: employeeAdminKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: employeeAdminKeys.access(employeeId),
        }),
      ]);
    },
  });
}

export function useSyncEmployeeModuleAccess(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      denyPermissions: string[];
      catalogPermissions: string[];
    }) => syncEmployeeModuleAccess(employeeId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: employeeAdminKeys.access(employeeId),
      });
    },
  });
}

export function useDeactivateEmployee(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deactivateEmployee(employeeId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: employeeAdminKeys.detail(employeeId),
        }),
        queryClient.invalidateQueries({ queryKey: employeeAdminKeys.lists() }),
      ]);
    },
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSiteInput) => createSite(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...employeeAdminKeys.all, 'sites'],
      }),
  });
}

export function useCreateSiteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSiteAssignmentInput) =>
      createSiteAssignment(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...employeeAdminKeys.all, 'site-access'],
      }),
  });
}

export function useRevokeSiteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => revokeSiteAssignment(assignmentId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...employeeAdminKeys.all, 'site-access'],
      }),
  });
}
