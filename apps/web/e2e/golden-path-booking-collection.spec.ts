import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

const missingActorsReason =
  'Phase 137 seeds only admin and limited users; payment-schedule approval requires distinct sales and finance approvers.';
const missingBookingCreateUiReason =
  'Booking create and status-transition UI is not shipped; the register list is available but end-to-end booking → collection cannot run in the browser yet.';

test.describe('Golden path: booking → collection', () => {
  test('API-assisted journey', async () => {
    test.skip(true, missingActorsReason);
  });

  test.describe('UI register smoke', () => {
    test.use({ storageState: e2eEnv.paths.adminAuth });

    test.beforeEach(async () => {
      test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

      const state = await readRuntimeState();
      test.skip(!state?.projectId, 'Seeded project missing from runtime state');
    });

    test('admin opens the booking register for the seeded project', async ({
      page,
    }) => {
      const state = await readRuntimeState();
      test.skip(!state?.projectId || !state.projectCode || !state.projectName);

      const dashboard = new DashboardPage(page);
      await dashboard.open();

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

      const dashboard = new DashboardPage(page);
      await dashboard.open();

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

  test('UI: end-to-end booking → collection journey', async () => {
    test.skip(true, missingBookingCreateUiReason);
  });
});
