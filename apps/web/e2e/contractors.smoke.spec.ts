import { expect, test } from '@playwright/test';
import { e2eEnv, isLiveApi } from './fixtures/test-env';
import { readRuntimeState } from './fixtures/seed-data';

const missingContractorDetailRouteReason =
  'Contractor master has list/create/edit drawers only; no /contractors/:contractorId detail route is registered yet.';

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

  test('contractor detail route is not registered yet', async () => {
    test.skip(true, missingContractorDetailRouteReason);
  });
});
