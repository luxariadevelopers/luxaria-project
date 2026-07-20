import { describe, expect, it } from 'vitest';
import type { BoqCapabilities } from './roleAccess';
import {
  BoqItemStatus,
  BoqVersionStatus,
  BoqVersionType,
  type PublicBoqItem,
  type PublicBoqVersion,
} from './types';
import {
  resolveBoqItemActions,
  resolveBoqVersionActions,
} from './workflowActions';

const manageCaps: BoqCapabilities = {
  canView: true,
  canManage: true,
  canApprove: true,
};

function item(partial: Partial<PublicBoqItem> = {}): PublicBoqItem {
  return {
    id: 'i1',
    projectId: 'p1',
    versionId: 'v1',
    blockId: 'b1',
    floorId: 'f1',
    workCategoryId: 'c1',
    boqCode: 'BOQ-1',
    description: 'Test',
    unit: 'cubic_metre',
    plannedQuantity: 1,
    materialCost: 0,
    labourCost: 0,
    subcontractCost: 0,
    otherCost: 0,
    plannedRate: 0,
    plannedValue: 0,
    startDate: null,
    endDate: null,
    materialCoefficients: [],
    status: BoqItemStatus.Draft,
    notes: null,
    ...partial,
  };
}

function version(
  partial: Partial<PublicBoqVersion> = {},
): PublicBoqVersion {
  return {
    id: 'v1',
    projectId: 'p1',
    versionNumber: 1,
    versionType: BoqVersionType.Revision,
    effectiveDate: '2026-01-01',
    reason: 'r',
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

describe('BOQ workflow actions', () => {
  it('allows edit on draft items when version is editable', () => {
    expect(
      resolveBoqItemActions(
        item(),
        manageCaps,
        version({ status: BoqVersionStatus.Draft }),
      ),
    ).toContain('edit');
  });

  it('blocks edit when version is active/immutable', () => {
    expect(
      resolveBoqItemActions(
        item(),
        manageCaps,
        version({ status: BoqVersionStatus.Active }),
      ),
    ).toEqual([]);
  });

  it('gates version submit / activate / approve', () => {
    const draft = resolveBoqVersionActions(
      version({ status: BoqVersionStatus.Draft }),
      manageCaps,
    );
    expect(draft).toEqual(
      expect.arrayContaining(['submit', 'activate', 'compare']),
    );

    const variation = resolveBoqVersionActions(
      version({
        versionType: BoqVersionType.Variation,
        status: BoqVersionStatus.Draft,
      }),
      manageCaps,
    );
    expect(variation).toContain('submit');
    expect(variation).not.toContain('activate');

    const pending = resolveBoqVersionActions(
      version({ status: BoqVersionStatus.PendingApproval }),
      manageCaps,
    );
    expect(pending).toEqual(
      expect.arrayContaining(['approve', 'reject', 'compare']),
    );
  });
});
