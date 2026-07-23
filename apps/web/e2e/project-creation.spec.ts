import { expect, test, type Page } from '@playwright/test';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

/**
 * Project creation E2E — remediation acceptance criteria:
 * AC-1: Admin creates a project from the register (happy path)
 * AC-2: Required-field validation blocks submit with field errors
 * AC-3: Projects list refreshes and surfaces the new project
 * AC-4: Detail page opens with the created project identity
 * AC-5: Header project selector includes and selects the new project
 * AC-6: Duplicate project code — skipped (server-generated; no client field)
 */
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
  await page.getByRole('option', { name: 'Residential Flat' }).click();
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

  // AC-1, AC-3, AC-4, AC-5
  test('admin creates a project from the register', async ({ page }) => {
    const projectName = uniqueProjectName('Create');

    await openCreateProjectForm(page);
    await fillRequiredProjectFields(page, projectName);

    await page.getByRole('button', { name: 'Create project' }).click();

    // AC-4: detail opens after create
    await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}$/i, {
      timeout: 30_000,
    });
    await expect(
      page.getByText(/Project PRJ-.* created successfully/i),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: projectName, level: 2 }),
    ).toBeVisible();

    // AC-5: header project selector reflects the newly created project
    const projectSelector = page.getByLabel(/^project$/i);
    await expect(projectSelector).toContainText(projectName);

    // AC-3: list register refreshes and shows the new row
    await page.goto('/projects');
    await expect(page.getByTestId('projects-list-page')).toBeVisible();
    await page
      .getByPlaceholder('Search code, name, or description')
      .fill(projectName);
    await expect(page.getByRole('gridcell', { name: projectName })).toBeVisible({
      timeout: 15_000,
    });
  });

  // AC-4 (register navigation path)
  test('admin opens seeded project detail from the register', async ({ page }) => {
    const state = await readRuntimeState();
    test.skip(!state?.projectId || !state.projectName);

    await page.goto('/projects');
    await expect(page.getByTestId('projects-list-page')).toBeVisible();
    await page
      .getByPlaceholder('Search code, name, or description')
      .fill(state.projectName);
    await page.getByRole('gridcell', { name: state.projectName }).click();

    await expect(page).toHaveURL(
      new RegExp(`/projects/${state.projectId}$`, 'i'),
      { timeout: 15_000 },
    );
    await expect(
      page.getByRole('heading', { name: state.projectName, level: 2 }),
    ).toBeVisible();
  });

  // AC-2
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

  // AC-6
  test('duplicate project code is not testable in the UI', async () => {
    test.skip(true, duplicateCodeSkipReason);
  });
});
