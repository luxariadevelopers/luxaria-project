import { Chip } from '@mui/material';
import { dprStatusLabel } from './labels';
import { DprStatus } from './types';

type Props = {
  status: string;
};

export function DprStatusChip({ status }: Props) {
  const color =
    status === DprStatus.Reviewed
      ? 'success'
      : status === DprStatus.Submitted
        ? 'info'
        : status === DprStatus.Reopened
          ? 'warning'
          : status === DprStatus.Draft
            ? 'default'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={status === DprStatus.Reviewed ? 'filled' : 'outlined'}
      label={dprStatusLabel(status)}
      data-testid="dpr-status-chip"
    />
  );
}
