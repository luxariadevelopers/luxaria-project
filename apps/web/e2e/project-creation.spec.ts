import { expect, test, type Page } from '@playwright/test';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

const duplicateCodeSkipReason =
  'Project code is server-generated on create; duplicate-code validation is not exposed in the form.';

function uniqueProjectName(suffix: string): string {
  return `E2E Playwright ${suffix} ${Date.now()}`;
}

async function openCreateProjectForm(page: Page) {
  await page.goto('/projects');
  await expect(page.getByTestId('projects-list-page')).toBeVisible();
  await page.getByRole('link', { name: 'New project' }).click();
  await expect(page.getByTestId('project-create-page')).toBeVisible();
  await expect(page.getByTestId('project-form')).toBeVisible();
}

async function fillRequiredProjectFields(page: Page, projectName: string) {
  await page.getByLabel('Project name', { exact: true }).fill(projectName);
  await page.getByLabel('Project type', { exact: true }).click();
  await page.getByRole('option', { name: 'Residential' }).click();
  await page.getByLabel('Address line 1', { exact: true }).fill('42 E2E Test Avenue');
  await page.getByLabel('City', { exact: true }).fill('Chennai');
  await page.getByLabel('State', { exact: true }).fill('Tamil Nadu');
  await page.getByLabel('PIN code', { exact: true }).fill('600001');
  await page.getByLabel('Country', { exact: true }).fill('India');
}

test.describe('Project creation', () => {
  test.use({ storageState: e2eEnv.paths.adminAuth });

  test.beforeEach(async () => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(!state?.liveApi, 'Requires seeded live API runtime state');
  });

  test('admin creates a project from the register', async ({ page }) => {
    const projectName = uniqueProjectName('Create');

    await openCreateProjectForm(page);
    await fillRequiredProjectFields(page, projectName);

    await page.getByRole('button', { name: 'Create project' }).click();

    await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}$/i, {
      timeout: 30_000,
    });
    await expect(
      page.getByText(/Project PRJ-.* created successfully/i),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: projectName, level: 2 }),
    ).toBeVisible();

    await page.goto('/projects');
    await expect(page.getByTestId('projects-list-page')).toBeVisible();
    await page
      .getByPlaceholder('Search code, name, or description')
      .fill(projectName);
    await expect(page.getByRole('gridcell', { name: projectName })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('shows validation errors for required fields', async ({ page }) => {
    await page.goto('/projects/new');
    await expect(page.getByTestId('project-create-page')).toBeVisible();

    await page.getByRole('button', { name: 'Create project' }).click();

    await expect(page.getByText('Project name is required')).toBeVisible();
    await expect(page.getByText('Address line 1 is required')).toBeVisible();
    await expect(page.getByText('City is required')).toBeVisible();
    await expect(page.getByText('State is required')).toBeVisible();
    await expect(page.getByText('Enter a valid 6-digit Indian PIN')).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/new$/);
  });

  test('duplicate project code is not testable in the UI', async () => {
    test.skip(true, duplicateCodeSkipReason);
  });
});
