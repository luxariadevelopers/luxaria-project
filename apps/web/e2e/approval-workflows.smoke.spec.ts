import { expect, test } from '@playwright/test';
import { e2eEnv, isLiveApi } from './fixtures/test-env';
import { readRuntimeState } from './fixtures/seed-data';

test.describe('Approval workflows page smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(async () => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(!state?.liveApi, 'Requires seeded live API runtime state');
  });

  test('admin opens the approval workflows config page', async ({ page }) => {
    await page.goto('/administration/approval-workflows');
    await expect(page.getByTestId('approval-workflows-page')).toBeVisible();
    await expect(page.getByLabel(/^preset$/i)).toBeVisible();
    await expect(page.getByLabel(/^module$/i)).toBeVisible();
  });
});
