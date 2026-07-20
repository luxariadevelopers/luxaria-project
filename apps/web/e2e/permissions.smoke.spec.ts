import { test } from '@playwright/test';
import { ForbiddenPage } from './pages/forbidden.page';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.describe('Permission denial smoke', () => {
  test.use({ storageState: e2eEnv.paths.limitedAuth });

  test.beforeEach(() => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  });

  test('limited user is redirected to forbidden for protected routes', async ({
    page,
  }) => {
    await page.goto('/users');
    const forbidden = new ForbiddenPage(page);
    await forbidden.expectVisible();
  });
});
