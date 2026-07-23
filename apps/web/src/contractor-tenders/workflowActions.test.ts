import { describe, expect, it } from 'vitest';
import type { PublicContractorTender } from './api';
import { resolveTenderCapabilities } from './roleAccess';
import {
  canCompareTender,
  canRecordTenderBid,
  resolveTenderListActions,
} from './workflowActions';

function tender(
  partial: Partial<PublicContractorTender>,
): PublicContractorTender {
  return {
    id: '1',
    tenderNumber: 'T-1',
    projectId: 'p1',
    siteId: null,
    title: 'Package A',
    description: null,
    boqPackageIds: [],
    status: 'draft',
    invitedContractorIds: [],
    technicalBids: [],
    commercialBids: [],
    negotiationNotes: [],
    recommendation: null,
    awardedContractorId: null,
    awardedRateContractId: null,
    awardedAgreementId: null,
    invitationDate: null,
    bidDeadline: null,
    evaluationStartedAt: null,
    awardedAt: null,
    awardedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'u1',
    ...partial,
  };
}

describe('resolveTenderListActions', () => {
  const manageCaps = resolveTenderCapabilities((code) =>
    ['tender.view', 'tender.manage'].includes(code),
  );
  const viewCaps = resolveTenderCapabilities((code) => code === 'tender.view');

  it('offers invite/cancel on draft when manage permitted', () => {
    expect(
      resolveTenderListActions(tender({ status: 'draft' }), manageCaps),
    ).toEqual(['invite', 'cancel']);
  });

  it('offers invite/record_bid/cancel on invited when manage permitted', () => {
    expect(
      resolveTenderListActions(tender({ status: 'invited' }), manageCaps),
    ).toEqual(['invite', 'record_bid', 'cancel']);
  });

  it('offers record_bid/compare/cancel on bidding when manage permitted', () => {
    expect(
      resolveTenderListActions(tender({ status: 'bidding' }), manageCaps),
    ).toEqual(['record_bid', 'compare', 'cancel']);
  });

  it('offers compare on bidding when view permitted', () => {
    expect(
      resolveTenderListActions(tender({ status: 'bidding' }), viewCaps),
    ).toEqual(['compare']);
  });

  it('does not offer invite without manage', () => {
    expect(
      resolveTenderListActions(tender({ status: 'draft' }), viewCaps),
    ).toEqual([]);
  });
});

describe('canCompareTender', () => {
  it('allows bidding / under_evaluation / awarded', () => {
    expect(canCompareTender('bidding')).toBe(true);
    expect(canCompareTender('under_evaluation')).toBe(true);
    expect(canCompareTender('awarded')).toBe(true);
    expect(canCompareTender('draft')).toBe(false);
  });
});

describe('canRecordTenderBid', () => {
  it('allows invited / bidding only', () => {
    expect(canRecordTenderBid('invited')).toBe(true);
    expect(canRecordTenderBid('bidding')).toBe(true);
    expect(canRecordTenderBid('draft')).toBe(false);
    expect(canRecordTenderBid('under_evaluation')).toBe(false);
  });
});
