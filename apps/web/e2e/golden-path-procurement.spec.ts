import { test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import {
  createAuthenticatedApi,
  toGoldenPathContext,
  uniqueRunSuffix,
} from './fixtures/api-client';
import { readRuntimeState } from './fixtures/seed-data';
import {
  e2eEnv,
  hasGoldenPathActors,
  isLiveApi,
} from './fixtures/test-env';

test.describe('Golden path: PR → PO → GRN → invoice → payment', () => {
  test('API-assisted journey', async ({ request }) => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(state?.seedFailed, state?.seedError ?? 'E2E seed failed');
    test.skip(
      !hasGoldenPathActors(state) || !state.projectId || !state.adminUserId,
      'Golden-path actors or master data missing from runtime state',
    );

    const suffix = uniqueRunSuffix();
    const adminApi = await createAuthenticatedApi(
      request,
      e2eEnv.admin.identifier,
      e2eEnv.admin.password,
    );
    const purchaseApi = await createAuthenticatedApi(
      request,
      e2eEnv.purchaseApprover.identifier,
      e2eEnv.purchaseApprover.password,
    );
    const financeApi = await createAuthenticatedApi(
      request,
      e2eEnv.financeManager.identifier,
      e2eEnv.financeManager.password,
    );

    await adminApi.runProcurementGoldenPath(
      { purchaseApi, financeApi },
      toGoldenPathContext({
        projectId: state.projectId,
        adminUserId: state.adminUserId,
        master: state.master,
      }),
      suffix,
    );
  });

  test.describe('UI register smoke', () => {
    test.use({ storageState: e2eEnv.paths.adminAuth });

    test.beforeEach(async () => {
      test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

      const state = await readRuntimeState();
      test.skip(state?.seedFailed, state?.seedError ?? 'E2E seed failed');
      test.skip(!state?.projectId, 'Seeded project missing from runtime state');
    });

    test('admin opens the purchase requisition register for the seeded project', async ({
      page,
    }) => {
      const state = await readRuntimeState();
      test.skip(!state?.projectId || !state.projectCode || !state.projectName);

      const dashboard = new DashboardPage(page);
      await dashboard.open();

      const projectSelector = page.getByLabel(/^project$/i);
      await projectSelector.click();
      await page
        .getByRole('option', {
          name: new RegExp(
            `${state.projectCode} — ${state.projectName}`.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            ),
          ),
        })
        .click();

      await page.goto('/procurement/purchase-requests');
      await page
        .getByRole('heading', { name: 'Purchase requests', level: 5 })
        .waitFor();
    });
  });

  test('UI: end-to-end procurement journey', async () => {
    test.skip(
      true,
      'Full PR→PO→GRN→invoice→payment UI needs many screens; API-assisted journey covers the workflow. Register smoke validates admin navigation.',
    );
  });
});
