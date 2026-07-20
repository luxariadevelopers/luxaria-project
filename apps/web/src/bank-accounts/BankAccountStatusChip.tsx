import { Chip } from '@mui/material';
import { bankAccountStatusLabel } from './labels';
import { BankAccountStatus } from './types';

type Props = {
  status: string;
};

export function BankAccountStatusChip({ status }: Props) {
  const active = status === BankAccountStatus.Active;
  return (
    <Chip
      size="small"
      color={active ? 'success' : 'default'}
      variant={active ? 'filled' : 'outlined'}
      label={bankAccountStatusLabel(status)}
      data-testid="bank-account-status-chip"
    />
  );
}
