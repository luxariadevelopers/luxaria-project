import { expect, test } from '@playwright/test';
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

test.describe('Golden path: petty cash → expense → posting', () => {
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
      e2eEnv.financeApprover.identifier,
      e2eEnv.financeApprover.password,
    );

    await adminApi.runPettyCashGoldenPath(
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

    test('admin opens petty cash requests for the seeded project', async ({
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

      await page.goto('/accounting/petty-cash/requests');
      await expect(page.getByTestId('petty-cash-requests-page')).toBeVisible();
    });

    test('admin opens the petty cash request create form', async ({ page }) => {
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

      await page.goto('/accounting/petty-cash/requests/new');
      await expect(page.getByTestId('petty-cash-request-create-page')).toBeVisible();
    });
  });

  test('UI: end-to-end petty cash journey', async () => {
    test.skip(
      true,
      'Full petty-cash→expense→posting UI needs PM/finance handoffs across multiple pages; API-assisted journey covers the workflow. Create-form smoke validates admin UI.',
    );
  });
});
