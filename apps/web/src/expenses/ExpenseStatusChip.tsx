import { Chip } from '@mui/material';
import { expenseStatusLabel } from './labels';
import { SiteExpenseVoucherStatus } from './types';

type Props = {
  status: string;
};

export function ExpenseStatusChip({ status }: Props) {
  const color =
    status === SiteExpenseVoucherStatus.Posted
      ? 'success'
      : status === SiteExpenseVoucherStatus.Rejected ||
          status === SiteExpenseVoucherStatus.Cancelled
        ? 'default'
        : status === SiteExpenseVoucherStatus.Returned ||
            status === SiteExpenseVoucherStatus.Approved
          ? 'warning'
          : status === SiteExpenseVoucherStatus.Submitted ||
              status === SiteExpenseVoucherStatus.Verified
            ? 'info'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === SiteExpenseVoucherStatus.Posted ? 'filled' : 'outlined'
      }
      label={expenseStatusLabel(status)}
      data-testid="expense-status-chip"
    />
  );
}
