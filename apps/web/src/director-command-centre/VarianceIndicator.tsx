import { Chip, Typography } from '@mui/material';
import {
  formatOptionalMoney,
  formatOptionalPercent,
  hasMetric,
} from './formatMetric';
import type { CostVariance, ProgressGap } from './variance';

type CostProps = {
  kind: 'cost';
  variance: CostVariance;
};

type ProgressProps = {
  kind: 'progress';
  gap: ProgressGap;
};

type Props = CostProps | ProgressProps;

/**
 * Cost: positive amount = over budget (danger).
 * Progress: physical − financial (info when physical ahead).
 */
export function VarianceIndicator(props: Props) {
  if (props.kind === 'cost') {
    const { variance } = props;
    if (!hasMetric(variance.amount)) {
      return (
        <Typography variant="body2" color="text.disabled">
          —
        </Typography>
      );
    }
    const over = variance.amount > 0;
    const under = variance.amount < 0;
    const color = over ? 'error' : under ? 'success' : 'default';
    const label = [
      formatOptionalMoney(variance.amount),
      hasMetric(variance.percent)
        ? formatOptionalPercent(variance.percent)
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <Chip
        size="small"
        color={color}
        variant={variance.amount === 0 ? 'outlined' : 'filled'}
        label={label}
        data-testid="cost-variance"
      />
    );
  }

  const { gap } = props;
  const ahead = gap.points > 0.5;
  const behind = gap.points < -0.5;
  const color = behind ? 'warning' : ahead ? 'info' : 'default';
  const sign = gap.points > 0 ? '+' : '';

  return (
    <Chip
      size="small"
      color={color}
      variant="outlined"
      label={`${sign}${formatOptionalPercent(gap.points)} phys−fin`}
      data-testid="progress-gap"
    />
  );
}
