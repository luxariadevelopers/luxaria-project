import type { ListUsersQuery } from './types';

export const userAdminKeys = {
  all: ['user-admin'] as const,
  lists: () => [...userAdminKeys.all, 'list'] as const,
  list: (query: ListUsersQuery) =>
    [...userAdminKeys.lists(), query] as const,
  details: () => [...userAdminKeys.all, 'detail'] as const,
  detail: (userId: string) =>
    [...userAdminKeys.details(), userId] as const,
};
