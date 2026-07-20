import { describe, expect, it } from 'vitest';
import {
  pickPrimaryDrillDown,
  resolveDrillDownLinks,
} from './drillDownLinks';

describe('drillDownLinks', () => {
  it('maps general ledger drill-down to journals route', () => {
    const resolved = resolveDrillDownLinks([
      {
        label: 'General ledger',
        href: '/api/v1/accounting-reports/general-ledger?accountId=a1&projectId=p1',
      },
    ]);
    expect(resolved[0]?.to).toContain('/accounting/journals');
  });

  it('prefers general ledger link for category drill-down', () => {
    const primary = pickPrimaryDrillDown([
      {
        label: 'Purchase orders',
        href: '/api/v1/purchase-orders?projectId=p1',
      },
      {
        label: 'General ledger',
        href: '/api/v1/accounting-reports/general-ledger?accountId=a1',
      },
    ]);
    expect(primary?.label).toBe('General ledger');
  });
});
