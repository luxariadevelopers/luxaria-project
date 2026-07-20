import { describe, expect, it } from 'vitest';
import type { QuotationComparisonCapabilities } from './roleAccess';
import {
  QuotationComparisonStatus,
  type PublicQuotationComparison,
} from './types';
import {
  canEditRecommendation,
  canSubmitRecommendationForApproval,
  resolveComparisonActions,
} from './workflowActions';

const fullCaps: QuotationComparisonCapabilities = {
  canCompare: true,
  canRecommend: true,
  canActOnApproval: true,
  canView: true,
  canGenerate: true,
  canExportPdf: true,
  canCancel: true,
  canSubmitApproval: true,
};

function comparison(
  partial: Partial<PublicQuotationComparison> &
    Pick<PublicQuotationComparison, 'id' | 'status'>,
): PublicQuotationComparison {
  return {
    comparisonNumber: 'QC-2026-000001',
    purchaseRequestId: 'pr1',
    projectId: 'p1',
    vendors: [],
    lowestLandedCostQuotationId: null,
    recommendedQuotationId: null,
    recommendedVendorId: null,
    recommendationReason: null,
    isLowestVendorSelected: false,
    recommendedBy: null,
    recommendedAt: null,
    approvalRequestId: null,
    submittedBy: null,
    submittedAt: null,
    pdfPath: null,
    pdfGeneratedAt: null,
    generatedBy: 'u1',
    generatedAt: '2026-07-01T00:00:00.000Z',
    notes: null,
    ...partial,
  };
}

describe('resolveComparisonActions — recommendation & approval', () => {
  it('offers generate when no comparison exists', () => {
    expect(resolveComparisonActions(null, fullCaps)).toEqual(['generate']);
  });

  it('allows recommend on draft and recommended', () => {
    expect(
      resolveComparisonActions(
        comparison({ id: '1', status: QuotationComparisonStatus.Draft }),
        fullCaps,
      ),
    ).toContain('recommend');
    expect(
      resolveComparisonActions(
        comparison({
          id: '2',
          status: QuotationComparisonStatus.Recommended,
          recommendedQuotationId: 'q1',
        }),
        fullCaps,
      ),
    ).toContain('recommend');
  });

  it('allows submit_approval only after recommendation is set', () => {
    expect(
      resolveComparisonActions(
        comparison({ id: '1', status: QuotationComparisonStatus.Draft }),
        fullCaps,
      ),
    ).not.toContain('submit_approval');

    expect(
      resolveComparisonActions(
        comparison({
          id: '2',
          status: QuotationComparisonStatus.Recommended,
          recommendedQuotationId: 'q1',
        }),
        fullCaps,
      ),
    ).toContain('submit_approval');
  });

  it('opens approvals inbox when pending approval', () => {
    const actions = resolveComparisonActions(
      comparison({
        id: '3',
        status: QuotationComparisonStatus.PendingApproval,
        recommendedQuotationId: 'q1',
        approvalRequestId: 'ap1',
      }),
      fullCaps,
    );
    expect(actions).toContain('open_approvals');
    expect(actions).not.toContain('submit_approval');
    expect(actions).not.toContain('recommend');
  });

  it('denies recommend/submit without quotation.recommend', () => {
    const caps = {
      ...fullCaps,
      canRecommend: false,
      canSubmitApproval: false,
    };
    const actions = resolveComparisonActions(
      comparison({
        id: '4',
        status: QuotationComparisonStatus.Recommended,
        recommendedQuotationId: 'q1',
      }),
      caps,
    );
    expect(actions).not.toContain('recommend');
    expect(actions).not.toContain('submit_approval');
  });
});

describe('approval readiness helpers', () => {
  it('canEditRecommendation for draft/recommended only', () => {
    expect(
      canEditRecommendation({ status: QuotationComparisonStatus.Draft }),
    ).toBe(true);
    expect(
      canEditRecommendation({
        status: QuotationComparisonStatus.PendingApproval,
      }),
    ).toBe(false);
  });

  it('canSubmitRecommendationForApproval requires recommended + quotation', () => {
    expect(
      canSubmitRecommendationForApproval({
        status: QuotationComparisonStatus.Recommended,
        recommendedQuotationId: 'q1',
      }),
    ).toBe(true);
    expect(
      canSubmitRecommendationForApproval({
        status: QuotationComparisonStatus.Recommended,
        recommendedQuotationId: null,
      }),
    ).toBe(false);
    expect(
      canSubmitRecommendationForApproval({
        status: QuotationComparisonStatus.Draft,
        recommendedQuotationId: 'q1',
      }),
    ).toBe(false);
  });
});
