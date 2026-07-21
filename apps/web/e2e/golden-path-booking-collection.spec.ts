import { expect, test } from '@playwright/test';
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

test.describe('Golden path: booking → collection', () => {
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
    const salesApi = await createAuthenticatedApi(
      request,
      e2eEnv.salesApprover.identifier,
      e2eEnv.salesApprover.password,
    );
    const financeApi = await createAuthenticatedApi(
      request,
      e2eEnv.financeApprover.identifier,
      e2eEnv.financeApprover.password,
    );

    await adminApi.runBookingCollectionGoldenPath(
      { salesApi, financeApi },
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

    test('admin opens the booking register for the seeded project', async ({
      page,
    }) => {
      const state = await readRuntimeState();
      test.skip(!state?.projectId || !state.projectCode || !state.projectName);

      await page.goto('/dashboard');
      await page.getByRole('heading', { name: 'Dashboard' }).waitFor();

      const projectSelector = page.getByLabel(/^project$/i);
      await projectSelector.click();
      await page
        .getByRole('option', {
          name: new RegExp(
            `${state.projectCode} — ${state.projectName}`.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            ),
          ),
        })
        .click();

      await page.goto('/sales/bookings');
      await expect(page.getByTestId('booking-status-filter')).toBeVisible();
      await expect(
        page.getByText(/Unit bookings for the selected project/i),
      ).toBeVisible();
    });

    test('admin opens the collections register for the seeded project', async ({
      page,
    }) => {
      const state = await readRuntimeState();
      test.skip(!state?.projectId || !state.projectCode || !state.projectName);

      await page.goto('/dashboard');
      await page.getByRole('heading', { name: 'Dashboard' }).waitFor();

      const projectSelector = page.getByLabel(/^project$/i);
      await projectSelector.click();
      await page
        .getByRole('option', {
          name: new RegExp(
            `${state.projectCode} — ${state.projectName}`.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            ),
          ),
        })
        .click();

      await page.goto('/sales/collections');
      await expect(
        page.getByRole('heading', { name: 'Collections', level: 4 }),
      ).toBeVisible();
      await expect(
        page.getByText(/Customer receipts/i).first(),
      ).toBeVisible();
    });
  });

  test.describe('UI booking journey', () => {
    test.use({ storageState: e2eEnv.paths.adminAuth });

    test('admin creates booking and transitions to booked via UI', async ({
      page,
      request,
    }) => {
      test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

      const state = await readRuntimeState();
      test.skip(state?.seedFailed, state?.seedError ?? 'E2E seed failed');
      test.skip(
        !state?.projectId ||
          !state.projectCode ||
          !state.projectName ||
          !state.master?.customerId,
        'Seeded project or master data missing',
      );

      const adminApi = await createAuthenticatedApi(
        request,
        e2eEnv.admin.identifier,
        e2eEnv.admin.password,
      );
      const suffix = uniqueRunSuffix();
      const unit = await adminApi.createUnit(state.projectId, suffix);

      await page.goto('/dashboard');
      await page.getByRole('heading', { name: 'Dashboard' }).waitFor();

      const projectSelector = page.getByLabel(/^project$/i);
      await projectSelector.click();
      await page
        .getByRole('option', {
          name: new RegExp(
            `${state.projectCode} — ${state.projectName}`.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            ),
          ),
        })
        .click();

      await page.goto(
        `/sales/bookings/new?customerId=${state.master.customerId}&unitId=${unit.id}`,
      );
      await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible();

      await page.getByLabel('Booking amount (token)').fill('200000');
      await page.getByLabel('Agreed price').fill('8000000');
      await page.getByRole('button', { name: 'Create booking' }).click();

      await expect(page.getByTestId('booking-status-chip')).toBeVisible();
      await expect(page.getByTestId('booking-status-chip')).toContainText(
        /hold/i,
      );

      await page.getByRole('button', { name: 'Mark reserved' }).click();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByTestId('booking-status-chip')).toContainText(
        /reserved/i,
      );

      await page.getByRole('button', { name: 'Mark booked' }).click();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByTestId('booking-status-chip')).toContainText(
        /booked/i,
      );
    });
  });
});
