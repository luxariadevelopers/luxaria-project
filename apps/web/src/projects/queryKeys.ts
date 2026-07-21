import type {
  ListProjectAssignmentsQuery,
  ListProjectsQuery,
} from './types';

export const projectKeys = {
  all: ['projects', 'management'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (query: ListProjectsQuery) =>
    [...projectKeys.lists(), query] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  documents: (id: string, page: number, limit: number, category?: string) =>
    [...projectKeys.detail(id), 'documents', { page, limit, category }] as const,
  activity: (id: string) =>
    [...projectKeys.detail(id), 'activity'] as const,
  structure: (id: string) =>
    [...projectKeys.detail(id), 'structure'] as const,
  warehouses: (id: string) =>
    [...projectKeys.detail(id), 'warehouses'] as const,
  team: (id: string) => [...projectKeys.detail(id), 'team'] as const,
  company: (id: string | null) =>
    ['projects', 'lookups', 'company', id ?? 'primary'] as const,
  users: ['projects', 'lookups', 'users'] as const,
  banks: ['projects', 'lookups', 'banks'] as const,
};

export const projectAccessKeys = {
  all: ['project-access', 'assignments'] as const,
  list: (query: ListProjectAssignmentsQuery) =>
    [...projectAccessKeys.all, query] as const,
};
