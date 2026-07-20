import { describe, expect, it } from 'vitest';
import { buildSideBySideRows, hasComparisonImpact } from './comparison';
import {
  BoqVersionStatus,
  BoqVersionType,
  type BoqVersionComparison,
  type PublicBoqVersion,
} from './types';

function version(
  id: string,
  versionNumber: number,
): PublicBoqVersion {
  return {
    id,
    projectId: 'p1',
    versionNumber,
    versionType: BoqVersionType.Revision,
    effectiveDate: '2026-01-01',
    reason: 'test',
    costImpact: 0,
    timeImpact: 0,
    approvalReference: null,
    status: BoqVersionStatus.Active,
    basedOnVersionId: null,
    totalPlannedValue: 0,
    submittedBy: null,
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  };
}

describe('BOQ version comparison (Phase 080)', () => {
  const comparison: BoqVersionComparison = {
    fromVersion: version('from', 1),
    toVersion: version('to', 2),
    summary: {
      addedCount: 1,
      removedCount: 1,
      changedCount: 1,
      unchangedCount: 0,
      fromTotalPlannedValue: 1000,
      toTotalPlannedValue: 1500,
      costImpact: 500,
    },
    added: [
      {
        boqCode: 'BOQ-B',
        description: 'Added',
        plannedQuantity: 1,
        plannedRate: 500,
        plannedValue: 500,
      },
    ],
    removed: [
      {
        boqCode: 'BOQ-A',
        description: 'Removed',
        plannedQuantity: 1,
        plannedRate: 200,
        plannedValue: 200,
      },
    ],
    changed: [
      {
        boqCode: 'BOQ-C',
        description: 'Changed',
        from: {
          plannedQuantity: 1,
          plannedRate: 800,
          plannedValue: 800,
          materialCost: 800,
          labourCost: 0,
          subcontractCost: 0,
          otherCost: 0,
        },
        to: {
          plannedQuantity: 2,
          plannedRate: 600,
          plannedValue: 1200,
          materialCost: 600,
          labourCost: 0,
          subcontractCost: 0,
          otherCost: 0,
        },
        deltas: {
          plannedQuantity: 1,
          materialCost: -200,
          labourCost: 0,
          subcontractCost: 0,
          otherCost: 0,
          plannedRate: -200,
          plannedValue: 400,
        },
      },
    ],
  };

  it('builds sorted side-by-side rows for added/removed/changed', () => {
    const rows = buildSideBySideRows(comparison);
    expect(rows.map((r) => r.boqCode)).toEqual(['BOQ-A', 'BOQ-B', 'BOQ-C']);
    expect(rows.find((r) => r.boqCode === 'BOQ-A')?.kind).toBe('removed');
    expect(rows.find((r) => r.boqCode === 'BOQ-B')?.kind).toBe('added');
    expect(rows.find((r) => r.boqCode === 'BOQ-C')?.deltaValue).toBe(400);
  });

  it('detects comparison impact', () => {
    expect(hasComparisonImpact(comparison)).toBe(true);
    expect(
      hasComparisonImpact({
        ...comparison,
        summary: {
          addedCount: 0,
          removedCount: 0,
          changedCount: 0,
          unchangedCount: 5,
          fromTotalPlannedValue: 100,
          toTotalPlannedValue: 100,
          costImpact: 0,
        },
        added: [],
        removed: [],
        changed: [],
      }),
    ).toBe(false);
  });
});
