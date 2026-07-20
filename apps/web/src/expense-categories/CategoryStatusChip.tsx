import { Chip } from '@mui/material';
import { expenseCategoryStatusLabel } from './labels';
import type { ExpenseCategoryStatus } from './types';

type Props = {
  status: ExpenseCategoryStatus;
};

export function CategoryStatusChip({ status }: Props) {
  return (
    <Chip
      size="small"
      label={expenseCategoryStatusLabel(status)}
      color={status === 'active' ? 'success' : 'default'}
      variant={status === 'active' ? 'filled' : 'outlined'}
    />
  );
}
