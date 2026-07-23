import { expect, test } from '@playwright/test';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

/**
 * Pragmatic IAM smoke: admin can open Employees and walk the Site Engineer
 * provision wizard. Full project+site selection is attempted when options exist;
 * otherwise the UI path through the wizard is still validated.
 */
test.describe('IAM Site Engineer provision smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(() => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  });

  test('admin opens employees create wizard UI path', async ({ page }) => {
    await page.goto('/administration/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible();

    await page.getByRole('link', { name: /create employee/i }).click();
    await expect(page.getByTestId('employee-create-page')).toBeVisible();

    const unique = Date.now();
    const email = `e2e-site-eng-${unique}@luxaria.test`;

    await page.getByLabel(/^first name$/i).fill('E2E');
    await page.getByLabel(/^last name$/i).fill('SiteEngineer');
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByRole('button', { name: /^next$/i }).click();

    // Org step — Engineering / Site Engineer defaults may already be selected.
    await page.getByRole('button', { name: /^next$/i }).click();

    await page.getByLabel(/^password$/i).fill('E2eSiteEng123!');
    await page.getByLabel(/^confirm password$/i).fill('E2eSiteEng123!');
    await page.getByRole('button', { name: /^next$/i }).click();

    // Optional permission denies
    await page.getByRole('button', { name: /^next$/i }).click();

    // Project + site step should render even when options are empty.
    await expect(page.getByLabel(/^project$/i)).toBeVisible();
    await expect(page.getByLabel(/^site$/i)).toBeVisible();

    await page.getByLabel(/^project$/i).click();
    const projectOptions = page.getByRole('option');
    const projectCount = await projectOptions.count();
    if (projectCount === 0) {
      await page.keyboard.press('Escape');
      // Wizard path exists; fuller matrix needs seeded project/site fixtures.
      await expect(page.getByTestId('employee-create-page')).toBeVisible();
      return;
    }
    await projectOptions.first().click();

    const siteSelect = page.getByLabel(/^site$/i);
    await expect(siteSelect).toBeEnabled({ timeout: 15_000 });
    await siteSelect.click();
    const siteOptions = page.getByRole('option');
    const siteCount = await siteOptions.count();
    if (siteCount === 0) {
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('employee-create-page')).toBeVisible();
      return;
    }
    await siteOptions.first().click();

    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByTestId('employee-create-submit')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /create employee/i }),
    ).toBeVisible();
  });
});
