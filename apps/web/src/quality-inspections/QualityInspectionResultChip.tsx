import { Chip } from '@mui/material';
import { qualityInspectionResultLabel } from './labels';
import { QualityInspectionResult } from './types';

type Props = {
  result: string | null;
};

export function QualityInspectionResultChip({ result }: Props) {
  if (!result) {
    return (
      <Chip
        size="small"
        variant="outlined"
        label="No result"
        data-testid="quality-inspection-result-chip"
      />
    );
  }

  const color =
    result === QualityInspectionResult.Accepted
      ? 'success'
      : result === QualityInspectionResult.PartiallyAccepted
        ? 'warning'
        : result === QualityInspectionResult.Rejected
          ? 'error'
          : 'info';

  return (
    <Chip
      size="small"
      color={color}
      label={qualityInspectionResultLabel(result)}
      data-testid="quality-inspection-result-chip"
    />
  );
}
