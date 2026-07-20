import { describe, expect, it } from 'vitest';
import {
  resolveDrillDownLink,
  resolveDrillDownLinks,
} from './drillDownLinks';

describe('resolveDrillDownLink', () => {
  const allowAll = { hasAnyPermission: () => true };
  const denyAll = { hasAnyPermission: () => false };

  it('maps purchase-requests API href to portal route', () => {
    const resolved = resolveDrillDownLink(
      {
        label: 'Pending PRs',
        href: '/api/v1/purchase-requests?status=pending_approval',
      },
      allowAll,
    );
    expect(resolved).toEqual({
      label: 'Pending PRs',
      to: '/procurement/purchase-requests',
    });
  });

  it('maps daily-progress missing alerts to DPR route', () => {
    const resolved = resolveDrillDownLink(
      {
        label: 'Missing DPR',
        href: '/api/v1/daily-progress-reports/missing-alerts?projectId=abc',
      },
      allowAll,
    );
    expect(resolved?.to).toBe('/project-control/dpr');
  });

  it('returns null when permission missing', () => {
    expect(
      resolveDrillDownLink(
        { label: 'PRs', href: '/api/v1/purchase-requests' },
        denyAll,
      ),
    ).toBeNull();
  });

  it('returns null for unshipped modules (no invented paths)', () => {
    expect(
      resolveDrillDownLink(
        {
          label: 'Bank accounts',
          href: '/api/v1/company-bank-accounts',
        },
        allowAll,
      ),
    ).toBeNull();
  });

  it('dedupes multiple links to the same portal path', () => {
    const links = resolveDrillDownLinks(
      [
        { label: 'A', href: '/api/v1/vendors' },
        { label: 'B', href: '/api/v1/vendor-invoices?matchingStatus=exception' },
      ],
      allowAll,
    );
    expect(links).toHaveLength(1);
    expect(links[0]?.to).toBe('/vendors');
  });
});
