import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.describe('Booking create page smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(async () => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(!state?.projectId, 'Seeded project missing from runtime state');
  });

  test('admin opens the booking create form for the seeded project', async ({
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

    await page.goto('/sales/bookings/new');
    await expect(
      page.getByRole('heading', { name: 'New booking', level: 5 }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create booking' }),
    ).toBeVisible();
  });
});
