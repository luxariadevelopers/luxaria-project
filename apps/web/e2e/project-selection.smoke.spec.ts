import { test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.describe('Project selection smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(() => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  });

  test('admin can select a seeded project in the header', async ({ page }) => {
    const state = await readRuntimeState();
    test.skip(!state?.projectId, 'Seeded project missing from runtime state');

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

    await dashboard.expectActiveProject(
      `${state.projectCode} — ${state.projectName}`,
    );
  });
});
