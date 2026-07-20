import { expect, test } from '@playwright/test';

/**
 * Web end-to-end smoke: app boots and exposes the login / app shell.
 * Expand with authenticated flows once local seed credentials are available in CI.
 */
test.describe('Luxaria web smoke', () => {
  test('loads the application shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('shows login shell branding or routed portal chrome', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByText(/Luxaria/i).first()).toBeVisible();

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

  test('login route stays usable on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.locator('#root')).toBeVisible();
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflowX).toBe(false);
  });
});
