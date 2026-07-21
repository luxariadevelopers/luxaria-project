import { expect, test } from '@playwright/test';
import { e2eEnv, isLiveApi } from './fixtures/test-env';
import { readRuntimeState } from './fixtures/seed-data';

test.describe('Contractors page smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(async () => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(!state?.liveApi, 'Requires seeded live API runtime state');
  });

  test('admin opens the contractors register', async ({ page }) => {
    await page.goto('/contractors');
    await expect(page.getByTestId('contractor-filters')).toBeVisible();
    await expect(
      page.getByText(/Contractor master — search, verification, activation/i),
    ).toBeVisible();
  });

  test('admin can open a contractor detail when a row exists', async ({
    page,
  }) => {
    await page.goto('/contractors');
    await expect(page.getByTestId('contractor-filters')).toBeVisible();

    const firstRow = page.getByRole('row').nth(1);
    const hasRow = await firstRow.isVisible().catch(() => false);
    test.skip(!hasRow, 'No contractor rows in seeded environment');

    await firstRow.click();
    await expect(page).toHaveURL(/\/contractors\/[a-f0-9]{24}/i, {
      timeout: 15_000,
    });
  });
});
