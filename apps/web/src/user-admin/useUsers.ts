import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PROJECT_ACCESS_ME_QUERY_KEY,
  PROJECTS_SELECTOR_QUERY_KEY,
} from '@luxaria/shared-types';
import {
  activateUser,
  assignUserProjects,
  createUser,
  deactivateUser,
  fetchUser,
  fetchUsers,
  removeUserProjects,
  replaceUserRoles,
  resetUserPassword,
  updateUser,
} from './api';
import { userAdminKeys } from './queryKeys';
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from './types';

export function useUsersList(query: ListUsersQuery, enabled = true) {
  return useQuery({
    queryKey: userAdminKeys.list(query),
    queryFn: () => fetchUsers(query),
    enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useUserDetail(
  userId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: userAdminKeys.detail(userId ?? ''),
    queryFn: () => fetchUser(userId!),
    enabled: Boolean(userId) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: userAdminKeys.lists() }),
  });
}

function useUserInvalidation(userId: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: userAdminKeys.detail(userId),
      }),
      queryClient.invalidateQueries({ queryKey: userAdminKeys.lists() }),
    ]);
  };
}

export function useUpdateUser(userId: string) {
  const invalidate = useUserInvalidation(userId);
  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateUser(userId, input),
    onSuccess: invalidate,
  });
}

export function useActivateUser(userId: string) {
  const invalidate = useUserInvalidation(userId);
  return useMutation({
    mutationFn: () => activateUser(userId),
    onSuccess: invalidate,
  });
}

export function useDeactivateUser(userId: string) {
  const invalidate = useUserInvalidation(userId);
  return useMutation({
    mutationFn: () => deactivateUser(userId),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword(userId: string) {
  return useMutation({
    mutationFn: (newPassword: string) =>
      resetUserPassword(userId, newPassword),
  });
}

export function useReplaceUserRoles(userId: string) {
  const queryClient = useQueryClient();
  const invalidate = useUserInvalidation(userId);
  return useMutation({
    mutationFn: (roleIds: string[]) => replaceUserRoles(userId, roleIds),
    onSuccess: async () => {
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: ['auth', 'permissions'],
      });
    },
  });
}

function useProjectAssignmentInvalidation(userId: string) {
  const queryClient = useQueryClient();
  const invalidate = useUserInvalidation(userId);
  return async () => {
    await invalidate();
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: PROJECT_ACCESS_ME_QUERY_KEY,
      }),
      queryClient.invalidateQueries({
        queryKey: PROJECTS_SELECTOR_QUERY_KEY,
      }),
    ]);
  };
}

export function useAssignUserProjects(userId: string) {
  const invalidate = useProjectAssignmentInvalidation(userId);
  return useMutation({
    mutationFn: (projectIds: string[]) =>
      assignUserProjects(userId, projectIds),
    onSuccess: invalidate,
  });
}

export function useRemoveUserProjects(userId: string) {
  const invalidate = useProjectAssignmentInvalidation(userId);
  return useMutation({
    mutationFn: (projectIds: string[]) =>
      removeUserProjects(userId, projectIds),
    onSuccess: invalidate,
  });
}
