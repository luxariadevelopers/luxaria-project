import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.describe('Manpower plans page smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(async () => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(!state?.projectId, 'Seeded project missing from runtime state');
  });

  test('admin opens manpower plans for the seeded project', async ({
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

    await page.goto('/contractors/manpower-plans');
    await expect(page.getByTestId('manpower-plans-page')).toBeVisible();
    await expect(
      page.getByText(/Plan daily contractor headcount and skill mix/i),
    ).toBeVisible();
  });
});
