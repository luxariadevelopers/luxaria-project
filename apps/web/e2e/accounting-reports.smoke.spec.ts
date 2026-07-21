import { expect, test } from '@playwright/test';
import { e2eEnv, isLiveApi } from './fixtures/test-env';
import { readRuntimeState } from './fixtures/seed-data';

test.describe('Accounting reports hub smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(async () => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(!state?.liveApi, 'Requires seeded live API runtime state');
  });

  test('admin opens the accounting reports hub', async ({ page }) => {
    await page.goto('/reports/accounting');
    await expect(page.getByTestId('accounting-reports-page')).toBeVisible();
    await expect(page.getByLabel(/^report$/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Cash Book' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Bank Book' })).toBeVisible();
  });
});
