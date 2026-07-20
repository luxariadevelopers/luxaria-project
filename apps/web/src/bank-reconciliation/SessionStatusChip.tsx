import { Chip } from '@mui/material';
import { sessionStatusLabel } from './labels';
import { BankReconciliationSessionStatus } from './types';

type Props = { status: string };

export function SessionStatusChip({ status }: Props) {
  const color =
    status === BankReconciliationSessionStatus.Completed
      ? 'success'
      : status === BankReconciliationSessionStatus.InProgress
        ? 'info'
        : status === BankReconciliationSessionStatus.Cancelled
          ? 'default'
          : 'warning';
  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === BankReconciliationSessionStatus.Draft ? 'outlined' : 'filled'
      }
      label={sessionStatusLabel(status)}
      data-testid="bank-recon-session-status-chip"
    />
  );
}
