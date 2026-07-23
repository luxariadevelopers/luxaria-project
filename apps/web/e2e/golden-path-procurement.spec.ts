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
  confirmDialog,
  fillAutocompleteOption,
  openProjectScopedPage,
  runRowAction,
  selectMuiOption,
  withStorageState,
} from './helpers/ui';

test.describe('Golden path: PR → PO → GRN → invoice → payment', () => {
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
      e2eEnv.financeManager.identifier,
      e2eEnv.financeManager.password,
    );

    await adminApi.runProcurementGoldenPath(
      { purchaseApi, financeApi },
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

    test('admin opens the purchase requisition register for the seeded project', async ({
      page,
    }) => {
      const state = await readRuntimeState();
      test.skip(!state?.projectId || !state.projectCode || !state.projectName);

      const dashboard = new DashboardPage(page);
      await dashboard.open();
      await selectSeededProject(page, state);

      await page.goto('/procurement/purchase-requests');
      await page
        .getByRole('heading', { name: 'Purchase requests', level: 5 })
        .waitFor();
    });
  });

  test('UI: end-to-end procurement journey', async ({ browser, request }) => {
    test.setTimeout(240_000);
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const state = await readRuntimeState();
    test.skip(state?.seedFailed, state?.seedError ?? 'E2E seed failed');
    test.skip(
      !hasGoldenPathActors(state) ||
        !state.projectId ||
        !state.projectCode ||
        !state.projectName ||
        !state.master?.materialName ||
        !state.master?.vendorName,
      'Golden-path actors or master labels missing from runtime state',
    );

    const suffix = uniqueRunSuffix();
    const justification = `E2E UI procurement ${suffix}`;
    const invoiceNumber = `E2E-VINV-UI-${suffix}`;
    const utr = `E2E-UTR-UI-${suffix}`;
    let purchaseOrderId = '';

    await withStorageState(browser, e2eEnv.paths.adminAuth, async (page) => {
      await openProjectScopedPage(
        page,
        state,
        '/procurement/purchase-requests/new',
      );
      await expect(
        page.getByTestId('purchase-request-create-page'),
      ).toBeVisible();

      await page.getByLabel('Required by').fill('2026-08-15');
      await fillAutocompleteOption(
        page,
        'Material',
        state.master.materialName,
      );
      const qty = page
        .getByTestId('pr-items-grid')
        .locator('input[type="number"]')
        .first();
      await qty.fill('40');
      await page.getByLabel('Justification').fill(justification);
      await page.getByRole('button', { name: 'Save & submit' }).click();

      await expect(page.getByTestId('purchase-request-status-chip')).toContainText(
        /submitted/i,
      );
      await page.getByRole('button', { name: 'Mark reviewed' }).click();
      await confirmDialog(page, 'Mark reviewed');
      await expect(page.getByTestId('purchase-request-status-chip')).toContainText(
        /reviewed/i,
      );
      await page.getByRole('button', { name: 'Approve' }).click();
      await confirmDialog(page, 'Approve');
      await expect(page.getByTestId('purchase-request-status-chip')).toContainText(
        /approved/i,
      );

      await page.goto('/procurement/quotations');
      await expect(page.getByTestId('quotations-page')).toBeVisible();
      await page.getByRole('button', { name: 'New quotation' }).click();
      await expect(page.getByTestId('quotation-entry-drawer')).toBeVisible();

      await selectMuiOption(
        page,
        'Purchase request',
        /approved|sourcing/i,
      );
      await selectMuiOption(page, 'Vendor', new RegExp(state.master.vendorName, 'i'));
      await page.getByLabel('Quotation date').fill('2026-07-17');
      await page.getByLabel('Validity date').fill('2026-08-15');
      await page.getByLabel('Delivery days').fill('7');
      await page.getByLabel('Payment terms').fill('Net 30');
      await page.getByLabel('Freight').fill('500');
      await page.getByLabel('Header taxes').fill('100');

      const rateInput = page
        .getByTestId('quotation-line-items-editor')
        .locator('input[type="number"]')
        .nth(1);
      await rateInput.fill('380');
      await page.getByRole('button', { name: 'Create draft' }).click();
      await expect(page.getByTestId('quotation-entry-drawer')).toBeHidden({
        timeout: 30_000,
      });

      await runRowAction(page, /draft/i, 'Submit');
      await runRowAction(page, /submitted/i, 'Mark final');
      await runRowAction(page, /final/i, 'Create PO');

      await expect(page.getByTestId('purchase-order-create-page')).toBeVisible({
        timeout: 30_000,
      });
      await page.getByLabel('Order date').fill('2026-07-17');
      await page.getByLabel('Expected delivery').fill('2026-08-01');
      await page.getByRole('button', { name: 'Save & submit' }).click();
      await expect(page).toHaveURL(/\/procurement\/purchase-orders\/[^/]+$/, {
        timeout: 30_000,
      });
      purchaseOrderId =
        page.url().match(/\/procurement\/purchase-orders\/([^/]+)$/)?.[1] ?? '';
      expect(purchaseOrderId).toBeTruthy();
    });

    await withStorageState(
      browser,
      e2eEnv.paths.purchaseApproverAuth,
      async (page) => {
        await openProjectScopedPage(
          page,
          state,
          `/procurement/purchase-orders/${purchaseOrderId}`,
        );
        await page.getByRole('button', { name: 'Approve / issue' }).click();
        await confirmDialog(page, 'Approve');
      },
    );

    await withStorageState(
      browser,
      e2eEnv.paths.financeManagerAuth,
      async (page) => {
        await openProjectScopedPage(
          page,
          state,
          `/procurement/purchase-orders/${purchaseOrderId}`,
        );
        const approveBtn = page.getByRole('button', { name: 'Approve / issue' });
        if (await approveBtn.isVisible().catch(() => false)) {
          await approveBtn.click();
          await confirmDialog(page, 'Approve');
        }
        await expect(page.getByText(/issued/i).first()).toBeVisible({
          timeout: 30_000,
        });
      },
    );

    await withStorageState(browser, e2eEnv.paths.adminAuth, async (page) => {
      await openProjectScopedPage(
        page,
        state,
        `/inventory/grns/new?purchaseOrderId=${purchaseOrderId}`,
      );
      await expect(page.getByTestId('grn-create-page')).toBeVisible();
      await page.getByLabel('Received date').fill('2026-07-18');
      await page.getByTestId('grn-create-submit').click();
      await expect(page.getByTestId('grn-status-chip')).toContainText(
        /submitted/i,
        { timeout: 30_000 },
      );

      await page.getByRole('button', { name: 'Start QC' }).click();
      await expect(page.getByTestId('grn-status-chip')).toContainText(
        /quality/i,
      );
      await page.getByRole('button', { name: /fill remaining as accepted/i }).click();
      await page.getByRole('button', { name: 'Record acceptance' }).click();
      await expect(page.getByTestId('grn-status-chip')).toContainText(
        /accepted/i,
      );
      await page.getByRole('button', { name: 'Post to stock' }).click();
      await confirmDialog(page, 'Post to stock');
      await expect(page.getByTestId('grn-status-chip')).toContainText(
        /posted/i,
      );

      await page.goto('/procurement/vendor-invoices');
      await expect(page.getByTestId('vendor-invoices-page')).toBeVisible();
      await page.getByTestId('vendor-invoice-new').click();
      await expect(page.getByTestId('vendor-invoice-form-drawer')).toBeVisible();
      await selectMuiOption(
        page,
        'Vendor',
        new RegExp(state.master.vendorName, 'i'),
      );
      await selectMuiOption(page, 'Purchase order', /.+/);
      const grnBox = page
        .getByTestId('invoice-grn-selector')
        .getByRole('checkbox')
        .first();
      if (await grnBox.count()) {
        await grnBox.check();
      }
      await page.getByLabel('Vendor invoice number').fill(invoiceNumber);
      await page.getByLabel('Invoice date').fill('2026-07-19');
      await page.getByLabel('Due date').fill('2026-08-15');
      await page.getByLabel('Taxable value').fill('15200');
      await page.getByLabel('Total amount').fill('15200');
      await page.getByRole('button', { name: 'Save draft' }).click();
      await expect(page.getByTestId('vendor-invoice-form-drawer')).toBeHidden({
        timeout: 30_000,
      });

      await runRowAction(page, invoiceNumber, 'Submit');
      await runRowAction(page, invoiceNumber, 'Verify');
      await runRowAction(page, invoiceNumber, 'Three-way match');
      await expect(page.getByTestId('vendor-invoice-match-page')).toBeVisible();
      await page.getByRole('button', { name: 'Run three-way match' }).click();
      await page.getByRole('button', { name: 'Approve' }).click();
      const approveDialog = page.getByRole('dialog');
      await expect(approveDialog).toBeVisible();
      const exceptionField = approveDialog.getByLabel(/exception/i);
      if (await exceptionField.isVisible().catch(() => false)) {
        await exceptionField.fill('E2E tolerance accepted');
        await approveDialog
          .getByRole('button', { name: 'Approve with exception' })
          .click();
      } else {
        await approveDialog.getByRole('button', { name: 'Approve' }).click();
      }
      await page.getByRole('button', { name: 'Post AP journal' }).click();

      await page.goto('/procurement/vendor-payments');
      await expect(page.getByTestId('vendor-payments-page')).toBeVisible();
      await page.getByTestId('vendor-payment-new').click();
      await expect(page.getByTestId('vendor-payment-form-drawer')).toBeVisible();
      await selectMuiOption(
        page,
        'Vendor',
        new RegExp(state.master.vendorName, 'i'),
      );
      await page.getByLabel('Payment date').fill('2026-07-20');
      await selectMuiOption(page, 'Payment mode', /neft/i);
      await selectMuiOption(page, 'Bank account', /.+/);
      await page.getByLabel('Transaction reference (UTR)').fill(utr);
      const alloc = page
        .getByTestId('payment-allocation-editor')
        .getByRole('checkbox')
        .first();
      if (await alloc.count()) {
        await alloc.check();
      }
      await page.getByRole('button', { name: /set amount from allocations/i }).click();
      await page.getByRole('button', { name: 'Save draft' }).click();
      await expect(page.getByTestId('vendor-payment-form-drawer')).toBeHidden({
        timeout: 30_000,
      });
      await runRowAction(page, utr, 'Submit');
    });

    await withStorageState(
      browser,
      e2eEnv.paths.financeManagerAuth,
      async (page) => {
        await openProjectScopedPage(
          page,
          state,
          '/procurement/vendor-payments',
        );
        await runRowAction(page, utr, 'Approve');
      },
    );

    await withStorageState(browser, e2eEnv.paths.adminAuth, async (page) => {
      await openProjectScopedPage(
        page,
        state,
        '/procurement/vendor-payments',
      );
      await runRowAction(page, utr, 'Record bank release');
      await runRowAction(page, utr, 'Verify');
      await runRowAction(page, utr, 'Post journal');
      await expect(
        page.getByTestId('vendor-payment-status-chip').filter({ hasText: /posted/i }),
      ).toBeVisible({ timeout: 30_000 });
    });

    // Keep request fixture referenced so live API health stays wired in CI.
    void request;
  });
});
