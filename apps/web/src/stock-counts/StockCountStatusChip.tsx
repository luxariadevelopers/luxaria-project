import { Chip } from '@mui/material';
import { stockCountStatusLabel } from './labels';
import { StockCountStatus } from './types';

type Props = {
  status: string;
};

export function StockCountStatusChip({ status }: Props) {
  const color =
    status === StockCountStatus.AdjustmentPosted
      ? 'success'
      : status === StockCountStatus.Approved ||
          status === StockCountStatus.Reviewed
        ? 'info'
        : status === StockCountStatus.Cancelled
          ? 'default'
          : status === StockCountStatus.Submitted
            ? 'warning'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === StockCountStatus.AdjustmentPosted ? 'filled' : 'outlined'
      }
      label={stockCountStatusLabel(status)}
      data-testid="stock-count-status-chip"
    />
  );
}
