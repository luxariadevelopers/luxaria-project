import { expect, test } from '@playwright/test';
import { e2eEnv, isLiveApi } from './fixtures/test-env';
import { readRuntimeState } from './fixtures/seed-data';

test.describe('Director digest page smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(async () => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(!state?.liveApi, 'Requires seeded live API runtime state');
  });

  test('admin opens the director digest page', async ({ page }) => {
    await page.goto('/administration/director-digest');
    await expect(page.getByTestId('director-digest-page')).toBeVisible();
    await expect(
      page.getByText(/Preview and send the daily director digest/i),
    ).toBeVisible();
  });
});
