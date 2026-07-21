import { test } from '@playwright/test';
import { ForbiddenPage } from './pages/forbidden.page';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.describe('IAM Site Engineer forbidden smoke', () => {
  test.use({ storageState: e2eEnv.paths.limitedAuth });

  test.beforeEach(() => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  });

  test('limited user is forbidden from employees administration', async ({
    page,
  }) => {
    await page.goto('/administration/employees');
    const forbidden = new ForbiddenPage(page);
    await forbidden.expectVisible();
  });
});
