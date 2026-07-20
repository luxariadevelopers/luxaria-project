import { QuotationComparisonStatus } from './types';

export function comparisonStatusLabel(status: string): string {
  switch (status) {
    case QuotationComparisonStatus.Draft:
      return 'Draft';
    case QuotationComparisonStatus.Recommended:
      return 'Recommended';
    case QuotationComparisonStatus.PendingApproval:
      return 'Pending approval';
    case QuotationComparisonStatus.Approved:
      return 'Approved';
    case QuotationComparisonStatus.Rejected:
      return 'Rejected';
    case QuotationComparisonStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}
