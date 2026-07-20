import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { LoginPage } from './pages/login.page';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login smoke', () => {
  test.beforeEach(() => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  });

  test('admin can sign in and reach the dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await loginPage.open();
    await loginPage.signIn(
      e2eEnv.admin.identifier,
      e2eEnv.admin.password,
    );

    await dashboard.heading.waitFor({ state: 'visible' });
    await dashboard.expectWelcome(e2eEnv.admin.fullName);
    await expect(page).toHaveURL(/\/($|\?)/);
  });
});
