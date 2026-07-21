import { test as setup } from '@playwright/test';
import {
  createAdminStorageState,
  createFinanceApproverStorageState,
  createFinanceManagerStorageState,
  createLimitedStorageState,
  createPurchaseApproverStorageState,
  createSalesApproverStorageState,
} from './fixtures/auth';
import { isLiveApi } from './fixtures/test-env';

setup.describe.configure({ mode: 'serial' });

setup('seed auth storage: admin', async ({ page }) => {
  setup.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  await createAdminStorageState(page);
});

setup('seed auth storage: limited user', async ({ page }) => {
  setup.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  await createLimitedStorageState(page);
});

setup('seed auth storage: sales approver', async ({ page }) => {
  setup.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  await createSalesApproverStorageState(page);
});

setup('seed auth storage: finance approver', async ({ page }) => {
  setup.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  await createFinanceApproverStorageState(page);
});

setup('seed auth storage: purchase approver', async ({ page }) => {
  setup.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  await createPurchaseApproverStorageState(page);
});

setup('seed auth storage: finance manager', async ({ page }) => {
  setup.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');
  await createFinanceManagerStorageState(page);
});
