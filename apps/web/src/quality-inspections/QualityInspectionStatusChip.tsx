import { Chip } from '@mui/material';
import { qualityInspectionStatusLabel } from './labels';
import { QualityInspectionStatus } from './types';

type Props = {
  status: string;
};

export function QualityInspectionStatusChip({ status }: Props) {
  const color =
    status === QualityInspectionStatus.Completed
      ? 'success'
      : status === QualityInspectionStatus.InProgress
        ? 'info'
        : status === QualityInspectionStatus.Cancelled
          ? 'default'
          : 'warning';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === QualityInspectionStatus.Completed ? 'filled' : 'outlined'
      }
      label={qualityInspectionStatusLabel(status)}
      data-testid="quality-inspection-status-chip"
    />
  );
}
