import { expect, test } from '@playwright/test';

/**
 * Web end-to-end smoke: app boots and exposes the login shell.
 * Expand with authenticated flows once local seed credentials are available in CI.
 */
test.describe('Luxaria web smoke', () => {
  test('loads the application shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Login or app chrome should render some text content
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('shows a login affordance or routed content', async ({ page }) => {
    await page.goto('/');
    const loginLike = page.getByRole('button', { name: /login|sign in/i });
    const emailField = page.getByLabel(/email|mobile|identifier/i);
    const heading = page.getByRole('heading').first();

    const hasLogin =
      (await loginLike.count()) > 0 || (await emailField.count()) > 0;
    if (hasLogin) {
      await expect(loginLike.or(emailField).first()).toBeVisible();
    } else {
      await expect(heading).toBeVisible();
    }
  });
});
