import { test as setup } from '@playwright/test';
import {
  createAdminStorageState,
  createLimitedStorageState,
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
