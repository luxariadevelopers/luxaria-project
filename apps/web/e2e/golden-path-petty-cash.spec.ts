import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import {
  createAuthenticatedApi,
  toGoldenPathContext,
  uniqueRunSuffix,
} from './fixtures/api-client';
import { readRuntimeState } from './fixtures/seed-data';
import {
  e2eEnv,
  hasGoldenPathActors,
  isLiveApi,
} from './fixtures/test-env';
import { selectSeededProject } from './helpers/project';
import {
  openProjectScopedPage,
  runRowAction,
  selectMuiOption,
  TINY_PNG,
  withStorageState,
} from './helpers/ui';

test.describe('Golden path: petty cash → expense → posting', () => {
  test('API-assisted journey', async ({ request }) => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(state?.seedFailed, state?.seedError ?? 'E2E seed failed');
    test.skip(
      !hasGoldenPathActors(state) || !state.projectId || !state.adminUserId,
      'Golden-path actors or master data missing from runtime state',
    );

    const suffix = uniqueRunSuffix();
    const adminApi = await createAuthenticatedApi(
      request,
      e2eEnv.admin.identifier,
      e2eEnv.admin.password,
    );
    const purchaseApi = await createAuthenticatedApi(
      request,
      e2eEnv.purchaseApprover.identifier,
      e2eEnv.purchaseApprover.password,
    );
    const financeApi = await createAuthenticatedApi(
      request,
      e2eEnv.financeApprover.identifier,
      e2eEnv.financeApprover.password,
    );
    const financeManagerApi = await createAuthenticatedApi(
      request,
      e2eEnv.financeManager.identifier,
      e2eEnv.financeManager.password,
    );

    await adminApi.runPettyCashGoldenPath(
      { purchaseApi, financeApi, financeManagerApi },
      toGoldenPathContext({
        projectId: state.projectId,
        adminUserId: state.adminUserId,
        master: state.master,
      }),
      suffix,
    );
  });

  test.describe('UI register smoke', () => {
    test.use({ storageState: e2eEnv.paths.adminAuth });

    test.beforeEach(async () => {
      test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

      const state = await readRuntimeState();
      test.skip(state?.seedFailed, state?.seedError ?? 'E2E seed failed');
      test.skip(!state?.projectId, 'Seeded project missing from runtime state');
    });

    test('admin opens petty cash requests for the seeded project', async ({
      page,
    }) => {
      const state = await readRuntimeState();
      test.skip(!state?.projectId || !state.projectCode || !state.projectName);

      const dashboard = new DashboardPage(page);
      await dashboard.open();
      await selectSeededProject(page, state);

      await page.goto('/accounting/petty-cash/requests');
      await expect(page.getByTestId('petty-cash-requests-page')).toBeVisible();
    });

    test('admin opens the petty cash request create form', async ({ page }) => {
      const state = await readRuntimeState();
      test.skip(!state?.projectId || !state.projectCode || !state.projectName);

      const dashboard = new DashboardPage(page);
      await dashboard.open();
      await selectSeededProject(page, state);

      await page.goto('/accounting/petty-cash/requests/new');
      await expect(page.getByTestId('petty-cash-request-create-page')).toBeVisible();
    });
  });

  test('UI: end-to-end petty cash journey', async ({ browser, request }) => {
    test.setTimeout(180_000);
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(state?.seedFailed, state?.seedError ?? 'E2E seed failed');
    test.skip(
      !hasGoldenPathActors(state) ||
        !state.projectId ||
        !state.projectCode ||
        !state.projectName ||
        !state.adminUserId ||
        !state.master?.pettyCashLedgerAccountId,
      'Golden-path actors or master data missing from runtime state',
    );

    const suffix = uniqueRunSuffix();
    const justification = `E2E UI petty cash ${suffix}`;
    const purpose = `E2E labour expense ${suffix}`;

    const adminApi = await createAuthenticatedApi(
      request,
      e2eEnv.admin.identifier,
      e2eEnv.admin.password,
    );
    await adminApi.createPettyCashAccount(
      state.projectId,
      state.adminUserId,
      state.master.pettyCashLedgerAccountId,
      `ui-${suffix}`,
    );
    const labour = await adminApi.getExpenseCategoryByCode('LABOUR');

    let requestNumber = '';

    await withStorageState(browser, e2eEnv.paths.adminAuth, async (page) => {
      await openProjectScopedPage(
        page,
        state,
        '/accounting/petty-cash/requests/new',
      );
      await expect(
        page.getByTestId('petty-cash-request-create-page'),
      ).toBeVisible();

      await selectMuiOption(page, 'Petty-cash account', /.+/);
      await page.getByLabel('Week start').fill('2026-07-13');
      await page.getByLabel('Week end').fill('2026-07-19');
      await selectMuiOption(page, 'Category', /transport/i);
      await page
        .getByPlaceholder('What the cash is for')
        .fill('Site jeep hire');
      const amount = page
        .getByTestId('requirement-items-grid')
        .locator('input[type="number"]')
        .first();
      await amount.fill('5000');
      await page.getByLabel('Justification').fill(justification);
      await page.getByRole('button', { name: 'Save & submit' }).click();

      await expect(
        page.getByTestId('petty-cash-request-status-chip'),
      ).toContainText(/submitted/i, { timeout: 30_000 });
      requestNumber = (
        (await page.getByRole('heading').first().textContent()) ?? ''
      ).trim();
      expect(requestNumber.length).toBeGreaterThan(0);
    });

    await withStorageState(
      browser,
      e2eEnv.paths.purchaseApproverAuth,
      async (page) => {
        await openProjectScopedPage(
          page,
          state,
          '/accounting/petty-cash/requests',
        );
        await runRowAction(page, requestNumber, 'PM review');
        const dialog = page.getByTestId('petty-cash-request-action-dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Confirm' }).click();
      },
    );

    await withStorageState(
      browser,
      e2eEnv.paths.financeApproverAuth,
      async (page) => {
        await openProjectScopedPage(
          page,
          state,
          '/accounting/petty-cash/requests',
        );
        await runRowAction(page, requestNumber, 'Finance approve');
        const dialog = page.getByTestId('petty-cash-request-action-dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Confirm' }).click();

        await runRowAction(page, requestNumber, 'Fund');
        const fundDialog = page.getByTestId('petty-cash-request-action-dialog');
        await expect(fundDialog).toBeVisible();
        await fundDialog.getByRole('button', { name: 'Confirm' }).click();
        await expect(
          page.getByRole('row').filter({ hasText: requestNumber }),
        ).toContainText(/funded/i, { timeout: 30_000 });
      },
    );

    await withStorageState(browser, e2eEnv.paths.adminAuth, async (page) => {
      await openProjectScopedPage(page, state, '/accounting/expenses');
      await expect(page.getByTestId('expenses-page')).toBeVisible();
      await page.getByRole('button', { name: 'New expense' }).click();

      await page.getByLabel('Expense date').fill('2026-07-21');
      await selectMuiOption(page, 'Petty cash account', /.+/);
      await selectMuiOption(
        page,
        'Expense category',
        new RegExp(`${labour.categoryCode}|${labour.name}`, 'i'),
      );
      await page.getByLabel('Amount (INR)').fill('1500');
      await selectMuiOption(page, 'Payment mode', /cash/i);
      await page.getByLabel('Paid to').fill('E2E Worker');
      await page.getByLabel('Purpose').fill(purpose);

      await page.locator('input[type="file"]').setInputFiles({
        name: 'signature.png',
        mimeType: 'image/png',
        buffer: TINY_PNG,
      });
      await page.getByRole('button', { name: 'Save expense' }).click();
      await expect(page.getByText(purpose)).toBeVisible({ timeout: 30_000 });
    });

    await withStorageState(
      browser,
      e2eEnv.paths.financeApproverAuth,
      async (page) => {
        await openProjectScopedPage(page, state, '/accounting/expenses');
        await runRowAction(page, purpose, 'Verify');
        await page.getByRole('dialog').getByRole('button', { name: 'Verify' }).click();
        await expect(
          page.getByRole('row').filter({ hasText: purpose }),
        ).toContainText(/verified/i, { timeout: 30_000 });
      },
    );

    await withStorageState(
      browser,
      e2eEnv.paths.financeManagerAuth,
      async (page) => {
        await openProjectScopedPage(page, state, '/accounting/expenses');
        await runRowAction(page, purpose, 'Approve');
        await page
          .getByRole('dialog')
          .getByRole('button', { name: 'Approve' })
          .click();
        await expect(
          page.getByRole('row').filter({ hasText: purpose }),
        ).toContainText(/approved/i, { timeout: 30_000 });
      },
    );

    await withStorageState(
      browser,
      e2eEnv.paths.financeApproverAuth,
      async (page) => {
        await openProjectScopedPage(page, state, '/accounting/expenses');
        await runRowAction(page, purpose, 'Post to accounting');
        await page.getByRole('dialog').getByRole('button', { name: 'Post' }).click();
        await expect(
          page.getByRole('row').filter({ hasText: purpose }),
        ).toContainText(/posted/i, { timeout: 30_000 });
      },
    );
  });
});
