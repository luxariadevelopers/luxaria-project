import { Chip } from '@mui/material';
import { receiptStatusLabel } from './labels';
import { ContributionReceiptStatus } from './types';

type Props = {
  status: string;
};

export function ContributionReceiptStatusChip({ status }: Props) {
  const color =
    status === ContributionReceiptStatus.Posted
      ? 'success'
      : status === ContributionReceiptStatus.Verified
        ? 'info'
        : status === ContributionReceiptStatus.Submitted
          ? 'warning'
          : status === ContributionReceiptStatus.Cancelled
            ? 'default'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === ContributionReceiptStatus.Posted ? 'filled' : 'outlined'
      }
      label={receiptStatusLabel(status)}
      data-testid="contribution-receipt-status-chip"
      data-status={status}
    />
  );
}
