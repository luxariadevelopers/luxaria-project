import { expect, test } from '@playwright/test';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

test.describe('Project lifecycle smoke', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(() => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  });

  test('admin can open project list and create page', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/projects/new');
    await expect(
      page.getByRole('heading', { name: /new project|create project/i }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('project detail lifecycle surfaces are reachable when a project exists', async ({
    page,
  }) => {
    await page.goto('/projects');
    const firstLink = page.locator('a[href*="/projects/"]').first();
    const count = await firstLink.count();
    test.skip(count === 0, 'No projects available in live environment');

    await firstLink.click();
    await page.waitForURL(/\/projects\/[^/]+/);
    const url = page.url();
    const match = url.match(/\/projects\/([^/?#]+)/);
    test.skip(!match, 'Could not resolve project id from URL');
    const projectId = match![1];

    await page.goto(`/projects/${projectId}/settings`);
    await expect(page.getByTestId('project-lifecycle-actions')).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(`/projects/${projectId}/structure`);
    await expect(page.getByTestId('project-structure-page')).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(`/projects/${projectId}/team`);
    await expect(page.getByTestId('project-team-page')).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(`/projects/${projectId}/warehouses`);
    await expect(page.getByTestId('project-warehouses-page')).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(`/projects/${projectId}/financial-settings`);
    await expect(
      page.getByTestId('project-financial-settings-page'),
    ).toBeVisible({ timeout: 30_000 });
  });
});
