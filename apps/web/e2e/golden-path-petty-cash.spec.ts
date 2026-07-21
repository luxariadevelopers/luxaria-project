import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

const missingActorsReason =
  'Phase 137 seeds only admin and limited users; petty-cash approval and expense posting require distinct actors.';
const missingMultiStepUiReason =
  'Full petty cash → expense → posting browser journey needs PM/finance actors beyond the admin seed.';

test.describe('Golden path: petty cash → expense → posting', () => {
  test('API-assisted journey', async () => {
    test.skip(true, missingActorsReason);
  });

  test.describe('UI register smoke', () => {
    test.use({ storageState: e2eEnv.paths.adminAuth });

    test.beforeEach(async () => {
      test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

      const state = await readRuntimeState();
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
    test.skip(true, missingMultiStepUiReason);
  });
});
