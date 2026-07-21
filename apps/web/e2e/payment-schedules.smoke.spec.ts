import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.describe('Payment schedules page smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(async () => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(!state?.projectId, 'Seeded project missing from runtime state');
  });

  test('admin opens payment schedules for the seeded project', async ({
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

    await page.goto('/sales/payment-schedules');
    await expect(
      page.getByRole('heading', { name: 'Payment schedules', level: 4 }),
    ).toBeVisible();
    await expect(page.getByTestId('payment-schedule-filters')).toBeVisible();
  });
});
