import { Chip } from '@mui/material';
import { commitmentStatusLabel } from './labels';
import { CommitmentStatus } from './types';
import { isCommitmentOverdue } from './overdue';
import type { PublicCommitment } from './types';

type Props = {
  status: string;
  /** When provided, show overdue chip instead of plain Approved. */
  row?: Pick<PublicCommitment, 'status' | 'dueDate' | 'pendingAmount'>;
};

export function CommitmentStatusChip({ status, row }: Props) {
  if (row && isCommitmentOverdue(row)) {
    return (
      <Chip
        size="small"
        color="error"
        label="Overdue"
        data-testid="commitment-overdue-chip"
      />
    );
  }

  const color =
    status === CommitmentStatus.Approved
      ? 'success'
      : status === CommitmentStatus.Submitted
        ? 'info'
        : status === CommitmentStatus.Cancelled ||
            status === CommitmentStatus.Superseded
          ? 'default'
          : 'warning';

  return (
    <Chip
      size="small"
      color={color}
      variant={status === CommitmentStatus.Approved ? 'filled' : 'outlined'}
      label={commitmentStatusLabel(status)}
      data-testid="commitment-status-chip"
    />
  );
}
