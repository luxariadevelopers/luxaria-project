import { Chip } from '@mui/material';
import { accountStatusLabel } from './labels';
import { AccountStatus } from './types';

type Props = {
  status: string;
};

export function AccountStatusChip({ status }: Props) {
  return (
    <Chip
      size="small"
      label={accountStatusLabel(status)}
      color={status === AccountStatus.Active ? 'success' : 'default'}
      variant={status === AccountStatus.Active ? 'filled' : 'outlined'}
    />
  );
}
