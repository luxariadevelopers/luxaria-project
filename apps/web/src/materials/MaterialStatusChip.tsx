import { Chip } from '@mui/material';
import { materialStatusLabel } from './labels';
import { MaterialStatus, type MaterialStatus as Status } from './types';

type Props = {
  status: Status | string;
};

export function MaterialStatusChip({ status }: Props) {
  const colour =
    status === MaterialStatus.Active
      ? 'success'
      : status === MaterialStatus.Inactive
        ? 'default'
        : 'default';

  return (
    <Chip
      size="small"
      label={materialStatusLabel(status)}
      color={colour}
      variant={status === MaterialStatus.Active ? 'filled' : 'outlined'}
    />
  );
}
