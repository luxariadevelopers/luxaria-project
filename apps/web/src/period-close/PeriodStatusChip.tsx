import { Chip } from '@mui/material';
import { periodStatusLabel } from './labels';
import { AccountingPeriodStatus } from './types';

type Props = {
  status: string;
};

export function PeriodStatusChip({ status }: Props) {
  const color =
    status === AccountingPeriodStatus.Open
      ? 'success'
      : status === AccountingPeriodStatus.Locked
        ? 'warning'
        : status === AccountingPeriodStatus.Closed
          ? 'default'
          : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={status === AccountingPeriodStatus.Open ? 'filled' : 'outlined'}
      label={periodStatusLabel(status)}
      data-testid="period-status-chip"
    />
  );
}
