import { test } from './fixtures';

const missingUiReason =
  'Web UI routes for procurement (PR/PO/GRN/invoice/payment) are not shipped yet.';
const missingActorsReason =
  'Phase 137 seeds only admin and limited users; the two-step procurement workflow requires distinct eligible approvers.';

test.describe('Golden path: PR → PO → GRN → invoice → payment', () => {
  test('API-assisted journey', async () => {
    test.skip(true, missingActorsReason);
  });

  test('UI: navigate purchase requisition list', async () => {
    test.skip(true, missingUiReason);
  });
});
