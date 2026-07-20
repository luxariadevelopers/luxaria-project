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
