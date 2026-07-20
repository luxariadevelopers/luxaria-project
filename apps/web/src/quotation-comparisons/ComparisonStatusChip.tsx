import { Chip } from '@mui/material';
import { comparisonStatusLabel } from './labels';
import { QuotationComparisonStatus } from './types';

type Props = {
  status: string;
};

export function ComparisonStatusChip({ status }: Props) {
  const color =
    status === QuotationComparisonStatus.Approved
      ? 'success'
      : status === QuotationComparisonStatus.PendingApproval ||
          status === QuotationComparisonStatus.Recommended
        ? 'info'
        : status === QuotationComparisonStatus.Rejected ||
            status === QuotationComparisonStatus.Cancelled
          ? 'default'
          : 'warning';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === QuotationComparisonStatus.Approved ? 'filled' : 'outlined'
      }
      label={comparisonStatusLabel(status)}
      data-testid="quotation-comparison-status-chip"
      data-status={status}
    />
  );
}
