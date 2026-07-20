import type { QuotationComparisonCapabilities } from './roleAccess';
import {
  QuotationComparisonStatus,
  type PublicQuotationComparison,
} from './types';

export type ComparisonActionId =
  | 'generate'
  | 'recommend'
  | 'submit_approval'
  | 'export_pdf'
  | 'cancel'
  | 'open_approvals';

/**
 * Status + permission gate for comparison page actions.
 * Nest still enforces transitions; final approve is Approvals (`approval.act`).
 */
export function resolveComparisonActions(
  row: PublicQuotationComparison | null,
  caps: QuotationComparisonCapabilities,
): ComparisonActionId[] {
  const actions: ComparisonActionId[] = [];

  if (!row) {
    if (caps.canGenerate) actions.push('generate');
    return actions;
  }

  if (caps.canExportPdf) {
    actions.push('export_pdf');
  }

  const status = row.status;

  if (
    caps.canRecommend &&
    (status === QuotationComparisonStatus.Draft ||
      status === QuotationComparisonStatus.Recommended)
  ) {
    actions.push('recommend');
  }

  if (
    caps.canSubmitApproval &&
    status === QuotationComparisonStatus.Recommended &&
    Boolean(row.recommendedQuotationId)
  ) {
    actions.push('submit_approval');
  }

  if (
    status === QuotationComparisonStatus.PendingApproval &&
    (caps.canActOnApproval || caps.canCompare)
  ) {
    actions.push('open_approvals');
  }

  if (
    caps.canCancel &&
    status !== QuotationComparisonStatus.Approved &&
    status !== QuotationComparisonStatus.Cancelled
  ) {
    actions.push('cancel');
  }

  if (
    caps.canGenerate &&
    (status === QuotationComparisonStatus.Cancelled ||
      status === QuotationComparisonStatus.Rejected)
  ) {
    actions.push('generate');
  }

  return actions;
}

export function canEditRecommendation(
  row: Pick<PublicQuotationComparison, 'status'>,
): boolean {
  return (
    row.status === QuotationComparisonStatus.Draft ||
    row.status === QuotationComparisonStatus.Recommended
  );
}

/** Recommendation is ready to submit when status is recommended + quotation set. */
export function canSubmitRecommendationForApproval(
  row: Pick<
    PublicQuotationComparison,
    'status' | 'recommendedQuotationId'
  >,
): boolean {
  return (
    row.status === QuotationComparisonStatus.Recommended &&
    Boolean(row.recommendedQuotationId)
  );
}
