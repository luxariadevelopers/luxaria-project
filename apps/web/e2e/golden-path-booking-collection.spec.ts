import { test } from './fixtures';

const missingUiReason =
  'Web UI routes for bookings and customer collections are not shipped yet.';
const missingActorsReason =
  'Phase 137 seeds only admin and limited users; payment-schedule approval requires distinct sales and finance approvers.';

test.describe('Golden path: booking → collection', () => {
  test('API-assisted journey', async () => {
    test.skip(true, missingActorsReason);
  });

  test('UI: open booking register', async () => {
    test.skip(true, missingUiReason);
  });
});
