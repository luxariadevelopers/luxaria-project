import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userAdminKeys } from '@/user-admin/queryKeys';
import {
  activateRole,
  cloneRole,
  createRole,
  deactivateRole,
  fetchEffectiveUserAccess,
  fetchPermissionCatalog,
  fetchRole,
  fetchRoles,
  replaceRolePermissions,
  replaceUserRolesFromRbac,
  updateRole,
} from './api';
import { rbacAdminKeys } from './queryKeys';
import type {
  CloneRoleInput,
  CreateRoleInput,
  ListRolesQuery,
  UpdateRoleInput,
} from './types';

export function usePermissionCatalog(enabled = true) {
  return useQuery({
    queryKey: rbacAdminKeys.permissions(),
    queryFn: fetchPermissionCatalog,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useEffectiveUserAccess(enabled = true) {
  return useQuery({
    queryKey: rbacAdminKeys.effectiveAccess(),
    queryFn: fetchEffectiveUserAccess,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useRolesList(query: ListRolesQuery, enabled = true) {
  return useQuery({
    queryKey: rbacAdminKeys.roleList(query),
    queryFn: () => fetchRoles(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useRoleDetail(
  roleId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: rbacAdminKeys.roleDetail(roleId ?? ''),
    queryFn: () => fetchRole(roleId!),
    enabled: Boolean(roleId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => createRole(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: rbacAdminKeys.roles() }),
  });
}

function useRoleInvalidation(roleId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: rbacAdminKeys.roleDetail(roleId),
      }),
      queryClient.invalidateQueries({ queryKey: rbacAdminKeys.roles() }),
      queryClient.invalidateQueries({
        queryKey: rbacAdminKeys.effectiveAccess(),
      }),
      queryClient.invalidateQueries({
        queryKey: ['auth', 'permissions'],
      }),
    ]);
  };
}

export function useUpdateRole(roleId: string) {
  const invalidate = useRoleInvalidation(roleId);
  return useMutation({
    mutationFn: (input: UpdateRoleInput) => updateRole(roleId, input),
    onSuccess: invalidate,
  });
}

export function useReplaceRolePermissions(roleId: string) {
  const invalidate = useRoleInvalidation(roleId);
  return useMutation({
    mutationFn: (permissions: string[]) =>
      replaceRolePermissions(roleId, permissions),
    onSuccess: invalidate,
  });
}

export function useCloneRole(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CloneRoleInput) => cloneRole(roleId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: rbacAdminKeys.roles() }),
  });
}

export function useActivateRole(roleId: string) {
  const invalidate = useRoleInvalidation(roleId);
  return useMutation({
    mutationFn: () => activateRole(roleId),
    onSuccess: invalidate,
  });
}

export function useDeactivateRole(roleId: string) {
  const invalidate = useRoleInvalidation(roleId);
  return useMutation({
    mutationFn: () => deactivateRole(roleId),
    onSuccess: invalidate,
  });
}

export function useReplaceUserRolesFromRbac() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      roleIds,
    }: {
      userId: string;
      roleIds: string[];
    }) => replaceUserRolesFromRbac(userId, roleIds),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: userAdminKeys.detail(variables.userId),
        }),
        queryClient.invalidateQueries({ queryKey: userAdminKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: ['auth', 'permissions'],
        }),
        queryClient.invalidateQueries({
          queryKey: rbacAdminKeys.effectiveAccess(),
        }),
      ]);
    },
  });
}
