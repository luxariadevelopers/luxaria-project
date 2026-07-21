import { describe, expect, it } from 'vitest';
import {
  APP_ROUTE_REGISTRY,
  requireRouteById,
  type AppRouteId,
} from '@/navigation/routeRegistry';
import { APP_ROUTE_ELEMENTS } from './routeElements';

const PRODUCTION_WIRING: ReadonlyArray<{
  id: AppRouteId;
  path: string;
  permission: string;
  projectScope: 'none' | 'required';
  visible: boolean;
}> = [
  {
    id: 'approval-detail',
    path: '/approvals/:approvalId',
    permission: 'approval.view',
    projectScope: 'required',
    visible: false,
  },
  {
    id: 'project-create',
    path: '/projects/new',
    permission: 'project.create',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-detail',
    path: '/projects/:projectId',
    permission: 'project.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-edit',
    path: '/projects/:projectId/edit',
    permission: 'project.update',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-access',
    path: '/projects/:projectId/access',
    permission: 'project_access.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-documents',
    path: '/projects/:projectId/documents',
    permission: 'project.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-settings',
    path: '/projects/:projectId/settings',
    permission: 'project.update',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-structure',
    path: '/projects/:projectId/structure',
    permission: 'project.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-team',
    path: '/projects/:projectId/team',
    permission: 'project.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-warehouses',
    path: '/projects/:projectId/warehouses',
    permission: 'project.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'project-financial-settings',
    path: '/projects/:projectId/financial-settings',
    permission: 'project.update',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'company-overview',
    path: '/administration/company',
    permission: 'company.view',
    projectScope: 'none',
    visible: true,
  },
  {
    id: 'company-settings',
    path: '/administration/company/settings',
    permission: 'company.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'user-create',
    path: '/users/new',
    permission: 'user.create',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'user-detail',
    path: '/users/:userId',
    permission: 'user.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'user-edit',
    path: '/users/:userId/edit',
    permission: 'user.update',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'employees',
    path: '/administration/employees',
    permission: 'employee.view',
    projectScope: 'none',
    visible: true,
  },
  {
    id: 'employee-create',
    path: '/administration/employees/new',
    permission: 'employee.create',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'employee-detail',
    path: '/administration/employees/:employeeId',
    permission: 'employee.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'employee-access',
    path: '/administration/employees/:employeeId/access',
    permission: 'employee.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'departments',
    path: '/administration/departments',
    permission: 'department.view',
    projectScope: 'none',
    visible: true,
  },
  {
    id: 'designations',
    path: '/administration/designations',
    permission: 'designation.view',
    projectScope: 'none',
    visible: true,
  },
  {
    id: 'site-access-admin',
    path: '/administration/site-access',
    permission: 'site_access.view',
    projectScope: 'none',
    visible: true,
  },
  {
    id: 'roles',
    path: '/administration/roles',
    permission: 'role.view',
    projectScope: 'none',
    visible: true,
  },
  {
    id: 'role-create',
    path: '/administration/roles/new',
    permission: 'role.create',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'role-detail',
    path: '/administration/roles/:roleId',
    permission: 'role.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'role-edit',
    path: '/administration/roles/:roleId/edit',
    permission: 'role.update',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'financial-years',
    path: '/accounting/financial-years',
    permission: 'financial_year.view',
    projectScope: 'none',
    visible: true,
  },
  {
    id: 'financial-year-create',
    path: '/accounting/financial-years/new',
    permission: 'financial_year.manage',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'financial-year-detail',
    path: '/accounting/financial-years/:financialYearId',
    permission: 'financial_year.view',
    projectScope: 'none',
    visible: false,
  },
  {
    id: 'work-measurements',
    path: '/project-control/work-measurements',
    permission: 'measurement.view',
    projectScope: 'required',
    visible: true,
  },
  {
    id: 'material-coefficients',
    path: '/project-control/material-coefficients',
    permission: 'material_consumption.view',
    projectScope: 'none',
    visible: true,
  },
  {
    id: 'material-variance',
    path: '/project-control/material-variance',
    permission: 'material_consumption.view',
    projectScope: 'required',
    visible: true,
  },
  {
    id: 'cost-forecast',
    path: '/project-control/cost-forecast',
    permission: 'report.view',
    projectScope: 'required',
    visible: true,
  },
  {
    id: 'contractor-agreements',
    path: '/contractors/agreements',
    permission: 'contractor_agreement.view',
    projectScope: 'required',
    visible: true,
  },
  {
    id: 'contractor-agreement-detail',
    path: '/contractors/agreements/:agreementId',
    permission: 'contractor_agreement.view',
    projectScope: 'required',
    visible: false,
  },
  {
    id: 'collections',
    path: '/sales/collections',
    permission: 'collection.view',
    projectScope: 'required',
    visible: true,
  },
];

describe('production API-to-UI route wiring', () => {
  it.each(PRODUCTION_WIRING)(
    'registers $id with its permission and project scope',
    ({ id, path, permission, projectScope, visible }) => {
      const route = requireRouteById(id);

      expect(route.path).toBe(path);
      expect(route.projectScope).toBe(projectScope);
      expect(route.showInNav).toBe(visible);
      expect([...(route.anyOf ?? []), ...(route.allOf ?? [])]).toContain(
        permission,
      );
      expect(APP_ROUTE_ELEMENTS[id]).toBeDefined();
    },
  );

  it('maps every production registry entry to a route element', () => {
    const productionRoutes = APP_ROUTE_REGISTRY.filter(
      (route) => route.id !== 'login' && !route.id.startsWith('dev-'),
    );

    for (const route of productionRoutes) {
      expect(APP_ROUTE_ELEMENTS[route.id as Exclude<AppRouteId, 'login'>]).toBeDefined();
    }
  });
});
