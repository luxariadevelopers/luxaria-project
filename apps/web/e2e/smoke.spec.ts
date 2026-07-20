import { expect, test } from '@playwright/test';

/**
 * Unauthenticated shell smoke — runs without a live backend.
 */
test.describe('Luxaria web shell', () => {
  test('loads the application shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('shows login affordance or routed content', async ({ page }) => {
    await page.goto('/');
    const loginButton = page.getByRole('button', { name: /sign in/i });
    const emailField = page.getByLabel(/email or mobile/i);
    const heading = page.getByRole('heading').first();

    const hasLogin =
      (await loginButton.count()) > 0 || (await emailField.count()) > 0;
    if (hasLogin) {
      await expect(loginButton.or(emailField).first()).toBeVisible();
    } else {
      await expect(heading).toBeVisible();
    }
  });
});
