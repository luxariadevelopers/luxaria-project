import { describe, expect, it } from 'vitest';
import type { QualityInspectionCapabilities } from './roleAccess';
import {
  QualityInspectionResult,
  QualityInspectionStatus,
  type PublicQualityInspection,
} from './types';
import { resolveQualityInspectionRowActions } from './workflowActions';

const caps: QualityInspectionCapabilities = {
  canView: true,
  canInspect: true,
};

function row(
  overrides: Partial<PublicQualityInspection> = {},
): PublicQualityInspection {
  return {
    id: '1',
    inspectionNumber: 'QI-2026-000001',
    grnId: 'g1',
    projectId: 'p1',
    vendorId: 'v1',
    inspector: 'u1',
    inspectionDate: '2026-07-20',
    testParameters: [],
    items: [],
    samplePhotos: [],
    testDocuments: [],
    result: null,
    remarks: null,
    status: QualityInspectionStatus.Draft,
    completedBy: null,
    completedAt: null,
    ...overrides,
  };
}

describe('resolveQualityInspectionRowActions', () => {
  it('allows complete/cancel/edit on draft and in_progress', () => {
    expect(resolveQualityInspectionRowActions(row(), caps)).toEqual(
      expect.arrayContaining(['edit', 'complete', 'cancel']),
    );
    expect(
      resolveQualityInspectionRowActions(
        row({ status: QualityInspectionStatus.InProgress }),
        caps,
      ),
    ).toEqual(expect.arrayContaining(['edit', 'complete', 'cancel']));
  });

  it('blocks actions when completed or cancelled', () => {
    expect(
      resolveQualityInspectionRowActions(
        row({
          status: QualityInspectionStatus.Completed,
          result: QualityInspectionResult.Accepted,
        }),
        caps,
      ),
    ).toEqual([]);
    expect(
      resolveQualityInspectionRowActions(
        row({ status: QualityInspectionStatus.Cancelled }),
        caps,
      ),
    ).toEqual([]);
  });

  it('hides inspect actions without quality.inspect', () => {
    expect(
      resolveQualityInspectionRowActions(row(), {
        canView: true,
        canInspect: false,
      }),
    ).toEqual([]);
  });
});
