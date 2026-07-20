import { describe, expect, it } from 'vitest';
import {
  canDirectActivateVersion,
  countActiveBoqVersions,
  findActiveBoqVersion,
  previewActivationActiveCount,
  requiresApprovalToActivate,
} from './activation';
import {
  BoqVersionStatus,
  BoqVersionType,
  type PublicBoqVersion,
} from './types';

function version(
  partial: Partial<PublicBoqVersion> & Pick<PublicBoqVersion, 'id'>,
): PublicBoqVersion {
  return {
    projectId: 'p1',
    versionNumber: 1,
    versionType: BoqVersionType.Revision,
    effectiveDate: '2026-01-01',
    reason: 'test',
    costImpact: 0,
    timeImpact: 0,
    approvalReference: null,
    status: BoqVersionStatus.Draft,
    basedOnVersionId: null,
    totalPlannedValue: 0,
    submittedBy: null,
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    ...partial,
  };
}

describe('BOQ version activation (Phase 080)', () => {
  it('counts at most one active version in a healthy list', () => {
    const rows = [
      version({ id: 'a', status: BoqVersionStatus.Active, versionNumber: 1 }),
      version({
        id: 'b',
        status: BoqVersionStatus.Superseded,
        versionNumber: 2,
      }),
      version({ id: 'c', status: BoqVersionStatus.Draft, versionNumber: 3 }),
    ];
    expect(countActiveBoqVersions(rows)).toBe(1);
    expect(findActiveBoqVersion(rows)?.id).toBe('a');
  });

  it('requires approval path for Variation (no direct activate)', () => {
    expect(requiresApprovalToActivate(BoqVersionType.Variation)).toBe(true);
    expect(requiresApprovalToActivate(BoqVersionType.Revision)).toBe(false);
    const variation = version({
      id: 'v',
      versionType: BoqVersionType.Variation,
      status: BoqVersionStatus.Draft,
    });
    expect(canDirectActivateVersion(variation)).toBe(false);
  });

  it('allows direct activate for draft revision / change order', () => {
    expect(
      canDirectActivateVersion(
        version({
          id: 'r',
          versionType: BoqVersionType.Revision,
          status: BoqVersionStatus.Draft,
        }),
      ),
    ).toBe(true);
    expect(
      canDirectActivateVersion(
        version({
          id: 'a',
          versionType: BoqVersionType.Revision,
          status: BoqVersionStatus.Active,
        }),
      ),
    ).toBe(false);
  });

  it('previewActivationActiveCount stays at one when superseding', () => {
    const rows = [
      version({ id: 'a', status: BoqVersionStatus.Active }),
      version({ id: 'b', status: BoqVersionStatus.Draft, versionNumber: 2 }),
    ];
    expect(previewActivationActiveCount(rows, 'b')).toBe(1);
  });
});
