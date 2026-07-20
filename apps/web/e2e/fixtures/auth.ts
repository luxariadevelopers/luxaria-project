import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { e2eEnv } from './test-env';

export async function loginViaUi(
  page: Page,
  identifier: string,
  password: string,
): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.signIn(identifier, password);
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({
    state: 'visible',
    timeout: 30_000,
  });
}

export async function saveStorageState(
  page: Page,
  targetPath: string,
): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await page.context().storageState({ path: targetPath });
}

export async function createAdminStorageState(page: Page): Promise<void> {
  await loginViaUi(page, e2eEnv.admin.identifier, e2eEnv.admin.password);
  await saveStorageState(page, e2eEnv.paths.adminAuth);
}

export async function createLimitedStorageState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await loginViaUi(
    page,
    e2eEnv.limited.identifier,
    e2eEnv.limited.password,
  );
  await saveStorageState(page, e2eEnv.paths.limitedAuth);
}
