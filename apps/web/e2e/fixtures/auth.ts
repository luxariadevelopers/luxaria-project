import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { e2eEnv, type E2eActorEnv } from './test-env';

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

async function createActorStorageState(
  page: Page,
  actor: E2eActorEnv,
  targetPath: string,
): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await loginViaUi(page, actor.identifier, actor.password);
  await saveStorageState(page, targetPath);
}

export async function createAdminStorageState(page: Page): Promise<void> {
  await loginViaUi(page, e2eEnv.admin.identifier, e2eEnv.admin.password);
  await saveStorageState(page, e2eEnv.paths.adminAuth);
}

export async function createLimitedStorageState(page: Page): Promise<void> {
  await createActorStorageState(
    page,
    e2eEnv.limited,
    e2eEnv.paths.limitedAuth,
  );
}

export async function createSalesApproverStorageState(
  page: Page,
): Promise<void> {
  await createActorStorageState(
    page,
    e2eEnv.salesApprover,
    e2eEnv.paths.salesApproverAuth,
  );
}

export async function createFinanceApproverStorageState(
  page: Page,
): Promise<void> {
  await createActorStorageState(
    page,
    e2eEnv.financeApprover,
    e2eEnv.paths.financeApproverAuth,
  );
}

export async function createPurchaseApproverStorageState(
  page: Page,
): Promise<void> {
  await createActorStorageState(
    page,
    e2eEnv.purchaseApprover,
    e2eEnv.paths.purchaseApproverAuth,
  );
}

export async function createFinanceManagerStorageState(
  page: Page,
): Promise<void> {
  await createActorStorageState(
    page,
    e2eEnv.financeManager,
    e2eEnv.paths.financeManagerAuth,
  );
}
