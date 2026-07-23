import { Chip } from '@mui/material';
import { stockReservationStatusLabel } from './labels';
import { StockReservationStatus } from './types';

type Props = {
  status: string;
};

export function StockReservationStatusChip({ status }: Props) {
  const color =
    status === StockReservationStatus.Active
      ? 'success'
      : status === StockReservationStatus.Released
        ? 'info'
        : status === StockReservationStatus.Consumed
          ? 'default'
          : status === StockReservationStatus.Cancelled
            ? 'default'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={status === StockReservationStatus.Active ? 'filled' : 'outlined'}
      label={stockReservationStatusLabel(status)}
      data-testid="stock-reservation-status-chip"
    />
  );
}
