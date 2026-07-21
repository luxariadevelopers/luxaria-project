import { expect, test } from '@playwright/test';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.describe('Procurement lifecycle smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(() => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  });

  test('admin can open procurement masters, RFQs, and purchase dashboard', async ({
    page,
  }) => {
    await page.goto('/procurement/masters');
    await expect(page.getByTestId('procurement-masters-page')).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/dashboard/purchase');
    await expect(page.getByTestId('procurement-dashboard-page')).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/procurement/rfqs');
    await expect(page.getByTestId('rfq-list-page')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('purchase request create page is reachable', async ({ page }) => {
    await page.goto('/procurement/purchase-requests/new');
    await expect(
      page.getByRole('heading', { name: /purchase request|new purchase/i }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
