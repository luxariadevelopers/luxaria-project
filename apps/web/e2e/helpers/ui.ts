import type { Browser, BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';
import type { E2eRuntimeState } from '../fixtures/test-env';
import { selectSeededProject } from './project';

/** 1×1 PNG used for signature / evidence uploads in e2e. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export async function openProjectScopedPage(
  page: Page,
  state: Pick<E2eRuntimeState, 'projectCode' | 'projectName'>,
  path: string,
): Promise<void> {
  const dashboard = new DashboardPage(page);
  await dashboard.open();
  await selectSeededProject(page, state);
  await page.goto(path);
}

export async function selectMuiOption(
  page: Page,
  label: string | RegExp,
  option: string | RegExp,
): Promise<void> {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option }).click();
}

export async function fillAutocompleteOption(
  page: Page,
  label: string | RegExp,
  search: string,
  option?: string | RegExp,
): Promise<void> {
  const field = page.getByLabel(label);
  await field.click();
  await field.fill(search);
  await page
    .getByRole('option', { name: option ?? new RegExp(search, 'i') })
    .first()
    .click();
}

export async function runRowAction(
  page: Page,
  rowText: string | RegExp,
  actionLabel: string | RegExp,
): Promise<void> {
  const row = page.getByRole('row').filter({ hasText: rowText }).first();
  await row.getByLabel('Row actions').click();
  await page.getByRole('menuitem', { name: actionLabel }).click();
}

export async function confirmDialog(
  page: Page,
  confirmLabel: string | RegExp = /confirm|approve|post/i,
): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: confirmLabel }).click();
}

export async function withStorageState(
  browser: Browser,
  storageStatePath: string,
  run: (page: Page, context: BrowserContext) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();
  try {
    await run(page, context);
  } finally {
    await context.close();
  }
}
