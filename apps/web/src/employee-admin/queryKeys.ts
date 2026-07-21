import type {
  ListEmployeesQuery,
  ListSiteAssignmentsQuery,
  ListSitesQuery,
} from './types';

export const employeeAdminKeys = {
  all: ['employee-admin'] as const,
  lists: () => [...employeeAdminKeys.all, 'list'] as const,
  list: (query: ListEmployeesQuery) =>
    [...employeeAdminKeys.lists(), query] as const,
  details: () => [...employeeAdminKeys.all, 'detail'] as const,
  detail: (employeeId: string) =>
    [...employeeAdminKeys.details(), employeeId] as const,
  access: (employeeId: string) =>
    [...employeeAdminKeys.all, 'access', employeeId] as const,
  departments: () => [...employeeAdminKeys.all, 'departments'] as const,
  designations: () => [...employeeAdminKeys.all, 'designations'] as const,
  sites: (query: ListSitesQuery) =>
    [...employeeAdminKeys.all, 'sites', query] as const,
  siteAccess: (query: ListSiteAssignmentsQuery) =>
    [...employeeAdminKeys.all, 'site-access', query] as const,
};
