import { Chip } from '@mui/material';
import { cashAccountStatusLabel } from './labels';
import { CashAccountStatus } from './types';

type Props = {
  status: string;
};

export function CashAccountStatusChip({ status }: Props) {
  const color =
    status === CashAccountStatus.Active
      ? 'success'
      : status === CashAccountStatus.PendingHandover
        ? 'warning'
        : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={status === CashAccountStatus.Active ? 'filled' : 'outlined'}
      label={cashAccountStatusLabel(status)}
      data-testid="cash-account-status-chip"
    />
  );
}
