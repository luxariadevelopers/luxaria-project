import { test } from './fixtures';

const missingUiReason =
  'Web UI routes for petty cash and site expense vouchers are not shipped yet.';
const missingActorsReason =
  'Phase 137 seeds only admin and limited users; petty-cash approval and expense posting require distinct actors.';

test.describe('Golden path: petty cash → expense → posting', () => {
  test('API-assisted journey', async () => {
    test.skip(true, missingActorsReason);
  });

  test('UI: open petty cash requirement form', async () => {
    test.skip(true, missingUiReason);
  });
});
