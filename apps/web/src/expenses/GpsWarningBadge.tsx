import { Chip, Tooltip } from '@mui/material';
import { gpsWarningText, hasGpsWarning } from './warnings';

type Props = {
  warnings: readonly string[];
};

/** Soft Nest warning when capture GPS is outside project site radius. */
export function GpsWarningBadge({ warnings }: Props) {
  if (!hasGpsWarning(warnings)) return null;
  const title = gpsWarningText(warnings) ?? 'GPS outside project radius';

  return (
    <Tooltip title={title}>
      <Chip
        size="small"
        color="warning"
        variant="filled"
        label="GPS"
        data-testid="expense-gps-warning"
      />
    </Tooltip>
  );
}
