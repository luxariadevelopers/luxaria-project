import { Chip, Tooltip } from '@mui/material';
import { formatInr } from '@/format';
import { hasPreviousUnsettledCash } from './validation';

type Props = {
  previousUnsettledAmount: number;
  warnings?: readonly string[];
};

/**
 * Highlights prior funded-not-closed float from Nest
 * (`previousUnsettledAmount` + optional `warnings`).
 */
export function UnsettledAmountIndicator({
  previousUnsettledAmount,
  warnings = [],
}: Props) {
  if (!hasPreviousUnsettledCash({ previousUnsettledAmount })) {
    return (
      <Chip
        size="small"
        variant="outlined"
        label="Settled"
        color="default"
        data-testid="unsettled-amount-indicator"
        data-unsettled="0"
      />
    );
  }

  const hint =
    warnings.find((w) => /unsettled/i.test(w)) ??
    `Previous unsettled amount: ${formatInr(previousUnsettledAmount)} (funded weeks not yet closed)`;

  return (
    <Tooltip title={hint}>
      <Chip
        size="small"
        color="warning"
        variant="filled"
        label={`Unsettled ${formatInr(previousUnsettledAmount)}`}
        data-testid="unsettled-amount-indicator"
        data-unsettled={String(previousUnsettledAmount)}
      />
    </Tooltip>
  );
}
