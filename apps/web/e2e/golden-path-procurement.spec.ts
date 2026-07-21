import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { readRuntimeState } from './fixtures/seed-data';
import { e2eEnv, isLiveApi } from './fixtures/test-env';

const missingActorsReason =
  'Phase 137 seeds only admin and limited users; the two-step procurement workflow requires distinct eligible approvers.';
const missingMultiStepUiReason =
  'Full PR → PO → GRN → invoice → payment browser journey needs multi-actor approvals and is not covered by single-admin seeds.';

test.describe('Golden path: PR → PO → GRN → invoice → payment', () => {
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

    test('admin opens the purchase requisition register for the seeded project', async ({
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

      await page.goto('/procurement/purchase-requests');
      await expect(
        page.getByRole('heading', { name: 'Purchase requests', level: 5 }),
      ).toBeVisible();
    });
  });

  test('UI: end-to-end procurement journey', async () => {
    test.skip(true, missingMultiStepUiReason);
  });
});
