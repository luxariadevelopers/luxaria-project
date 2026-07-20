import { Chip } from '@mui/material';
import { materialIssueStatusLabel } from './labels';
import { MaterialIssueStatus } from './types';

type Props = {
  status: string;
};

export function MaterialIssueStatusChip({ status }: Props) {
  const color =
    status === MaterialIssueStatus.Confirmed
      ? 'success'
      : status === MaterialIssueStatus.Submitted
        ? 'info'
        : status === MaterialIssueStatus.Cancelled
          ? 'default'
          : 'warning';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === MaterialIssueStatus.Confirmed ? 'filled' : 'outlined'
      }
      label={materialIssueStatusLabel(status)}
      data-testid="material-issue-status-chip"
    />
  );
}
