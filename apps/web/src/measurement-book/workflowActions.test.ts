import { describe, expect, it } from 'vitest';
import type { PublicMeasurementBookEntry } from './api';
import { resolveMeasurementBookCapabilities } from './roleAccess';
import { resolveMeasurementBookActions } from './workflowActions';

function entry(
  partial: Partial<PublicMeasurementBookEntry>,
): PublicMeasurementBookEntry {
  return {
    id: '1',
    entryNumber: 'MB-1',
    revision: 0,
    projectId: 'p1',
    contractorId: 'c1',
    boqItemId: 'b1',
    boqCode: 'A.1',
    workOrderId: null,
    workMeasurementId: null,
    dprId: null,
    drawingId: null,
    siteId: null,
    location: {
      siteId: null,
      phaseId: null,
      blockId: null,
      towerId: null,
      floorId: null,
      locationLabel: null,
    },
    length: 1,
    breadth: 1,
    height: 1,
    numberOfUnits: 1,
    calculatedQuantity: 1,
    formula: null,
    formulaQuantity: null,
    quantity: 1,
    unit: 'cubic_metre',
    periodFrom: '2026-07-01',
    periodTo: '2026-07-15',
    measurementDate: '2026-07-15',
    workDescription: null,
    sheetReference: null,
    notes: null,
    photoDocumentIds: [],
    status: 'draft',
    supersedesId: null,
    supersededById: null,
    revisionReason: null,
    measuredBy: 'u-measure',
    submittedBy: null,
    submittedAt: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    certifiedBy: null,
    certifiedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    ...partial,
  };
}

describe('resolveMeasurementBookActions', () => {
  const createCaps = resolveMeasurementBookCapabilities((code) =>
    ['measurement.view', 'measurement.create'].includes(code),
  );
  const certifyCaps = resolveMeasurementBookCapabilities((code) =>
    ['measurement.view', 'measurement.certify'].includes(code),
  );

  it('offers submit/cancel on draft when create permitted', () => {
    expect(
      resolveMeasurementBookActions(entry({ status: 'draft' }), createCaps),
    ).toEqual(['submit', 'cancel']);
  });

  it('offers acknowledge on submitted when create permitted', () => {
    expect(
      resolveMeasurementBookActions(
        entry({ status: 'submitted' }),
        createCaps,
      ),
    ).toEqual(['acknowledge']);
  });

  it('offers verify/reject on submitted when certify permitted and different user', () => {
    expect(
      resolveMeasurementBookActions(
        entry({ status: 'submitted', measuredBy: 'u-measure' }),
        certifyCaps,
        'u-other',
      ),
    ).toEqual(['verify', 'reject']);
  });

  it('blocks verify when current user measured the entry', () => {
    expect(
      resolveMeasurementBookActions(
        entry({ status: 'submitted', measuredBy: 'u-measure' }),
        certifyCaps,
        'u-measure',
      ),
    ).toEqual([]);
  });

  it('offers certify on verified when certify permitted', () => {
    expect(
      resolveMeasurementBookActions(
        entry({ status: 'verified', measuredBy: 'u-measure' }),
        certifyCaps,
        'u-other',
      ),
    ).toEqual(['certify', 'reject']);
  });

  it('offers revise on certified when create permitted', () => {
    expect(
      resolveMeasurementBookActions(
        entry({ status: 'certified' }),
        createCaps,
      ),
    ).toEqual(['revise']);
  });

  it('does not offer revise without create', () => {
    expect(
      resolveMeasurementBookActions(
        entry({ status: 'certified' }),
        certifyCaps,
      ),
    ).toEqual([]);
  });
});
